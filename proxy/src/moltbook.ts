/**
 * Moltbook API Client — Social network for AI agents
 *
 * Wraps the Moltbook REST API (https://www.moltbook.com/api/v1).
 * Handles registration, posting, commenting, voting, following, DMs, and search.
 * Includes a safe math challenge solver (no eval).
 */

const BASE = "https://www.moltbook.com/api/v1";

// ─── Types ──────────────────────────────────────────────────────────

export interface MoltbookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
}

export interface RegisterResult {
  api_key: string;
  claim_url: string;
  agent_name: string;
}

export interface HomeData {
  agent: { name: string; karma: number; followers_count: number };
  unread_notifications: number;
  unread_messages: number;
  recent_activity: unknown[];
  suggested_actions: string[];
}

export interface PostData {
  id: string;
  title: string;
  content: string;
  type: string;
  submolt_name: string;
  author_name: string;
  score: number;
  comment_count: number;
  created_at: string;
}

export interface VerificationChallenge {
  challenge_id: string;
  challenge: string;
  expires_at: string;
}

// ─── Safe Math Solver ───────────────────────────────────────────────

// Word-to-number mapping
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100, thousand: 1000, million: 1_000_000,
};

/**
 * Convert a word-number phrase to a numeric value.
 * Handles: "two hundred forty-seven point three" → 247.3
 */
function wordsToNumber(text: string): number | null {
  const cleaned = text.toLowerCase().replace(/-/g, " ").trim();

  // Try direct numeric parse first
  const direct = parseFloat(cleaned);
  if (!isNaN(direct)) return direct;

  // Handle "negative" prefix
  let negative = false;
  let words = cleaned;
  if (words.startsWith("negative ") || words.startsWith("minus ")) {
    negative = true;
    words = words.replace(/^(negative|minus)\s+/, "");
  }

  // Split on "point" for decimals
  const parts = words.split(/\s+point\s+/);
  const intPart = parseIntegerWords(parts[0]);
  if (intPart === null) return null;

  let result = intPart;
  if (parts[1]) {
    // Decimal part: each word is a single digit
    const decimalWords = parts[1].trim().split(/\s+/);
    let decStr = "";
    for (const w of decimalWords) {
      const d = ONES[w];
      if (d !== undefined) {
        decStr += d.toString();
      } else {
        return null;
      }
    }
    result = parseFloat(`${intPart}.${decStr}`);
  }

  return negative ? -result : result;
}

function parseIntegerWords(text: string): number | null {
  const words = text.trim().split(/\s+/);
  let current = 0;
  let result = 0;

  for (const w of words) {
    if (ONES[w] !== undefined) {
      current += ONES[w];
    } else if (TENS[w] !== undefined) {
      current += TENS[w];
    } else if (w === "hundred") {
      current *= 100;
    } else if (w === "thousand") {
      current *= 1000;
      result += current;
      current = 0;
    } else if (w === "million") {
      current *= 1_000_000;
      result += current;
      current = 0;
    } else if (w === "and") {
      // Skip "and" — e.g. "two hundred and forty"
      continue;
    } else {
      return null; // Unknown word
    }
  }

  return result + current;
}

/**
 * Solve a Moltbook math verification challenge.
 * Parses word-based math expressions and returns result to 2 decimal places.
 */
export function solveMathChallenge(challenge: string): string | null {
  // Strip common phrasing
  let expr = challenge
    .replace(/^what is\s+/i, "")
    .replace(/\?$/, "")
    .trim();

  // Split on operators
  const opPattern = /\s+(plus|minus|times|multiplied by|divided by)\s+/i;
  const parts = expr.split(opPattern);

  if (parts.length < 3) {
    // Single number — just parse and format
    const n = wordsToNumber(expr);
    return n !== null ? n.toFixed(2) : null;
  }

  // Evaluate left-to-right
  let result = wordsToNumber(parts[0]);
  if (result === null) return null;

  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i]?.toLowerCase();
    const operand = wordsToNumber(parts[i + 1]);
    if (operand === null) return null;

    switch (op) {
      case "plus": result += operand; break;
      case "minus": result -= operand; break;
      case "times":
      case "multiplied by": result *= operand; break;
      case "divided by":
        if (operand === 0) return null;
        result /= operand;
        break;
      default: return null;
    }
  }

  return result.toFixed(2);
}

// ─── API Helpers ────────────────────────────────────────────────────

async function moltbookFetch<T>(
  path: string,
  apiKey?: string,
  options: RequestInit = {}
): Promise<MoltbookResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
    });

    const data = await res.json() as MoltbookResponse<T>;

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
        hint: data.hint,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Registration ───────────────────────────────────────────────────

export async function registerAgent(
  name: string,
  description: string
): Promise<MoltbookResponse<RegisterResult>> {
  return moltbookFetch<RegisterResult>("/agents/register", undefined, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

// ─── Agent Profile ──────────────────────────────────────────────────

export async function getMe(apiKey: string) {
  return moltbookFetch("/agents/me", apiKey);
}

export async function getClaimStatus(apiKey: string) {
  return moltbookFetch("/agents/status", apiKey);
}

export async function getAgentProfile(apiKey: string, name: string) {
  return moltbookFetch(`/agents/profile?name=${encodeURIComponent(name)}`, apiKey);
}

export async function updateProfile(apiKey: string, description: string) {
  return moltbookFetch("/agents/me", apiKey, {
    method: "PATCH",
    body: JSON.stringify({ description }),
  });
}

// ─── Home / Dashboard ───────────────────────────────────────────────

export async function getHome(apiKey: string): Promise<MoltbookResponse<HomeData>> {
  return moltbookFetch<HomeData>("/home", apiKey);
}

// ─── Posts ───────────────────────────────────────────────────────────

export async function createPost(
  apiKey: string,
  submolt: string,
  title: string,
  content: string,
  type: "text" | "link" | "image" = "text",
  url?: string
): Promise<MoltbookResponse<PostData & { verification?: VerificationChallenge }>> {
  const body: Record<string, unknown> = {
    submolt_name: submolt,
    title,
    content,
    type,
  };
  if (url) body.url = url;

  const result = await moltbookFetch<PostData & { verification?: VerificationChallenge }>(
    "/posts", apiKey, { method: "POST", body: JSON.stringify(body) }
  );

  // If there's a verification challenge, solve it automatically
  if (result.success && result.data?.verification) {
    const challenge = result.data.verification;
    const answer = solveMathChallenge(challenge.challenge);
    if (answer) {
      await submitVerification(apiKey, challenge.challenge_id, answer);
    }
  }

  return result;
}

export async function getPost(apiKey: string, postId: string) {
  return moltbookFetch(`/posts/${postId}`, apiKey);
}

export async function deletePost(apiKey: string, postId: string) {
  return moltbookFetch(`/posts/${postId}`, apiKey, { method: "DELETE" });
}

export async function getFeed(
  apiKey: string,
  sort: "hot" | "new" | "top" | "rising" = "hot",
  limit = 25,
  cursor?: string
) {
  let path = `/feed?sort=${sort}&limit=${limit}`;
  if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
  return moltbookFetch(path, apiKey);
}

export async function getPosts(
  apiKey: string,
  sort: "hot" | "new" | "top" | "rising" = "hot",
  limit = 25,
  cursor?: string
) {
  let path = `/posts?sort=${sort}&limit=${limit}`;
  if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
  return moltbookFetch(path, apiKey);
}

// ─── Comments ───────────────────────────────────────────────────────

export async function createComment(
  apiKey: string,
  postId: string,
  content: string,
  parentId?: string
): Promise<MoltbookResponse<unknown>> {
  const body: Record<string, unknown> = { content };
  if (parentId) body.parent_id = parentId;

  const result = await moltbookFetch<{ verification?: VerificationChallenge }>(
    `/posts/${postId}/comments`, apiKey, { method: "POST", body: JSON.stringify(body) }
  );

  // Auto-solve verification
  if (result.success && result.data?.verification) {
    const challenge = result.data.verification;
    const answer = solveMathChallenge(challenge.challenge);
    if (answer) {
      await submitVerification(apiKey, challenge.challenge_id, answer);
    }
  }

  return result;
}

export async function getComments(
  apiKey: string,
  postId: string,
  sort: "best" | "new" | "top" = "best",
  limit = 25
) {
  return moltbookFetch(`/posts/${postId}/comments?sort=${sort}&limit=${limit}`, apiKey);
}

// ─── Voting ─────────────────────────────────────────────────────────

export async function upvotePost(apiKey: string, postId: string) {
  return moltbookFetch(`/posts/${postId}/upvote`, apiKey, { method: "POST" });
}

export async function downvotePost(apiKey: string, postId: string) {
  return moltbookFetch(`/posts/${postId}/downvote`, apiKey, { method: "POST" });
}

export async function upvoteComment(apiKey: string, commentId: string) {
  return moltbookFetch(`/comments/${commentId}/upvote`, apiKey, { method: "POST" });
}

// ─── Following ──────────────────────────────────────────────────────

export async function followAgent(apiKey: string, agentName: string) {
  return moltbookFetch(`/agents/${encodeURIComponent(agentName)}/follow`, apiKey, { method: "POST" });
}

export async function unfollowAgent(apiKey: string, agentName: string) {
  return moltbookFetch(`/agents/${encodeURIComponent(agentName)}/follow`, apiKey, { method: "DELETE" });
}

// ─── Direct Messages ────────────────────────────────────────────────

export async function sendDM(
  apiKey: string,
  recipientName: string,
  subject: string,
  body: string
) {
  return moltbookFetch("/messages/send", apiKey, {
    method: "POST",
    body: JSON.stringify({ recipient_name: recipientName, subject, body }),
  });
}

// ─── Search ─────────────────────────────────────────────────────────

export async function searchPosts(apiKey: string, query: string, limit = 25) {
  return moltbookFetch(`/search?q=${encodeURIComponent(query)}&limit=${limit}`, apiKey);
}

// ─── Submolts (Communities) ─────────────────────────────────────────

export async function createSubmolt(
  apiKey: string,
  name: string,
  displayName: string,
  description: string,
  allowCrypto = true
) {
  return moltbookFetch("/submolts", apiKey, {
    method: "POST",
    body: JSON.stringify({
      name,
      display_name: displayName,
      description,
      allow_crypto: allowCrypto,
    }),
  });
}

export async function listSubmolts(apiKey: string) {
  return moltbookFetch("/submolts", apiKey);
}

export async function getSubmoltFeed(
  apiKey: string,
  name: string,
  sort: "hot" | "new" | "top" = "hot",
  limit = 25
) {
  return moltbookFetch(`/submolts/${encodeURIComponent(name)}/feed?sort=${sort}&limit=${limit}`, apiKey);
}

export async function subscribeSubmolt(apiKey: string, name: string) {
  return moltbookFetch(`/submolts/${encodeURIComponent(name)}/subscribe`, apiKey, { method: "POST" });
}

export async function unsubscribeSubmolt(apiKey: string, name: string) {
  return moltbookFetch(`/submolts/${encodeURIComponent(name)}/subscribe`, apiKey, { method: "DELETE" });
}

// ─── Notifications ──────────────────────────────────────────────────

export async function getNotifications(apiKey: string, limit = 25) {
  return moltbookFetch(`/notifications?limit=${limit}`, apiKey);
}

export async function markAllNotificationsRead(apiKey: string) {
  return moltbookFetch("/notifications/read-all", apiKey, { method: "POST" });
}

// ─── Verification ───────────────────────────────────────────────────

export async function submitVerification(
  apiKey: string,
  challengeId: string,
  answer: string
) {
  return moltbookFetch("/verify", apiKey, {
    method: "POST",
    body: JSON.stringify({ challenge_id: challengeId, answer }),
  });
}
