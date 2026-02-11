import type { Message } from "./session-manager.js";
import { braveWebSearch } from "./brave-search.js";

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onFinal: (fullText: string) => void;
  onError: (error: string) => void;
}

// Tool definition for web search (OpenAI-compatible format used by OpenRouter/OpenAI)
const WEB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Search the web for real-time information. Use this when you need current data, news, prices, events, or any information that may have changed after your training cutoff.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up on the web",
        },
      },
      required: ["query"],
    },
  },
};

// Anthropic tool format
const WEB_SEARCH_TOOL_ANTHROPIC = {
  name: "web_search",
  description:
    "Search the web for real-time information. Use this when you need current data, news, prices, events, or any information that may have changed after your training cutoff.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to look up on the web",
      },
    },
    required: ["query"],
  },
};

export async function streamCompletion(
  provider: string,
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string
): Promise<void> {
  switch (provider) {
    case "anthropic":
      return streamAnthropic(model, apiKey, messages, callbacks, braveApiKey);
    case "openai":
      return streamOpenAI(model, apiKey, messages, callbacks, braveApiKey);
    case "openrouter":
      return streamOpenRouter(model, apiKey, messages, callbacks, braveApiKey);
    case "kimi":
      return streamKimi(model, apiKey, messages, callbacks, braveApiKey);
    default:
      callbacks.onError(`Unsupported provider: ${provider}`);
  }
}

// ---------- Anthropic ----------

async function streamAnthropic(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string
): Promise<void> {
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: formattedMessages,
    stream: true,
  };

  if (braveApiKey) {
    body.tools = [WEB_SEARCH_TOOL_ANTHROPIC];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks.onError(`Anthropic API error (${res.status}): ${err}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  let toolUseId = "";
  let toolName = "";
  let toolInputJson = "";
  let hasToolUse = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") {
          hasToolUse = true;
          toolUseId = parsed.content_block.id;
          toolName = parsed.content_block.name;
          toolInputJson = "";
        } else if (parsed.type === "content_block_delta") {
          if (parsed.delta?.type === "text_delta" && parsed.delta?.text) {
            fullText += parsed.delta.text;
            callbacks.onDelta(parsed.delta.text);
          } else if (parsed.delta?.type === "input_json_delta" && parsed.delta?.partial_json) {
            toolInputJson += parsed.delta.partial_json;
          }
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  // Handle tool call if the model requested one
  if (hasToolUse && toolName === "web_search" && braveApiKey) {
    try {
      const toolInput = JSON.parse(toolInputJson);
      const query = toolInput.query;

      callbacks.onDelta("\n\n🔍 *Searching the web...*\n\n");

      const searchResults = await braveWebSearch(query, braveApiKey);
      const resultsText = searchResults
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
        .join("\n\n");

      // Continue conversation with tool result
      const continuationMessages = [
        ...formattedMessages,
        {
          role: "assistant" as const,
          content: [
            ...(fullText ? [{ type: "text" as const, text: fullText }] : []),
            {
              type: "tool_use" as const,
              id: toolUseId,
              name: toolName,
              input: toolInput,
            },
          ],
        },
        {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: toolUseId,
              content: resultsText,
            },
          ],
        },
      ];

      const body2: Record<string, unknown> = {
        model,
        max_tokens: 4096,
        messages: continuationMessages,
        stream: true,
      };

      const res2 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body2),
      });

      if (!res2.ok) {
        const err = await res2.text();
        callbacks.onError(`Anthropic API error on continuation (${res2.status}): ${err}`);
        return;
      }

      const reader2 = res2.body?.getReader();
      if (!reader2) {
        callbacks.onError("No response body on continuation");
        return;
      }

      let buffer2 = "";
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;

        buffer2 += decoder.decode(value, { stream: true });
        const lines = buffer2.split("\n");
        buffer2 = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") continue;

          try {
            const parsed = JSON.parse(d);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              callbacks.onDelta(parsed.delta.text);
            }
          } catch {
            // Skip
          }
        }
      }
    } catch (err) {
      callbacks.onDelta(`\n\n⚠️ Search failed: ${err}\n\n`);
    }
  }

  callbacks.onFinal(fullText);
}

// ---------- OpenAI ----------

async function streamOpenAI(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string
): Promise<void> {
  await streamOpenAICompatible(
    "https://api.openai.com/v1/chat/completions",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    model,
    messages,
    callbacks,
    braveApiKey,
    apiKey,
    "https://api.openai.com/v1/chat/completions",
    "OpenAI"
  );
}

// ---------- OpenRouter ----------

async function streamOpenRouter(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string
): Promise<void> {
  await streamOpenAICompatible(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://baseclaw-v6kt.vercel.app",
      "X-Title": "Baseclaw",
    },
    model,
    messages,
    callbacks,
    braveApiKey,
    apiKey,
    "https://openrouter.ai/api/v1/chat/completions",
    "OpenRouter"
  );
}

// ---------- Kimi ----------

async function streamKimi(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string
): Promise<void> {
  await streamOpenAICompatible(
    "https://api.moonshot.cn/v1/chat/completions",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    model,
    messages,
    callbacks,
    braveApiKey,
    apiKey,
    "https://api.moonshot.cn/v1/chat/completions",
    "Kimi"
  );
}

// ---------- Shared OpenAI-compatible streaming with tool call support ----------

async function streamOpenAICompatible(
  url: string,
  headers: Record<string, string>,
  model: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  braveApiKey?: string,
  providerApiKey?: string,
  continuationUrl?: string,
  providerName?: string
): Promise<void> {
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    stream: true,
  };

  if (braveApiKey) {
    body.tools = [WEB_SEARCH_TOOL];
    body.tool_choice = "auto";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks.onError(`${providerName || "API"} error (${res.status}): ${err}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  // Track tool calls
  let toolCallId = "";
  let toolCallName = "";
  let toolCallArgs = "";
  let hasToolCall = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];

        if (!choice) continue;

        // Regular text delta
        const textDelta = choice.delta?.content;
        if (textDelta) {
          fullText += textDelta;
          callbacks.onDelta(textDelta);
        }

        // Tool call delta
        const toolCalls = choice.delta?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          const tc = toolCalls[0];
          if (tc.id) toolCallId = tc.id;
          if (tc.function?.name) toolCallName = tc.function.name;
          if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          hasToolCall = true;
        }

        // Check finish reason
        if (choice.finish_reason === "tool_calls") {
          hasToolCall = true;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  // Handle tool call if the model requested a web search
  if (hasToolCall && toolCallName === "web_search" && braveApiKey) {
    try {
      const args = JSON.parse(toolCallArgs);
      const query = args.query;

      callbacks.onDelta("\n\n🔍 *Searching the web...*\n\n");

      const searchResults = await braveWebSearch(query, braveApiKey);
      const resultsText = searchResults
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`)
        .join("\n\n");

      // Build continuation messages with tool result
      const continuationMessages = [
        ...formattedMessages,
        {
          role: "assistant" as const,
          content: fullText || null,
          tool_calls: [
            {
              id: toolCallId,
              type: "function" as const,
              function: {
                name: toolCallName,
                arguments: toolCallArgs,
              },
            },
          ],
        },
        {
          role: "tool" as const,
          tool_call_id: toolCallId,
          content: resultsText,
        },
      ];

      const body2: Record<string, unknown> = {
        model,
        messages: continuationMessages,
        stream: true,
      };

      const res2 = await fetch(continuationUrl || url, {
        method: "POST",
        headers,
        body: JSON.stringify(body2),
      });

      if (!res2.ok) {
        const err = await res2.text();
        callbacks.onError(`${providerName || "API"} continuation error (${res2.status}): ${err}`);
        return;
      }

      const reader2 = res2.body?.getReader();
      if (!reader2) {
        callbacks.onError("No response body on continuation");
        return;
      }

      let buffer2 = "";
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;

        buffer2 += decoder.decode(value, { stream: true });
        const lines = buffer2.split("\n");
        buffer2 = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") continue;

          try {
            const parsed = JSON.parse(d);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              callbacks.onDelta(delta);
            }
          } catch {
            // Skip
          }
        }
      }
    } catch (err) {
      callbacks.onDelta(`\n\n⚠️ Search failed: ${err}\n\n`);
    }
  }

  callbacks.onFinal(fullText);
}
