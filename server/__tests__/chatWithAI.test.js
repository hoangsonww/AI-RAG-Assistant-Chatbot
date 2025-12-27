/**
 * ✔️  chatWithAI returns text and stitches Pinecone context
 */
process.env.GOOGLE_AI_API_KEY = "FAKE";
/* mock knowledge retrieval helper */
const retrieveSpy = jest.fn().mockResolvedValue([
  {
    id: "source-1",
    snippet: "fact-1",
    title: "Profile",
  },
]);
jest.mock("../src/services/knowledgeBase", () => ({
  retrieveKnowledgeChunks: retrieveSpy,
}));

/* mock Google Generative AI SDK  */
const sendSpy = jest.fn().mockResolvedValue({ response: { text: "hello-ai" } });
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      startChat: () => ({ sendMessage: sendSpy }),
    }),
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 0,
    HARM_CATEGORY_HATE_SPEECH: 1,
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 2,
    HARM_CATEGORY_DANGEROUS_CONTENT: 3,
  },
  HarmBlockThreshold: { BLOCK_NONE: 0 },
}));

const { chatWithAI } = require("../src/services/geminiService");

it("passes through AI response text", async () => {
  const result = await chatWithAI([], "Hi there!");
  expect(result.text).toBe("hello-ai");
  expect(retrieveSpy).toHaveBeenCalled();
  expect(sendSpy).toHaveBeenCalled();
});
