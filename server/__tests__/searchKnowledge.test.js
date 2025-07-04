/**
 * ✔️  searchKnowledge maps Pinecone matches & handles errors
 */
process.env.GOOGLE_AI_API_KEY = 'FAKE'

/* fake embedding model */
const embedSpy = jest.fn().mockResolvedValue({ embedding: { values: [0.1,0.2] } })
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ embedContent: embedSpy })
  }))
}))

/* fake pinecone index */
const querySpy = jest.fn().mockResolvedValue({
  matches: [{ metadata:{ text:'foo' }, score:0.98 }]
})
jest.mock('../../services/pineconeClient', () => ({
  index: { namespace: () => ({ query: querySpy }) }
}))

const { searchKnowledge } = require('../../scripts/queryKnowledge')

it('returns mapped results from pinecone', async () => {
  const res = await searchKnowledge('foo?', 1)
  expect(res).toEqual([{ text:'foo', score:0.98 }])
  expect(embedSpy).toHaveBeenCalled()
  expect(querySpy).toHaveBeenCalled()
})

it('returns [] if embedding throws', async () => {
  embedSpy.mockRejectedValueOnce(new Error('fail'))
  const res = await searchKnowledge('bar?', 1)
  expect(res).toEqual([])
})
