import { PrismaClient } from "@prisma/client";

export const BookChunkRepository = {
  async createMany(prisma: PrismaClient, bookId: number, chunks: { text: string; order: number }[]) {
    return prisma.bookChunk.createMany({
      data: chunks.map(chunk => ({
        bookId,
        text: chunk.text,
        order: chunk.order
      }))
    })
  },

  async findByBookId(prisma: PrismaClient, bookId: number) {
    
    return prisma.bookChunk.findMany({
      where: { bookId },
      orderBy: { order: 'asc' }
    })
  },

  async deleteByBookId(prisma: PrismaClient, bookId: number) {
    return prisma.bookChunk.deleteMany({
      where: { bookId }
    })
  }
}