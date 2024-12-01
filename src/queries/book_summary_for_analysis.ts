import { PrismaClient } from '@prisma/client'

export const BookSummaryForAnalysisRepository = {
  create: async (prisma: PrismaClient, data: { bookId: number; summary: string }) => {
    return prisma.bookSummaryForAnalysis.create({
      data
    })
  },

  findByGutenbergId: async (prisma: PrismaClient, gutenbergId: string) => {
    return prisma.bookSummaryForAnalysis.findFirst({
        where: { book: { gutenbergId } }
    })
  },

  // add a query to insert a summary for a book
  insertSummaryForBook: async (prisma: PrismaClient, gutenbergId: string, summary: string) => {
    return prisma.bookSummaryForAnalysis.create({
      data: { book: { connect: { gutenbergId } }, summary }
    })
  }
}