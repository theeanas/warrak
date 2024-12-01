import { PrismaClient } from "@prisma/client"
import { FastifyRequest } from "fastify"

export const BookRepository = {
    async create(prisma: PrismaClient, data: {
    gutenbergId: string
    title: string
    description?: string
    language: string
    author: string
    imageUrl?: string
  }) {
    return prisma.book.create({ data })
  },

  async findByGutenbergId(prisma: PrismaClient, gutenbergId: string) {
    return prisma.book.findUnique({
      where: { gutenbergId },
      include: { chunks: false }
    })
  },

  async findChunksByGutenbergId(prisma: PrismaClient, gutenbergId: string, page: number = -1) {
    return prisma.bookChunk.findMany({
      // if page is -1, return all chunks
      where: { book: { gutenbergId }, order: page === -1 ? undefined : page },
      orderBy: { order: 'asc' }
    })
  }, 

  async findAll(prisma: PrismaClient) {
    return prisma.book.findMany({
      orderBy: { createdAt: 'desc' }
    })
  },

  async exists(request: FastifyRequest, gutenbergId: string) {
    const count = await request.server.prisma.book.count({
      where: { gutenbergId }
    })
    return count > 0
  }
}