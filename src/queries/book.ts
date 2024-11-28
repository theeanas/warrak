import { PrismaClient } from "@prisma/client"
import { FastifyRequest } from "fastify"

export const BookRepository = {
    async create(prisma: PrismaClient, data: {
    gutenbergId: string
    title: string
    description?: string
    language: string
    author: string
  }) {
    return prisma.book.create({ data })
  },

  async findByGutenbergId(prisma: PrismaClient, gutenbergId: string) {
    return prisma.book.findUnique({
      where: { gutenbergId },
      include: { chunks: true }
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