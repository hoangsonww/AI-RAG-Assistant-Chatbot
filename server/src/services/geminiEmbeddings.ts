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

const EMBED_RETRY_ATTEMPTS = 5;
const EMBED_RETRY_BASE_MS = 3_000;

export const embedText = async (
  model: GenerativeModel,
  text: string,
  taskType?: TaskType,
) => {
  for (let attempt = 0; attempt < EMBED_RETRY_ATTEMPTS; attempt++) {
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
      const message = error?.message || "";
      const isRateLimit =
        message.includes("429") || message.includes("Too Many Requests");
      if (!isRateLimit || attempt === EMBED_RETRY_ATTEMPTS - 1) throw error;
      const delay = EMBED_RETRY_BASE_MS * (attempt + 1);
      console.log(`Embedding rate limited, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Embedding retry exhausted.");
};
