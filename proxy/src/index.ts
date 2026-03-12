import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { nanoid } from "nanoid";
import { streamCompletion, type StreamOptions } from "./ai-client.js";
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
import { startAcp, getAcpStatus } from "./acp-handler.js";
import { generateEmbedding } from "./embeddings.js";
import * as moltbook from "./moltbook.js";

const PORT = Number(process.env.PORT) || Number(process.env.PROXY_PORT) || 3002;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",");
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const XAI_API_KEY = process.env.XAI_API_KEY || "";

const server = http.createServer(async (req, res) => {
  if (req.url === "/acp/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "clawdbot-proxy", acp: getAcpStatus() }));
  } else if (req.url === "/debug/config" && req.method === "GET") {
    // Diagnostic endpoint — shows which API keys are configured
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      BRAVE_API_KEY: BRAVE_API_KEY ? "set" : "MISSING",
      BASESCAN_API_KEY: BASESCAN_API_KEY ? "set" : "MISSING",
      XAI_API_KEY: XAI_API_KEY ? "set" : "MISSING",
      MANAGED_VENICE_KEY: process.env.MANAGED_VENICE_KEY ? "set" : "MISSING",
      MANAGED_ANTHROPIC_KEY: process.env.MANAGED_ANTHROPIC_KEY ? "set" : "MISSING",
    }));
  } else if (req.url?.startsWith("/debug/x-search") && req.method === "GET") {
    // Test xAI X search end-to-end + show raw API response
    const { needsXSearch, searchX } = await import("./x-search.js");
    const testQuery = "who is talking about VVV on crypto twitter";
    const patternMatch = needsXSearch(testQuery);
    let xResult = "";
    let xError = "";
    let rawResponse: any = null;

    if (XAI_API_KEY && patternMatch) {
      try {
        // Also make a raw call to see response structure
        const rawRes = await fetch("https://api.x.ai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast-non-reasoning",
            input: "What are people saying about VVV token on X?",
            tools: [{ type: "x_search" }],
            max_tokens: 500,
            temperature: 0,
          }),
        });
        if (rawRes.ok) {
          rawResponse = await rawRes.json();
        } else {
          rawResponse = { error: rawRes.status, body: await rawRes.text() };
        }

        // Also test our parser
        xResult = await searchX(testQuery, XAI_API_KEY);
      } catch (err: any) {
        xError = err?.message || String(err);
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      testQuery,
      patternMatch,
      keyPresent: !!XAI_API_KEY,
      resultLength: xResult.length,
      resultPreview: xResult.slice(0, 1000),
      rawResponseStructure: rawResponse ? {
        keys: Object.keys(rawResponse),
        outputTypes: rawResponse.output?.map((item: any) => ({
          type: item.type,
          role: item.role,
          contentTypes: item.content?.map((b: any) => b.type),
        })),
        hasOutputText: !!rawResponse.output_text,
        raw: JSON.stringify(rawResponse).slice(0, 2000),
      } : null,
      error: xError || null,
    }, null, 2));
  } else if (req.url === "/embeddings" && req.method === "POST") {
    // Venice embeddings endpoint (RAG foundation)
    try {
      const veniceKey = process.env.MANAGED_VENICE_KEY;
      if (!veniceKey) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Embeddings service not configured" }));
        return;
      }

      let body = "";
      for await (const chunk of req) body += chunk;
      const { text } = JSON.parse(body);

      if (!text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'text' field" }));
        return;
      }

      const result = await generateEmbedding(text, veniceKey);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[Embeddings] Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Embeddings generation failed" }));
    }
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "clawdbot-proxy" }));
  }
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
              model: "claude-opus-4-20250514",
              provider: "anthropic",
              apiKey: anthropicKey,
              keyMode: "managed" as const,
              fid: data.fid,
              plan: subscription.plan,
              uncensored: data.uncensored === true,
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

          // Add user message (with optional images)
          const images = data.images as Array<{ data: string; mimeType: string }> | undefined;
          const userMsg: Message = {
            id: nanoid(),
            role: "user",
            content: message,
            timestamp: Date.now(),
            ...(images && images.length > 0 ? { images } : {}),
          };
          addMessage(sessionId, userMsg);

          const runId = nanoid();
          const hasImages = session.messages.some(m => m.images && m.images.length > 0);

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

            const resolved = resolveModel(message, plan, currentCost, extraBudget, session.uncensored === true, hasImages);
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
            BRAVE_API_KEY || undefined,
            {
              basescanApiKey: BASESCAN_API_KEY || undefined,
              xaiApiKey: XAI_API_KEY || undefined,
              hasImages,
            }
          );
          break;
        }

        case "history": {
          const messages = getSessionHistory(sessionId);
          send(ws, { type: "history", messages });
          break;
        }

        case "moltbook": {
          const mbKey = data.moltbookApiKey as string | undefined;
          const sub = data.subaction as string;

          try {
            let result: moltbook.MoltbookResponse;

            switch (sub) {
              case "register": {
                const regName = data.name as string || "BaseClaw Agent";
                const regDesc = data.description as string || "Crypto & web3 AI research agent built on Base";
                console.log(`[Moltbook WS] Register request: name="${regName}"`);
                result = await moltbook.registerAgent(regName, regDesc);
                console.log(`[Moltbook WS] Register response:`, JSON.stringify(result).slice(0, 500));
                break;
              }

              case "home":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.getHome(mbKey);
                break;

              case "post":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.createPost(
                  mbKey,
                  data.submolt as string || "general",
                  data.title as string || "BaseClaw Research",
                  data.content as string || "",
                  "text"
                );
                break;

              case "comment":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.createComment(
                  mbKey,
                  data.postId as string,
                  data.content as string,
                  data.parentId as string | undefined
                );
                break;

              case "upvote":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.upvotePost(mbKey, data.postId as string);
                break;

              case "downvote":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.downvotePost(mbKey, data.postId as string);
                break;

              case "follow":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.followAgent(mbKey, data.targetName as string);
                break;

              case "unfollow":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.unfollowAgent(mbKey, data.targetName as string);
                break;

              case "search":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.searchPosts(mbKey, data.query as string);
                break;

              case "feed":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.getFeed(
                  mbKey,
                  (data.sort as "hot" | "new" | "top" | "rising") || "hot"
                );
                break;

              case "dm":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.sendDM(
                  mbKey,
                  data.targetName as string,
                  data.subject as string || "",
                  data.body as string || ""
                );
                break;

              case "profile":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = data.targetName
                  ? await moltbook.getAgentProfile(mbKey, data.targetName as string)
                  : await moltbook.getMe(mbKey);
                break;

              case "notifications":
                if (!mbKey) { send(ws, { type: "error", message: "Moltbook API key required" }); return; }
                result = await moltbook.getNotifications(mbKey);
                break;

              default:
                send(ws, { type: "error", message: `Unknown moltbook subaction: ${sub}` });
                return;
            }

            send(ws, { type: "moltbook", subaction: sub, ...result });
          } catch (err) {
            console.error("[Moltbook] Error:", err);
            send(ws, { type: "error", message: `Moltbook error: ${err instanceof Error ? err.message : String(err)}` });
          }
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
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    console.error("WebSocket send error:", err);
  }
}

server.listen(PORT, () => {
  console.log(`Clawdbot proxy running on port ${PORT}`);
  console.log(`[Config] BRAVE_API_KEY: ${BRAVE_API_KEY ? "set" : "MISSING"}`);
  console.log(`[Config] BASESCAN_API_KEY: ${BASESCAN_API_KEY ? "set" : "MISSING"}`);
  console.log(`[Config] XAI_API_KEY: ${XAI_API_KEY ? "set" : "MISSING"}`);

  // Start ACP agent (non-blocking — runs in background)
  startAcp().catch((err) => {
    console.error("[ACP] Startup error (non-fatal):", err);
  });
});
