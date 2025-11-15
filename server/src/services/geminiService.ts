import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
} from "@google/generative-ai";
import dotenv from "dotenv";
import { searchKnowledge } from "../scripts/queryKnowledge";

dotenv.config();

/**
 * Sends a chat message to Gemini AI, first searching Pinecone for relevant knowledge.
 * If no relevant knowledge is found, Gemini still responds with general information.
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
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  // Search Pinecone for relevant context before querying Gemini AI
  const pineconeResults = await searchKnowledge(message, 3);
  let additionalContext = "";

  if (pineconeResults.length > 0) {
    additionalContext = `\n\nRelevant Information:\n${pineconeResults
      .map((r) => `- ${r.text}`)
      .join("\n")}`;
  } else {
    additionalContext =
      "No relevant knowledge found in Pinecone. You are a highly intelligent AI assistant. If relevant information is found in the user's internal database, include it in your response. However, if no relevant information is found, use your general knowledge to answer the question accurately and in detail.\n";
  }

  const fullSystemInstruction = process.env.AI_INSTRUCTIONS || "";
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: fullSystemInstruction,
  });

  const generationConfig: GenerationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  const chatHistory = [
    ...history,
    { role: "user", parts: [{ text: additionalContext }] },
  ];

  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });
  const result = await chatSession.sendMessage(message);
  if (!result.response || !result.response.text) {
    throw new Error("Failed to get text response from the AI.");
  }

  return result.response.text();
};

/**
 * Streams a chat response from Gemini AI using Server-Sent Events.
 * @param history - The conversation history.
 * @param message - The new user message.
 * @param onChunk - Callback function to handle each chunk of the response.
 * @returns A promise resolving with the complete AI response text.
 */
export const streamChatWithAI = async (
  history: Array<any>,
  message: string,
  onChunk: (chunk: string) => void,
): Promise<string> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const pineconeResults = await searchKnowledge(message, 3);
  let additionalContext = "";

  if (pineconeResults.length > 0) {
    additionalContext = `\n\nRelevant Information:\n${pineconeResults
      .map((r) => `- ${r.text}`)
      .join("\n")}`;
  } else {
    additionalContext =
      "No relevant knowledge found in Pinecone. You are a highly intelligent AI assistant. If relevant information is found in the user's internal database, include it in your response. However, if no relevant information is found, use your general knowledge to answer the question accurately and in detail.\n";
  }

  const fullSystemInstruction = process.env.AI_INSTRUCTIONS || "";
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: fullSystemInstruction,
  });

  const generationConfig: GenerationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  const chatHistory = [
    ...history,
    { role: "user", parts: [{ text: additionalContext }] },
  ];

  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  const result = await chatSession.sendMessageStream(message);
  let fullResponse = "";

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      fullResponse += chunkText;
      onChunk(chunkText);
    }
  }

  if (!fullResponse) {
    throw new Error("Failed to get text response from the AI.");
  }

  return fullResponse;
};

/**
 * Generate a concise conversation title based on the conversation messages.
 * @param messages - The conversation messages.
 * @returns A promise resolving with a suggested title (max 50 characters).
 */
export const generateConversationTitle = async (
  messages: Array<{ sender: string; text: string }>,
): Promise<string> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  if (messages.length === 0) {
    return "Untitled Conversation";
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction:
      "You are a helpful assistant that generates concise, descriptive conversation titles. Generate a short title (maximum 50 characters) that captures the essence of the conversation. Only return the title, nothing else.",
  });

  const conversationText = messages
    .slice(0, 10)
    .map((msg) => `${msg.sender}: ${msg.text}`)
    .join("\n");

  const prompt = `Based on this conversation, generate a concise title (max 50 characters):\n\n${conversationText}`;

  const result = await model.generateContent(prompt);
  const title = result.response.text().trim();

  return title.length > 50 ? title.substring(0, 47) + "..." : title;
};
