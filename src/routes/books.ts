import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BookRepository } from '../queries/book'
import { BookChunkRepository } from '../queries/book_chunk'
import { BookSummaryForAnalysisRepository } from '../queries/book_summary_for_analysis'
import { fetchGutenbergBookMetadata, parseGutenbergBookToChunks, parseGutenbergBookMetadata } from '../services/gutenberg'
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
    let book
    if (!bookInDb && bookInGutenberg.status !== 200) {
      return reply.code(404).send({ error: 'Book not found' })
    }
    else if (!bookInDb) {
      // save book in our db
      const metadata = await parseGutenbergBookMetadata(bookInGutenberg.html)
      book = await BookRepository.create(request.server.prisma, {
        gutenbergId,
        ...metadata
      })

      // Todo: This is slow and could be async, but we'd ensure it succeeds
      const chunks = await parseGutenbergBookToChunks(book)
      await BookChunkRepository.createMany(request.server.prisma, book.id, chunks)
    }
    return book
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
    const page = request.query.page === undefined ? -1 : request.query.page

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

  try {
    const bookSummary = await BookSummaryForAnalysisRepository.findByGutenbergId(request.server.prisma, gutenbergId)
    let summary: string;
    if (!bookSummary) {
      const bookChunks = await BookRepository.findChunksByGutenbergId(request.server.prisma, gutenbergId)
      if (bookChunks.length === 0) {
        return reply.code(404).send({ error: 'Book content not found, please fetch the book first' })
      }

      // Note: This won't work for long books, as summaries themselves may be long.
      const summaries = await Promise.all(bookChunks.map(chunk => groq.generatePlotSummary(chunk.text)))
      summary = summaries.join('\n')

      BookSummaryForAnalysisRepository.insertSummaryForBook(request.server.prisma, gutenbergId, summary)
    }
    else {
      summary = bookSummary.summary
    }
    
    // just reply normally, no streaming
    reply.send({ content: await analyzeFunction(summary) })
  } catch (error) {
    console.error(error) // usually it's rate limit exceeded ... free tier XD.
    reply.code(500).send({ error: 'Analysis failed' })
  }
}
