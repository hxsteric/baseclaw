import type { Message } from "./session-manager.js";

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onFinal: (fullText: string) => void;
  onError: (error: string) => void;
}

export async function streamCompletion(
  provider: string,
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<void> {
  switch (provider) {
    case "anthropic":
      return streamAnthropic(model, apiKey, messages, callbacks);
    case "openai":
      return streamOpenAI(model, apiKey, messages, callbacks);
    case "kimi":
      return streamKimi(model, apiKey, messages, callbacks);
    default:
      callbacks.onError(`Unsupported provider: ${provider}`);
  }
}

async function streamAnthropic(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<void> {
  const body = {
    model,
    max_tokens: 4096,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

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
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          fullText += parsed.delta.text;
          callbacks.onDelta(parsed.delta.text);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  callbacks.onFinal(fullText);
}

async function streamOpenAI(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<void> {
  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks.onError(`OpenAI API error (${res.status}): ${err}`);
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
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          callbacks.onDelta(delta);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  callbacks.onFinal(fullText);
}

async function streamKimi(
  model: string,
  apiKey: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<void> {
  // Kimi uses OpenAI-compatible API format
  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

  const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks.onError(`Kimi API error (${res.status}): ${err}`);
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

  callbacks.onFinal(fullText);
}
