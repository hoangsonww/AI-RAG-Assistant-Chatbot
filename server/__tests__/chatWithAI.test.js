/**
 * ✔️  chatWithAI returns text and stitches Pinecone context
 */
process.env.GOOGLE_AI_API_KEY = 'FAKE'
process.env.AI_INSTRUCTIONS   = ''

/* mock knowledge search helper */
const pineconeSpy = jest.fn().mockResolvedValue([{ text: 'fact-1', score: 0.9 }])
jest.mock('../../scripts/queryKnowledge', () => ({
  searchKnowledge: pineconeSpy
}))

/* mock Google Generative AI SDK  */
const sendSpy = jest.fn().mockResolvedValue({ response: { text: 'hello-ai' } })
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      startChat: () => ({ sendMessage: sendSpy })
    })
  })),
  HarmCategory: { HARM_CATEGORY_HARASSMENT:0, HARM_CATEGORY_HATE_SPEECH:1,
                  HARM_CATEGORY_SEXUALLY_EXPLICIT:2, HARM_CATEGORY_DANGEROUS_CONTENT:3 },
  HarmBlockThreshold: { BLOCK_NONE:0 }
}))

const { chatWithAI } = require('../../services/chatWithAI')

it('passes through AI response text', async () => {
  const txt = await chatWithAI([], 'Hi there!')
  expect(txt).toBe('hello-ai')
  expect(pineconeSpy).toHaveBeenCalledWith('Hi there!', 3)
  expect(sendSpy).toHaveBeenCalled()
})
