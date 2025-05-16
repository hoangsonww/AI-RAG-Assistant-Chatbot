import { Ollama } from "@ollama/ollama";
import dotenv from "dotenv";
import { searchKnowledge } from "../scripts/queryKnowledge";

dotenv.config();

/**
 * Sends a chat message to Ollama AI, first searching FAISS for relevant knowledge.
 * If no relevant knowledge is found, Ollama still responds with general information.
 * @param history - The conversation history.
 * @param message - The new user message.
 * @param systemInstruction - (Optional) A system instruction to guide the AI.
 * @returns A promise resolving with the AI's response text.
 */
export const chatWithAI = async (
  history: Array<any>,
  message: string,
  systemInstruction?: string,
): Promise<string> => {
  if (!process.env.OLLAMA_API_KEY) {
    throw new Error("Missing OLLAMA_API_KEY in environment variables");
  }

  // Search FAISS for relevant context before querying Ollama AI
  const faissResults = await searchKnowledge(message, 3);
  let additionalContext = "";

  if (faissResults.length > 0) {
    additionalContext = `\n\nRelevant Information:\n${faissResults
      .map((r) => `- ${r.text}`)
      .join("\n")}`;
  } else {
    additionalContext =
      "No relevant knowledge found in FAISS. You are a highly intelligent AI assistant. If relevant information is found in the user's internal database, include it in your response. However, if no relevant information is found, use your general knowledge to answer the question accurately and in detail.\n";
  }

  console.log(
    "🧠 Enriching AI with FAISS knowledge:",
    JSON.stringify(additionalContext, null, 2),
  );

  // Combine system instructions with knowledge base context
  const fullSystemInstruction = process.env.AI_INSTRUCTIONS || "";

  // Initialize Ollama AI
  const ollama = new Ollama(process.env.OLLAMA_API_KEY);
  const model = ollama.getGenerativeModel({
    model: "ollama-2.0-flash-lite",
    systemInstruction: fullSystemInstruction,
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  };

  const safetySettings = [
    {
      category: "harassment",
      threshold: "none",
    },
    {
      category: "hate_speech",
      threshold: "none",
    },
    {
      category: "sexually_explicit",
      threshold: "none",
    },
    {
      category: "dangerous_content",
      threshold: "none",
    },
  ];

  // Add FAISS results to history
  history.push({ role: "user", parts: [{ text: message }] });
  history.push({ role: "user", parts: [{ text: additionalContext }] });

  // Start chat session
  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: history,
  });

  const result = await chatSession.sendMessage(message);

  if (!result.response || !result.response.text) {
    throw new Error("Failed to get text response from the AI.");
  }

  return result.response.text();
};
