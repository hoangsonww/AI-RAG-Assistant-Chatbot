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
exports.answerWithRAG = answerWithRAG;
const pineconeClient_1 = require("../services/pineconeClient");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const pinecone_1 = require("langchain/vectorstores/pinecone");
const chains_1 = require("langchain/chains");
const prompts_1 = require("langchain/prompts");
dotenv_1.default.config();
class GoogleEmbeddings {
    constructor() {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.modelName = "models/text-embedding-004";
    }
    embedDocuments(texts) {
        return __awaiter(this, void 0, void 0, function* () {
            const responses = yield Promise.all(texts.map((t) => this.genAI
                .getGenerativeModel({ model: this.modelName })
                .embedContent(t)));
            return responses.map((r) => r.embedding.values);
        });
    }
    embedQuery(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.genAI
                .getGenerativeModel({ model: this.modelName })
                .embedContent(text);
            return r.embedding.values;
        });
    }
}
let ragChain = null;
/**
 * Lazy-initialize the RAG chain on first call.
 */
function getRagChain() {
    return __awaiter(this, void 0, void 0, function* () {
        if (ragChain)
            return ragChain;
        // 1. Create a Pinecone-backed vector store
        const embeddings = new GoogleEmbeddings();
        const vectorStore = yield pinecone_1.PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: pineconeClient_1.index,
            namespace: "knowledge",
            textKey: "text",
        });
        // 2. Build a retriever
        const retriever = vectorStore.asRetriever({
            topK: 4,
            fetchMetadata: true,
        });
        // 3. Initialize the LLM
        const llm = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY).getGenerativeModel({
            model: "models/text-bison-001",
        });
        // 4. Prompt template
        const prompt = new prompts_1.PromptTemplate({
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
        ragChain = chains_1.RetrievalQAChain.fromLLM(llm, retriever, {
            prompt,
            returnSourceDocuments: true,
        });
        return ragChain;
    });
}
/**
 * Answer a question using the RAG chain.
 *
 * @param userQuestion - The user’s query
 */
function answerWithRAG(userQuestion) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const chain = yield getRagChain();
        const res = yield chain.call({ question: userQuestion });
        const sources = ((_a = res.sourceDocuments) !== null && _a !== void 0 ? _a : []).map((doc, i) => {
            var _a, _b, _c;
            return ({
                id: (_b = (_a = doc.metadata) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : i,
                snippet: doc.pageContent,
                score: (_c = doc.score) !== null && _c !== void 0 ? _c : 0,
            });
        });
        return {
            answer: res.text,
            sources,
        };
    });
}
