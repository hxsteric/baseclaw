/**
 * X/Twitter Search via xAI Grok API
 *
 * Uses Grok's x_search tool to search actual X/Twitter posts.
 * Called as a pre-fetch step — results injected into Venice system prompt.
 * Endpoint: POST /v1/responses (NOT /v1/chat/completions)
 * Cost: ~$0.005 per search call + token costs.
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

// ─── xAI Grok API (/v1/responses) ───────────────────────────────────

/**
 * Search X/Twitter via xAI Grok's x_search tool.
 * Uses the /v1/responses endpoint (NOT /v1/chat/completions).
 * Returns formatted context string or empty string on failure.
 */
export async function searchX(
  query: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-non-reasoning",
        input: [
          {
            role: "system",
            content: "You are a crypto research assistant. Search X/Twitter and summarize what people are saying. Include @usernames, key quotes, and sentiment. Be concise and factual. List specific posts you find.",
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

    // /v1/responses returns output[] array with message items
    let content = "";
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const block of item.content) {
            if (block.type === "text") {
              content += block.text;
            }
          }
        }
      }
    }
    // Fallback: try choices format (in case API changes)
    if (!content && data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
    }

    if (!content) {
      console.error("[X-Search] No content in response:", JSON.stringify(data).slice(0, 200));
      return "";
    }

    console.log(`[X-Search] Got ${content.length} chars for: "${query.slice(0, 50)}..."`);

    return `\n\n[X/TWITTER DATA — fetched ${new Date().toISOString()}]\n${content}`;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[X-Search] Request timed out (20s)");
    } else {
      console.error("[X-Search] Error:", err);
    }
    return "";
  }
}
