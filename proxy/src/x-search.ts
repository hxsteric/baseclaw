/**
 * X/Twitter Search via xAI Grok API
 *
 * Uses Grok's x_search tool to search actual X/Twitter posts.
 * Called as a pre-fetch step — results injected into Venice system prompt.
 * Endpoint: POST /v1/responses (NOT /v1/chat/completions)
 */

// ─── Pattern Detection ───────────────────────────────────────────────

const X_PATTERNS = [
  // Direct X/Twitter mentions
  /\b(tweet|tweeted|tweeting|tweets)\b/i,
  /\btwitter\b/i,
  /\bx\.com\b/i,
  /\bon x\b/i,
  /\bx post/i,
  /\bcrypto twitter\b/i,
  /\b(ct)\b/,  // case-sensitive — "CT" = crypto twitter

  // People / accounts / influencers
  /\b(influencer|influencers)\b/i,
  /\b(kol|kols)\b/i,
  /\balpha caller/i,
  /\bwho.{0,30}(shill|promote|talk|discuss|post|mention|say|hype|pump|call|endorse|recommend|support)/i,
  /\b(shill|shilling|shilled|shills)\b/i,
  /\b(promote|promoting|promoted|promotes)\b.*\b(token|coin|crypto|project)\b/i,

  // Social activity & engagement
  /\b(mentions?|mentioned)\b.*\b(token|coin|crypto|project|on)\b/i,
  /\b(trending|viral|popular|blowing up)\b/i,
  /\b(sentiment|buzz|hype|fud|narrative)\b/i,
  /\bretweet/i,
  /\bthreads?\b.*\b(about|on)\b/i,
  /\bspaces?\b.*\b(about|on|crypto)\b/i,

  // Social proof / community
  /\bwhat.{0,20}(people|everyone|community|traders).{0,20}(say|think|believe|feel)/i,
  /\bcommunity.{0,20}(think|say|feel|react|opinion|view)/i,
  /\b(opinion|views|reaction|take)\b.*\b(on|about)\b/i,

  // Who is behind / supporters
  /\bwho.{0,20}(behind|backing|support|invest|follow)/i,
  /\b(backer|backers|supporter|supporters)\b/i,
  /\bfollower/i,
];

/**
 * Check if a message is asking about X/Twitter content.
 */
export function needsXSearch(message: string): boolean {
  const matched = X_PATTERNS.some(p => p.test(message));
  console.log(`[X-Search] Pattern check: "${message.slice(0, 80)}..." → ${matched ? "MATCH" : "no match"}`);
  return matched;
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
  if (!apiKey) {
    console.error("[X-Search] No API key provided");
    return "";
  }

  console.log(`[X-Search] Calling xAI Grok for: "${query.slice(0, 80)}..."`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

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
            content: `You are a crypto X/Twitter research specialist. Use the x_search tool to find REAL posts on X about the topic.

You MUST return:
1. A list of specific @usernames who posted about this topic, with their approximate follower count if visible
2. Direct quotes from their posts (use quotation marks)
3. Engagement metrics when visible: likes, retweets, replies, views
4. Post dates (how recent)
5. Overall sentiment summary: bullish/bearish/neutral and why

Format your response as a structured list. Do NOT say "I couldn't find" — always search and report what you find, even if results are limited. If you find few results, note that activity is low.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        tools: [{ type: "x_search" }],
        max_tokens: 2000,
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
    // Fallback: try choices format
    if (!content && data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
    }

    if (!content) {
      console.error("[X-Search] No content in response. Keys:", Object.keys(data).join(", "));
      console.error("[X-Search] Response preview:", JSON.stringify(data).slice(0, 500));
      return "";
    }

    console.log(`[X-Search] SUCCESS: Got ${content.length} chars`);

    return `\n\n[X/TWITTER DATA — real-time search via xAI, fetched ${new Date().toISOString()}]\n${content}`;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[X-Search] Request timed out (25s)");
    } else {
      console.error("[X-Search] Error:", err);
    }
    return "";
  }
}
