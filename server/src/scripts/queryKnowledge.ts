import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { FAISS } from "langchain/vectorstores";
import { HuggingFaceEmbeddings } from "langchain/embeddings";

dotenv.config();

// @ts-ignore
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });

/**
 * Searches the knowledge base for relevant information based on the query.
 *
 * @param query - The search query.
 * @param topK - The number of top results to return.
 */
async function searchKnowledge(query: string, topK = 3) {
  try {
    console.log(`🔍 Searching for: "${query}"...`);

    const embeddingResponse = await model.embedContent(query);
    const queryEmbedding = embeddingResponse.embedding.values;

    if (!queryEmbedding || !Array.isArray(queryEmbedding))
      throw new Error("Invalid query embedding.");

    const vectorStore = await FAISS.load(process.env.FAISS_INDEX_PATH, new HuggingFaceEmbeddings());

    const response = await vectorStore.similaritySearch(queryEmbedding, topK);

    const results = response.map((match) => ({
      text: match.metadata?.text,
      score: match.score,
    }));

    console.log(`✅ Found ${results.length} matches.`);
    return results;
  } catch (error) {
    console.error("❌ Error searching:", error);
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

// Example usage 5
(async () => {
  const query = "What is Pinecone?";
  const results = await searchKnowledge(query, 2);
  console.log("🔹 Most relevant results:", results);
})();

export { searchKnowledge };
