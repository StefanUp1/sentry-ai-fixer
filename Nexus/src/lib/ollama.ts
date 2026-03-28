export type OllamaChatRole = "system" | "user" | "assistant";

export type OllamaChatMessage = {
  role: OllamaChatRole;
  content: string;
};

type OllamaChatResponse = {
  message?: { role?: string; content?: string };
};

/**
 * Non-streaming chat against Ollama's HTTP API (OpenAI-compatible `/api/chat`).
 * `baseUrl` may include Basic Auth (e.g. `http://user:pass@host:port`).
 */
export async function ollamaChat(opts: {
  baseUrl: string;
  model: string;
  messages: OllamaChatMessage[];
}): Promise<string> {
  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: false,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let data: OllamaChatResponse;
  try {
    data = JSON.parse(text) as OllamaChatResponse;
  } catch {
    throw new Error("Ollama returned non-JSON body");
  }

  const content = data.message?.content;
  return typeof content === "string" ? content : "";
}
