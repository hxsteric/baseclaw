/**
 * X/Twitter Search via xAI Grok API
 *
 * Uses Grok's x_search tool to search actual X/Twitter posts.
 * Called as a pre-fetch step — results injected into Venice system prompt.
 * Cost: ~$0.005 per search call.
 */

// ─── Pattern Detection ───────────────────────────────────────────────

const X_PATTERNS = [
  /\b(tweet|tweeted|tweeting|twitter|x\.com)\b/i,
  /\bon x\b/i,
  /\bx post/i,
  /\bcrypto twitter\b/i,
  /\b(ct|kol|alpha caller)\b/i,
  /\b(influencer|influencers)\b.*\b(crypto|token|coin|nft|defi)\b/i,
  /\b(crypto|token|coin)\b.*\b(influencer|influencers)\b/i,
  /\bwho.*\b(talking|discussing|posting|shilling|mentioning)\b/i,
  /\b(sentiment|buzz|hype|fud)\b.*\b(on|about)\b/i,
  /\bwhat.*\b(people|everyone|community)\b.*\b(saying|think)\b/i,
];

/**
 * Check if a message is asking about X/Twitter content.
 */
export function needsXSearch(message: string): boolean {
  return X_PATTERNS.some(p => p.test(message));
}

// ─── xAI Grok API ───────────────────────────────────────────────────

interface XSearchResult {
  text: string;
  citations: string[];
}

/**
 * Search X/Twitter via xAI Grok's x_search tool.
 * Returns formatted context string or empty string on failure.
 */
export async function searchX(
  query: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        messages: [
          {
            role: "system",
            content: "You are a crypto research assistant. Search X/Twitter and summarize what people are saying. Include usernames, key quotes, and sentiment. Be concise and factual.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        tools: [{ type: "x_search" }],
        max_tokens: 1500,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      console.error(`[X-Search] xAI API error (${res.status}): ${err}`);
      return "";
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) return "";

    // Extract citations if available
    const citations: string[] = [];
    if (data.citations) {
      for (const c of data.citations) {
        if (c.url) citations.push(c.url);
      }
    }

    const citationText = citations.length > 0
      ? `\nSources: ${citations.slice(0, 5).join(", ")}`
      : "";

    console.log(`[X-Search] Got ${content.length} chars for: "${query.slice(0, 50)}..."`);

    return `\n\n[X/TWITTER DATA — fetched ${new Date().toISOString()}]\n${content}${citationText}`;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[X-Search] Request timed out (15s)");
    } else {
      console.error("[X-Search] Error:", err);
    }
    return "";
  }
}
