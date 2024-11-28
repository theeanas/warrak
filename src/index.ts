import Fastify from 'fastify'
import view from '@fastify/view'
import path from 'path'

const fastify = Fastify({
  logger: true
})

// Register template engine
fastify.register(view, {
  engine: {
    pug: require('pug')
  },
  root: path.join(__dirname, 'views'),
  defaultContext: {
    title: 'Project Sarj Books'
  }
})

// Basic route
fastify.get('/', async (request, reply) => {
    return reply.send({message: 'Welcome to Project Sarj Books.'})
})

// Start the server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 5050
    const host = process.env.FASTIFY_ADDRESS || '0.0.0.0'
    await fastify.listen({ port, host })
    console.log(`Server running at http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()