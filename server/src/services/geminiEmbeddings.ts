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

export const embedText = async (
  model: GenerativeModel,
  text: string,
  taskType?: TaskType,
) => {
  const response = await model.embedContent(
    buildEmbeddingRequest(text, taskType),
  );
  const values = response.embedding.values;

  if (!values || !Array.isArray(values)) {
    throw new Error("Invalid embedding response format.");
  }

  return values;
};
