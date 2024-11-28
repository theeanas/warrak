import { FastifyInstance } from 'fastify'
import { BookRepository } from '../queries/book'
    import { BookChunkRepository } from '../queries/book_chunk'

export async function bookRoutes(fastify: FastifyInstance) {
  // Get all books
  fastify.get('/books', async (request) => {
    return BookRepository.findAll(request.server.prisma)
  })

  // Get book by Gutenberg ID
  fastify.get('/books/:gutenbergId', async (request, reply) => {
    const { gutenbergId } = request.params as { gutenbergId: string }
    const book = await BookRepository.findByGutenbergId(request.server.prisma, gutenbergId)
    
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' })
    }
    
    return book
  })

  // Create new book with chunks
  fastify.post('/books', async (request, reply) => {
    const { book, chunks } = request.body as any
    
    const exists = await BookRepository.exists(request, book.gutenbergId)
    if (exists) {
      return reply.code(409).send({ error: 'Book already exists' })
    }

    const newBook = await BookRepository.create(request.server.prisma, book)
    await BookChunkRepository.createMany(request.server.prisma, newBook.id, chunks)

    return newBook
  })
}