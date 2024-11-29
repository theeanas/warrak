import Fastify from 'fastify'
import view from '@fastify/view'
import path from 'path'
import { bookRoutes } from './routes/books'
import prisma from './plugins/prisma'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const fastify = Fastify({
  logger: true
})

// Register Swagger
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'Project Sarj Books API',
      description: 'API documentation for Project Sarj Books',
      version: '1.0.0'
    },
    host: 'localhost:5050',
    schemes: ['http'],
    consumes: ['text/html', 'application/json'],
    produces: ['text/html', 'application/json'],
  }
})

fastify.register(swaggerUi, {
  routePrefix: '/api-docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
})

// Register plugins
fastify.register(prisma)

// Register routes
fastify.register(bookRoutes, { prefix: 'api/books', tags: ['books'] } )

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
    return reply.view('index.pug')
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