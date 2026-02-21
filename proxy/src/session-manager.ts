export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type KeyMode = "byok" | "managed";

export interface Session {
  id: string;
  messages: Message[];
  model: string;
  provider: string;
  apiKey: string;
  keyMode: KeyMode;
  fid: number | null;
  plan: string; // "free" | "starter" | "pro" | "business"
  createdAt: number;
  lastActivity: number;
}

const MAX_MESSAGES = 50;
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

const sessions = new Map<string, Session>();

// Periodic cleanup of idle sessions
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_IDLE_MS) {
      sessions.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[SessionManager] Cleaned ${cleaned} idle sessions. Active: ${sessions.size}`);
  }
}, CLEANUP_INTERVAL_MS);

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function createSession(
  sessionId: string,
  config: { model: string; provider: string; apiKey: string; keyMode?: KeyMode; fid?: number; plan?: string }
): Session {
  const now = Date.now();
  const session: Session = {
    id: sessionId,
    messages: [],
    model: config.model,
    provider: config.provider,
    apiKey: config.apiKey,
    keyMode: config.keyMode || "byok",
    fid: config.fid || null,
    plan: config.plan || "free",
    createdAt: now,
    lastActivity: now,
  };
  sessions.set(sessionId, session);
  return session;
}

export function updateSessionConfig(
  sessionId: string,
  config: { model: string; provider: string; apiKey: string; keyMode?: KeyMode; fid?: number; plan?: string }
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.model = config.model;
    session.provider = config.provider;
    session.apiKey = config.apiKey;
    if (config.keyMode) session.keyMode = config.keyMode;
    if (config.fid) session.fid = config.fid;
    if (config.plan) session.plan = config.plan;
    session.lastActivity = Date.now();
  }
}

export function addMessage(sessionId: string, message: Message): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push(message);
    session.lastActivity = Date.now();

    // Cap message history to prevent unbounded memory growth
    if (session.messages.length > MAX_MESSAGES) {
      // Keep system-level context by preserving the first message and trimming old middle messages
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionHistory(sessionId: string): Message[] {
  return sessions.get(sessionId)?.messages || [];
}
