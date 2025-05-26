import { index } from "../services/pineconeClient";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import type { Embeddings } from "langchain/embeddings";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { RetrievalQAChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import type { Document } from "langchain/document";

dotenv.config();

class GoogleEmbeddings implements Embeddings {
  private genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private modelName = "models/text-embedding-004";

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const responses = await Promise.all(
      texts.map((t) =>
        this.genAI
          .getGenerativeModel({ model: this.modelName })
          .embedContent(t),
      ),
    );
    return responses.map((r) => r.embedding.values);
  }

  async embedQuery(text: string): Promise<number[]> {
    const r = await this.genAI
      .getGenerativeModel({ model: this.modelName })
      .embedContent(text);
    return r.embedding.values;
  }
}

let ragChain: RetrievalQAChain | null = null;

/**
 * Lazy-initialize the RAG chain on first call.
 */
async function getRagChain(): Promise<RetrievalQAChain> {
  if (ragChain) return ragChain;

  // 1. Create a Pinecone-backed vector store
  const embeddings = new GoogleEmbeddings();
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: "knowledge",
    textKey: "text",
  });

  // 2. Build a retriever
  const retriever = vectorStore.asRetriever({
    topK: 4,
    fetchMetadata: true,
  });

  // 3. Initialize the LLM
  const llm = new GoogleGenerativeAI(
    process.env.GOOGLE_AI_API_KEY!,
  ).getGenerativeModel({
    model: "models/text-bison-001",
  });

  // 4. Prompt template
  const prompt = new PromptTemplate({
    template: `
    You are Lumina, David Nguyen's AI assistant. Use the following context excerpts to answer the user’s question.
    Context:
    {context}
    Question:
    {question}
    Answer in clear, concise prose.
    `,
    inputVariables: ["context", "question"],
  });

  // 5. Wire up RetrievalQAChain
  ragChain = RetrievalQAChain.fromLLM(llm, retriever, {
    prompt,
    returnSourceDocuments: true,
  });

  return ragChain;
}

/**
 * Answer a question using the RAG chain.
 *
 * @param userQuestion - The user’s query
 */
export async function answerWithRAG(userQuestion: string) {
  const chain = await getRagChain();
  const res = await chain.call({ question: userQuestion });
  const sources = (res.sourceDocuments ?? []).map(
    (doc: Document, i: number) => ({
      id: doc.metadata?.id ?? i,
      snippet: doc.pageContent,
      score: doc.score ?? 0,
    }),
  );

  return {
    answer: res.text,
    sources,
  };
}
