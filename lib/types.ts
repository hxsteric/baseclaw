export interface ImageAttachment {
  data: string;      // base64 (no data: prefix)
  mimeType: string;  // image/png, image/jpeg
}

export interface TeeAttestation {
  verified: boolean;
  model: string;
  signingAddress?: string;
  nonce: string;
  teeProvider: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
  images?: ImageAttachment[];
  attestation?: TeeAttestation;
}

export type KeyMode = "byok" | "managed";

export type Plan = "free" | "starter" | "pro" | "business";

// Smart contract tier enum mapping
export const TIER_ID: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

// USDC on Base mainnet
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const USDC_DECIMALS = 6;

export interface UserConfig {
  apiKey: string;
  model: string;
  provider: "anthropic" | "openai" | "openrouter" | "venice" | "kimi";
  keyMode: KeyMode;
  uncensored?: boolean;
}

export interface UserProfile {
  fid: number;
  wallet_address: string | null;
  plan: Plan;
  plan_started_at: string | null;
  plan_expires_at: string | null;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  cost_usd: number;
  extra_budget: number;
  period: string;
}

export interface AuthState {
  fid: number | null;
  token: string | null;
  authenticated: boolean;
}

export type AppStep = "loading" | "onboarding" | "setup" | "agents" | "chat" | "plans";

export interface MoltbookConfig {
  registered: boolean;
  apiKey?: string;
  claimUrl?: string;
  claimed: boolean;
  agentName?: string;
}

export interface SavedAgent {
  id: string;
  name: string;
  config: UserConfig;
  enabled: boolean;
  createdAt: number;
  lastUsedAt: number;
  moltbook?: MoltbookConfig;
}

export type AgentMessages = Record<string, ChatMessage[]>;

export interface ProxyMessage {
  action: "send" | "history" | "config" | "moltbook";
  message?: string;
  model?: string;
  apiKey?: string;
  provider?: string;
  keyMode?: KeyMode;
  fid?: number;
  token?: string;
  limit?: number;
  // Moltbook actions
  subaction?: string;
  moltbookApiKey?: string;
  name?: string;
  description?: string;
  submolt?: string;
  title?: string;
  content?: string;
  postId?: string;
  parentId?: string;
  targetName?: string;
  query?: string;
  sort?: string;
  subject?: string;
  body?: string;
}

export interface ProxyResponse {
  type: "connected" | "delta" | "final" | "history" | "error" | "moltbook";
  fid?: number;
  text?: string;
  message?: string;
  messages?: ChatMessage[];
  runId?: string;
  // Moltbook response
  subaction?: string;
  data?: unknown;
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
  venice: [
    { label: "DeepSeek V3.2 (Private)", provider: "venice", id: "deepseek-v3.2" },
    { label: "Llama 3.3 70B (Fast)", provider: "venice", id: "llama-3.3-70b" },
    { label: "Venice Uncensored", provider: "venice", id: "venice-uncensored" },
    { label: "Qwen 3 235B", provider: "venice", id: "qwen3-235b-a22b-instruct-2507" },
    { label: "Grok 4.1 Fast", provider: "venice", id: "grok-41-fast" },
    { label: "Qwen 3 122B TEE (Encrypted)", provider: "venice", id: "tee-qwen3-5-122b-a10b" },
    { label: "Mistral 3.1 24B TEE (Encrypted)", provider: "venice", id: "tee-mistral-3.1-24b" },
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
