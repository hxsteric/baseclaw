export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface UserConfig {
  apiKey: string;
  model: string;
  provider: "anthropic" | "openai" | "openrouter" | "kimi";
}

export interface AuthState {
  fid: number | null;
  token: string | null;
  authenticated: boolean;
}

export type AppStep = "loading" | "onboarding" | "setup" | "agents" | "chat";

export interface SavedAgent {
  id: string;
  name: string;
  config: UserConfig;
  enabled: boolean;
  createdAt: number;
  lastUsedAt: number;
}

export type AgentMessages = Record<string, ChatMessage[]>;

export interface ProxyMessage {
  action: "send" | "history" | "config";
  message?: string;
  model?: string;
  apiKey?: string;
  provider?: string;
  limit?: number;
}

export interface ProxyResponse {
  type: "connected" | "delta" | "final" | "history" | "error";
  fid?: number;
  text?: string;
  message?: string;
  messages?: ChatMessage[];
  runId?: string;
}

export const SUPPORTED_MODELS: Record<string, { label: string; provider: string; id: string }[]> = {
  anthropic: [
    { label: "Claude Sonnet 4.5", provider: "anthropic", id: "claude-sonnet-4-5-20250929" },
    { label: "Claude Haiku 4.5", provider: "anthropic", id: "claude-haiku-4-5-20251001" },
  ],
  openai: [
    { label: "GPT-4o", provider: "openai", id: "gpt-4o" },
    { label: "GPT-4o Mini", provider: "openai", id: "gpt-4o-mini" },
  ],
  openrouter: [
    { label: "Claude Sonnet 4", provider: "openrouter", id: "anthropic/claude-sonnet-4" },
    { label: "GPT-4o", provider: "openrouter", id: "openai/gpt-4o" },
    { label: "Gemini 2.5 Flash", provider: "openrouter", id: "google/gemini-2.5-flash-preview" },
    { label: "DeepSeek V3", provider: "openrouter", id: "deepseek/deepseek-chat-v3-0324" },
    { label: "Llama 4 Scout", provider: "openrouter", id: "meta-llama/llama-4-scout" },
  ],
  kimi: [
    { label: "Kimi K2", provider: "kimi", id: "kimi-k2" },
  ],
};
