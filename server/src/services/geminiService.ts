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

  history.push({ role: "user", parts: [{ text: message }] });
  history.push({ role: "user", parts: [{ text: additionalContext }] });

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

/**
 * Generates a conversation summary including highlights and action items.
 * @param messages - Array of conversation messages
 * @returns A promise resolving with summary, highlights, and action items
 */
export const generateConversationSummary = async (
  messages: Array<{ sender: string; text: string; timestamp: Date }>,
): Promise<{
  summary: string;
  highlights: string[];
  actionItems: string[];
}> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  if (!messages || messages.length === 0) {
    throw new Error("No messages to summarize");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
  });

  const conversationText = messages
    .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n\n");

  const prompt = `Analyze the following conversation and provide:
1. A concise summary (2-3 sentences) of the main topics discussed
2. Key highlights or important points (as a list of 3-5 items)
3. Action items or follow-ups mentioned (as a list, or empty if none)

Conversation:
${conversationText}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "highlights": ["...", "..."],
  "actionItems": ["...", "..."]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse the JSON response
  try {
    // Remove markdown code block markers if present
    const cleanedText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleanedText);

    return {
      summary: parsed.summary || "No summary available",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      summary: responseText.substring(0, 500),
      highlights: [],
      actionItems: [],
    };
  }
};
