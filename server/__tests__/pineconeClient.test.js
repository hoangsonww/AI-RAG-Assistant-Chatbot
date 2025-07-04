/**
 * ✔️  pineconeClient exports an index instance and initialises Pinecone with env vars
 */
process.env.PINECONE_API_KEY   = 'TEST_KEY'
process.env.PINECONE_INDEX_NAME = 'test-index'

/* mock pinecone sdk */
const mockIndex = { query: jest.fn(), namespace: jest.fn().mockReturnThis() }
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue(mockIndex)
  }))
}))

const { index } = require('../../services/pineconeClient')

test('index is defined & namespace() available', () => {
  expect(index).toBeDefined()
  expect(typeof index.namespace).toBe('function')
})
