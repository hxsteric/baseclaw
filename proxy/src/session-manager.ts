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
}

const sessions = new Map<string, Session>();

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function createSession(
  sessionId: string,
  config: { model: string; provider: string; apiKey: string; keyMode?: KeyMode; fid?: number; plan?: string }
): Session {
  const session: Session = {
    id: sessionId,
    messages: [],
    model: config.model,
    provider: config.provider,
    apiKey: config.apiKey,
    keyMode: config.keyMode || "byok",
    fid: config.fid || null,
    plan: config.plan || "free",
    createdAt: Date.now(),
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
  }
}

export function addMessage(sessionId: string, message: Message): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push(message);
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionHistory(sessionId: string): Message[] {
  return sessions.get(sessionId)?.messages || [];
}
