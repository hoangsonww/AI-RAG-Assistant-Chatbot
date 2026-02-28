import { TaskType } from "@google/generative-ai";
import dotenv from "dotenv";
import { embedText, getEmbeddingModel } from "../services/geminiEmbeddings";
import { index } from "../services/pineconeClient";

dotenv.config();

const model = getEmbeddingModel(process.env.GOOGLE_AI_API_KEY!);

/**
 * Searches the knowledge base for relevant information based on the query.
 *
 * @param query - The search query.
 * @param topK - The number of top results to return.
 */
async function searchKnowledge(query: string, topK = 3) {
  try {
    const queryEmbedding = await embedText(
      model,
      query,
      TaskType.RETRIEVAL_QUERY,
    );

    const response = await index.namespace("knowledge").query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    const results = response.matches?.map((match) => ({
      text: match.metadata?.text,
      score: match.score,
    }));

    return results;
  } catch (error) {
    return [];
  }
}

// Example usage 1
(async () => {
  const query = "Who is David Nguyen?";
  const results = await searchKnowledge(query);
  console.log("🔹 Most relevant results:", results);
})();

// Example usage 2
(async () => {
  const query = "What projects has Son Nguyen worked on?";
  const results = await searchKnowledge(query, 5);
  console.log("🔹 Most relevant results:", results);
})();

// Example usage 3
(async () => {
  const query = "What are Son Nguyen's skills?";
  const results = await searchKnowledge(query, 10);
  console.log("🔹 Most relevant results:", results);
})();

// Example usage 4
(async () => {
  const query = "What is Lumina?";
  const results = await searchKnowledge(query, 1);
  console.log("🔹 Most relevant results:", results);
})();

export { searchKnowledge };
