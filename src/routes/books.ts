import { FastifyInstance, FastifyRequest } from 'fastify'
import { BookRepository } from '../queries/book'
import { BookChunkRepository } from '../queries/book_chunk'
import { fetchGutenbergBookMetadata, parseGutenbergBookAndSaveChunks, parseGutenbergBookMetadata } from '../services/gutenberg'

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
      console.timeEnd('parseGutenbergBookAndSaveChunks')
    }
    return bookInDb || bookInGutenberg
  })

  // pages are like chunks
  // take a query param for page
  fastify.get('/:gutenbergId/book-content', { 
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { page: number }
  }>, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    const { page } = request.query

    const chunk = await BookRepository.findByGutenbergIdWithChunks(request.server.prisma, gutenbergId, page)
    if (!chunk) {
      return reply.code(404).send({ error: 'page not found' })
    }
    return reply.send(chunk)
  })
}
