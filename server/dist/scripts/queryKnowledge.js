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
exports.searchKnowledge = searchKnowledge;
const pineconeClient_1 = require("../services/pineconeClient");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// @ts-ignore
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
/**
 * Searches the knowledge base for relevant information based on the query.
 *
 * @param query - The search query.
 * @param topK - The number of top results to return.
 */
function searchKnowledge(query_1) {
    return __awaiter(this, arguments, void 0, function* (query, topK = 3) {
        var _a;
        try {
            const embeddingResponse = yield model.embedContent(query);
            const queryEmbedding = embeddingResponse.embedding.values;
            if (!queryEmbedding || !Array.isArray(queryEmbedding))
                throw new Error("Invalid query embedding.");
            const response = yield pineconeClient_1.index.namespace("knowledge").query({
                vector: queryEmbedding,
                topK,
                includeMetadata: true,
            });
            const results = (_a = response.matches) === null || _a === void 0 ? void 0 : _a.map((match) => {
                var _a;
                return ({
                    text: (_a = match.metadata) === null || _a === void 0 ? void 0 : _a.text,
                    score: match.score,
                });
            });
            return results;
        }
        catch (error) {
            return [];
        }
    });
}
// Example usage 1
(() => __awaiter(void 0, void 0, void 0, function* () {
    const query = "Who is David Nguyen?";
    const results = yield searchKnowledge(query);
    console.log("🔹 Most relevant results:", results);
}))();
// Example usage 2
(() => __awaiter(void 0, void 0, void 0, function* () {
    const query = "What projects has Son Nguyen worked on?";
    const results = yield searchKnowledge(query, 5);
    console.log("🔹 Most relevant results:", results);
}))();
// Example usage 3
(() => __awaiter(void 0, void 0, void 0, function* () {
    const query = "What are Son Nguyen's skills?";
    const results = yield searchKnowledge(query, 10);
    console.log("🔹 Most relevant results:", results);
}))();
// Example usage 4
(() => __awaiter(void 0, void 0, void 0, function* () {
    const query = "What is Lumina?";
    const results = yield searchKnowledge(query, 1);
    console.log("🔹 Most relevant results:", results);
}))();
