import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { nanoid } from "nanoid";
import { streamCompletion } from "./ai-client.js";
import {
  createSession,
  getSession,
  updateSessionConfig,
  addMessage,
  deleteSession,
  getSessionHistory,
  type Message,
} from "./session-manager.js";
import { checkSubscription, trackUsage, getManagedKey } from "./subscription-check.js";
import {
  resolveModel,
  isMetered,
  getProviderKey,
  type SubscriptionPlan,
} from "./ai-router.js";

const PORT = Number(process.env.PORT) || Number(process.env.PROXY_PORT) || 3002;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",");
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "clawdbot-proxy" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin) && origin !== "") {
    console.log(`Rejected connection from origin: ${origin}`);
    ws.close(4003, "Origin not allowed");
    return;
  }

  const sessionId = nanoid();
  let sessionReady = false;

  console.log(`Client connected: ${sessionId}`);

  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.action) {
        case "config": {
          const keyMode = data.keyMode || "byok";

          if (keyMode === "managed") {
            // Managed mode — validate subscription, agent config resolves models per-message
            if (!data.fid) {
              send(ws, { type: "error", message: "Missing fid for managed mode" });
              return;
            }

            const subscription = await checkSubscription(data.fid);
            if (!subscription.valid) {
              send(ws, { type: "error", message: subscription.error || "Subscription not active" });
              return;
            }

            // Verify at least one provider key is configured
            const anthropicKey = getManagedKey("anthropic");
            if (!anthropicKey) {
              send(ws, { type: "error", message: "Managed AI service not configured" });
              return;
            }

            // Store session — model/provider get resolved per-message by the router
            const sessionConfig = {
              model: "claude-opus-4-5-20250514",
              provider: "anthropic",
              apiKey: anthropicKey,
              keyMode: "managed" as const,
              fid: data.fid,
              plan: subscription.plan,
            };

            const existing = getSession(sessionId);
            if (existing) {
              updateSessionConfig(sessionId, sessionConfig);
            } else {
              createSession(sessionId, sessionConfig);
            }

            sessionReady = true;
            send(ws, {
              type: "connected",
              sessionId,
              plan: subscription.plan,
              budgetRemaining: subscription.budgetRemaining,
              costUsd: subscription.costUsd,
            });
            console.log(`Session configured (managed): ${sessionId} fid=${data.fid} plan=${subscription.plan} budget=$${subscription.budgetRemaining?.toFixed(2)}`);
          } else {
            // BYOK mode — existing flow
            if (!data.apiKey || !data.model || !data.provider) {
              send(ws, { type: "error", message: "Missing config fields (apiKey, model, provider)" });
              return;
            }

            const existing = getSession(sessionId);
            if (existing) {
              updateSessionConfig(sessionId, {
                model: data.model,
                provider: data.provider,
                apiKey: data.apiKey,
                keyMode: "byok",
              });
            } else {
              createSession(sessionId, {
                model: data.model,
                provider: data.provider,
                apiKey: data.apiKey,
                keyMode: "byok",
              });
            }

            sessionReady = true;
            send(ws, { type: "connected", sessionId });
            console.log(`Session configured (byok): ${sessionId} (${data.provider}/${data.model})`);
          }
          break;
        }

        case "send": {
          if (!sessionReady) {
            send(ws, { type: "error", message: "Session not configured. Send config first." });
            return;
          }

          const session = getSession(sessionId);
          if (!session) {
            send(ws, { type: "error", message: "Session not found" });
            return;
          }

          const message = data.message?.trim();
          if (!message) {
            send(ws, { type: "error", message: "Empty message" });
            return;
          }

          // If managed mode, re-check subscription before each request
          if (session.keyMode === "managed" && session.fid) {
            const sub = await checkSubscription(session.fid);
            if (!sub.valid) {
              send(ws, { type: "error", message: sub.error || "Subscription limit reached" });
              return;
            }
          }

          // Add user message
          const userMsg: Message = {
            id: nanoid(),
            role: "user",
            content: message,
            timestamp: Date.now(),
          };
          addMessage(sessionId, userMsg);

          const runId = nanoid();

          // Determine actual model/provider/key to use
          let actualModel = session.model;
          let actualProvider = session.provider;
          let actualKey = session.apiKey;
          let modelRole: string | undefined;

          if (session.keyMode === "managed") {
            // Classify task and resolve model based on budget
            const plan = (session.plan || "starter") as SubscriptionPlan;
            const sub = await checkSubscription(session.fid!);
            const currentCost = sub.costUsd || 0;
            const extraBudget = sub.extraBudget || 0;

            const resolved = resolveModel(message, plan, currentCost, extraBudget);
            const resolvedKey = getProviderKey(resolved.provider);

            if (resolvedKey) {
              actualModel = resolved.model;
              actualProvider = resolved.provider;
              actualKey = resolvedKey;
              modelRole = resolved.role;

              if (resolved.budgetExceeded) {
                console.log(`[Router] fid=${session.fid} tier=${resolved.tier} budget exceeded ($${currentCost.toFixed(2)}) → ${resolved.provider}/${resolved.model}`);
              } else {
                console.log(`[Router] fid=${session.fid} tier=${resolved.tier} → ${resolved.provider}/${resolved.model} ($${currentCost.toFixed(2)} spent)`);
              }
            } else {
              console.error(`[Router] No key for ${resolved.provider}, using session default`);
            }
          }

          // Stream AI response
          await streamCompletion(
            actualProvider,
            actualModel,
            actualKey,
            session.messages,
            {
              onDelta: (text) => {
                send(ws, { type: "delta", runId, text, ...(modelRole ? { modelRole } : {}) });
              },
              onFinal: (fullText) => {
                const assistantMsg: Message = {
                  id: runId,
                  role: "assistant",
                  content: fullText,
                  timestamp: Date.now(),
                };
                addMessage(sessionId, assistantMsg);
                send(ws, {
                  type: "final",
                  runId,
                  message: fullText,
                  model: actualModel,
                  ...(modelRole ? { modelRole } : {}),
                });

                // Track usage for managed sessions
                if (session.keyMode === "managed" && session.fid) {
                  const inputTokens = Math.ceil(message.length / 4);
                  const outputTokens = Math.ceil(fullText.length / 4);
                  trackUsage(session.fid, inputTokens, outputTokens, actualModel).catch((err) => {
                    console.error("Usage tracking error:", err);
                  });
                  const metered = isMetered(actualModel);
                  console.log(`[Router] Usage tracked: fid=${session.fid} model=${actualModel} metered=${metered} in=${inputTokens} out=${outputTokens}`);
                }
              },
              onError: (error) => {
                send(ws, { type: "error", message: error });
              },
            },
            BRAVE_API_KEY || undefined
          );
          break;
        }

        case "history": {
          const messages = getSessionHistory(sessionId);
          send(ws, { type: "history", messages });
          break;
        }

        default:
          send(ws, { type: "error", message: `Unknown action: ${data.action}` });
      }
    } catch (err) {
      console.error("Message handling error:", err);
      send(ws, { type: "error", message: "Internal server error" });
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${sessionId}`);
    deleteSession(sessionId);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for ${sessionId}:`, err);
  });
});

function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

server.listen(PORT, () => {
  console.log(`Clawdbot proxy running on port ${PORT}`);
});
