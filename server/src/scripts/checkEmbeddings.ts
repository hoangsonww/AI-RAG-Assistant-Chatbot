import dotenv from "dotenv";
import {
  GEMINI_EMBEDDING_DIMENSION,
  embedText,
  getEmbeddingModel,
} from "../services/geminiEmbeddings";

dotenv.config();

const model = getEmbeddingModel(process.env.GOOGLE_AI_API_KEY!);

/**
 * Check the embedding dimension of the model.
 */
async function checkEmbeddingDimension() {
  const values = await embedText(model, "Test embedding for dimension check");

  if (values.length !== GEMINI_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected ${GEMINI_EMBEDDING_DIMENSION} dimensions, received ${values.length}.`,
    );
  }

  console.log(`Embedding Dimension: ${values.length}`);
}

checkEmbeddingDimension();
