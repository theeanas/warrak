import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BookRepository } from '../queries/book'
import { BookChunkRepository } from '../queries/book_chunk'
import { fetchGutenbergBookMetadata, parseGutenbergBookAndSaveChunks, parseGutenbergBookMetadata } from '../services/gutenberg'
import { groq } from '../services/groq'

export async function bookRoutes(fastify: FastifyInstance) {
  // Get all books
  fastify.get('', async (request) => {
    return BookRepository.findAll(request.server.prisma)
  })

  // Get book by Gutenberg ID
  fastify.get('/:gutenbergId', async (request, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    // make 2 concurrent requests, one to our db and the other to gutenberg.org
    const [bookInDb, bookInGutenberg] = await Promise.all([    
      BookRepository.findByGutenbergId(request.server.prisma, gutenbergId),
      fetchGutenbergBookMetadata(gutenbergId)
    ])
    
    if (!bookInDb && bookInGutenberg.status !== 200) {
      return reply.code(404).send({ error: 'Book not found' })
    }
    else if (!bookInDb) {
      // save book in our db
      const metadata = await parseGutenbergBookMetadata(bookInGutenberg.html)
      const book = await BookRepository.create(request.server.prisma, {
        gutenbergId,
        title: metadata.title,
        author: metadata.author,
        language: metadata.language,
        description: metadata.description   
      })
      // Todo: This is slow and could be async, but we'd ensure it succeeds
      console.time('parseGutenbergBookAndSaveChunks')
      await parseGutenbergBookAndSaveChunks(book)
      // now trigger a background job to summarize the book so it fits in an llm context window
      // TODO: await summarizeBookForLLM(book.id)
      console.timeEnd('parseGutenbergBookAndSaveChunks')
    }
    return bookInDb || bookInGutenberg
  })

  fastify.get('/:gutenbergId/content', { 
    schema: {
      querystring: {
        type: 'object',
        properties: {
          // pages are basically chunks
          page: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { page: number }
  }>, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    const { page } = request.query

    const bookChunks = await BookRepository.findChunksByGutenbergId(request.server.prisma, gutenbergId, page)
    if (!bookChunks) {
      return reply.code(404).send({ error: 'page not found' })
    }
    return reply.send(bookChunks)
  })


  fastify.get('/:gutenbergId/analyze/characters', async (request, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    return streamAnalysis(request, reply, gutenbergId, (text) => groq.identifyKeyCharacters(text))
  })

  fastify.get('/:gutenbergId/analyze/language', async (request, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    return streamAnalysis(request, reply, gutenbergId, (text) => groq.detectLanguage(text))
  })

  fastify.get('/:gutenbergId/analyze/summary', async (request, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    return streamAnalysis(request, reply, gutenbergId, (text) => groq.generatePlotSummary(text))
  })
}

// Helper function to stream analysis results
async function streamAnalysis(
  request: FastifyRequest,
  reply: FastifyReply,
  gutenbergId: string, 
  analyzeFunction: (text: string) => Promise<string>
) {
  const bookChunks = await BookRepository.findChunksByGutenbergId(request.server.prisma, gutenbergId)
  
  if (!bookChunks) {
    return reply.code(404).send({ error: 'Book not found' })
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  try {
    const bookText = bookChunks.map(chunk => chunk.text).join('\n')
    const result = await analyzeFunction(bookText)
    reply.raw.write(`data: ${JSON.stringify({ content: result })}\n\n`)
  } catch (error) {
    reply.raw.write(`data: ${JSON.stringify({ error: 'Analysis failed' })}\n\n`)
  }
  reply.raw.end()
}