"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const queryKnowledge_1 = require("../scripts/queryKnowledge");
dotenv_1.default.config();
/**
 * Sends a chat message to Gemini AI, first searching Pinecone for relevant knowledge.
 * If no relevant knowledge is found, Gemini still responds with general information.
 * @param history - The conversation history.
 * @param message - The new user message.
 * @param systemInstruction - (Optional) A system instruction to guide the AI.
 * @returns A promise resolving with the AI's response text.
 */
const chatWithAI = (history, message, systemInstruction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
    }
    // Search Pinecone for relevant context before querying Gemini AI
    const pineconeResults = yield (0, queryKnowledge_1.searchKnowledge)(message, 3);
    let additionalContext = "";
    if (pineconeResults.length > 0) {
        additionalContext = `\n\nRelevant Information:\n${pineconeResults
            .map((r) => `- ${r.text}`)
            .join("\n")}`;
    }
    else {
        additionalContext =
            "No relevant knowledge found in Pinecone. You are a highly intelligent AI assistant. If relevant information is found in the user's internal database, include it in your response. However, if no relevant information is found, use your general knowledge to answer the question accurately and in detail.\n";
    }
    const fullSystemInstruction = process.env.AI_INSTRUCTIONS || "";
    const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
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
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
        },
    ];
    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "user", parts: [{ text: additionalContext }] });
    const chatSession = model.startChat({
        generationConfig,
        safetySettings,
        history: history,
    });
    const result = yield chatSession.sendMessage(message);
    if (!result.response || !result.response.text) {
        throw new Error("Failed to get text response from the AI.");
    }
    return result.response.text();
});
exports.chatWithAI = chatWithAI;
