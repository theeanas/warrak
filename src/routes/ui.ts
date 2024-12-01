import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BookRepository } from '../queries/book';


export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return reply.view('index.pug')
  })

  fastify.get('/books/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const book = await BookRepository.findByGutenbergId(request.server.prisma, id);
      
      if (!book) {
        return reply.code(404).send({ error: 'Book not found' });
      }
      
      return reply.view('book_details.pug', { book });
    } catch (error) {
      console.error('Error fetching book details:', error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  })
}