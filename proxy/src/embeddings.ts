/**
 * Venice AI Embeddings — RAG Foundation for BaseClaw
 *
 * Uses Venice's BGE-M3 embedding model to generate vector embeddings
 * for text. This is the building block for the crypto knowledge base.
 *
 * Future: wire this into a vector store (e.g. Pinecone, Supabase pgvector)
 * to enable retrieval-augmented generation over protocol docs, whitepapers,
 * and community resources.
 */

const VENICE_EMBEDDINGS_URL = "https://api.venice.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-bge-m3";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate a vector embedding for a text string using Venice AI.
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const res = await fetch(VENICE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Venice embeddings error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const embeddingData = data.data?.[0];

  if (!embeddingData?.embedding) {
    throw new Error("No embedding returned from Venice API");
  }

  return {
    embedding: embeddingData.embedding,
    model: data.model || EMBEDDING_MODEL,
    usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
  };
}

/**
 * Generate embeddings for multiple texts in a single batch.
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<EmbeddingResult[]> {
  const res = await fetch(VENICE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Venice embeddings error (${res.status}): ${err}`);
  }

  const data = await res.json();

  return (data.data || []).map((item: { embedding: number[] }) => ({
    embedding: item.embedding,
    model: data.model || EMBEDDING_MODEL,
    usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
  }));
}
