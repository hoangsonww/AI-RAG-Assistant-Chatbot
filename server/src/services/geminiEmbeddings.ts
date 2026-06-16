import {
  GoogleGenerativeAI,
  TaskType,
  type EmbedContentRequest,
  type GenerativeModel,
} from "@google/generative-ai";

export const GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001";
export const GEMINI_EMBEDDING_DIMENSION = 768;

interface GeminiEmbedContentRequest extends EmbedContentRequest {
  outputDimensionality: number;
}

const buildEmbeddingRequest = (
  text: string,
  taskType?: TaskType,
): GeminiEmbedContentRequest => ({
  content: {
    role: "user",
    parts: [{ text }],
  },
  taskType,
  outputDimensionality: GEMINI_EMBEDDING_DIMENSION,
});

export const getEmbeddingModel = (apiKey: string): GenerativeModel => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
};

const EMBED_RETRY_BASE_MS = 3_000;
const EMBED_RETRY_MAX_MS = 70_000;

// Free-tier quota replenishes on a ~60s window; the API returns the exact wait
// ("retry in 29s" / "retryDelay":"29s"). Honor it so a run rides out the window.
const parseSuggestedDelayMs = (message: string): number => {
  const match =
    message.match(/retry in ([\d.]+)s/) ||
    message.match(/"retrydelay"\s*:\s*"(\d+)s?"/);
  if (!match) return 0;
  const seconds = parseFloat(match[1]);
  if (!Number.isFinite(seconds)) return 0;
  return Math.min((Math.ceil(seconds) + 2) * 1000, EMBED_RETRY_MAX_MS);
};

export const embedText = async (
  model: GenerativeModel,
  text: string,
  taskType?: TaskType,
): Promise<number[]> => {
  let attempt = 0;
  // Retry quota (429) and transient network/5xx errors INDEFINITELY so a sync
  // never aborts on a rate-limit window. Non-retryable errors (bad key, invalid
  // request, malformed response) throw immediately to avoid an infinite loop.
  for (;;) {
    try {
      const response = await model.embedContent(
        buildEmbeddingRequest(text, taskType),
      );
      const values = response.embedding.values;

      if (!values || !Array.isArray(values)) {
        throw new Error("Invalid embedding response format.");
      }

      return values;
    } catch (error: any) {
      const message = (error?.message || "").toLowerCase();
      const causeCode = String(error?.cause?.code || "").toUpperCase();
      const isRateLimit =
        message.includes("429") || message.includes("too many requests");
      const isTransient =
        message.includes("fetch failed") ||
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("socket hang up") ||
        message.includes("econnreset") ||
        message.includes("etimedout") ||
        message.includes("enotfound") ||
        /\b(500|502|503|504)\b/.test(message) ||
        [
          "ECONNRESET",
          "ETIMEDOUT",
          "ENOTFOUND",
          "EAI_AGAIN",
          "ECONNREFUSED",
          "UND_ERR_CONNECT_TIMEOUT",
          "UND_ERR_SOCKET",
          "UND_ERR_HEADERS_TIMEOUT",
        ].includes(causeCode);

      // "Invalid embedding response format.", auth, and bad-request errors are
      // not transient — surface them instead of looping forever.
      if (!isRateLimit && !isTransient) throw error;

      attempt += 1;
      const suggestedMs = isRateLimit ? parseSuggestedDelayMs(message) : 0;
      const delay =
        suggestedMs ||
        Math.min(EMBED_RETRY_BASE_MS * attempt, EMBED_RETRY_MAX_MS);
      console.log(
        `Embedding ${isRateLimit ? "rate limited" : "request failed"} (${
          message || causeCode || "transient"
        }), retrying in ${delay / 1000}s (attempt ${attempt})...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};
