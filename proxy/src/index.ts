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

const PORT = Number(process.env.PROXY_PORT) || 3002;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",");

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
            });
          } else {
            createSession(sessionId, {
              model: data.model,
              provider: data.provider,
              apiKey: data.apiKey,
            });
          }

          sessionReady = true;
          send(ws, { type: "connected", sessionId });
          console.log(`Session configured: ${sessionId} (${data.provider}/${data.model})`);
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

          // Add user message
          const userMsg: Message = {
            id: nanoid(),
            role: "user",
            content: message,
            timestamp: Date.now(),
          };
          addMessage(sessionId, userMsg);

          const runId = nanoid();

          // Stream AI response
          await streamCompletion(
            session.provider,
            session.model,
            session.apiKey,
            session.messages,
            {
              onDelta: (text) => {
                send(ws, { type: "delta", runId, text });
              },
              onFinal: (fullText) => {
                const assistantMsg: Message = {
                  id: runId,
                  role: "assistant",
                  content: fullText,
                  timestamp: Date.now(),
                };
                addMessage(sessionId, assistantMsg);
                send(ws, { type: "final", runId, message: fullText });
              },
              onError: (error) => {
                send(ws, { type: "error", message: error });
              },
            }
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
