import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GutenbergMetadata {
  title: string;
  author: string;
  description: string;
  language: string;
  imageUrl?: string;
}

export async function parseGutenbergBookMetadata(html: string): Promise<GutenbergMetadata> {
  const $ = cheerio.load(html);
  
  // Extract basic metadata
  const imageUrl = $('#cover .cover-art').attr('src');
  const title = $('.bibrec tr:has(th:contains("Title")) td').text().trim();
  const author = $('.bibrec tr:has(th:contains("Author")) td a').first().text().trim();
  const language = $('.bibrec tr:has(th:contains("Language")) td').text().trim();
  const description = $('.bibrec tr:has(th:contains("Summary")) td').text().trim();
  
  return {
    title,
    author,
    description,
    language,
    imageUrl
  };
}

export async function fetchGutenbergBookMetadata(bookId: string) {
  const metadataUrl = `https://www.gutenberg.org/ebooks/${bookId}`;

  const metadataResponse = await fetch(metadataUrl);
  const metadataHtml = await metadataResponse.text();
  return {
    status: metadataResponse.status,
    html: metadataHtml
  };
}

export async function fetchGutenbergBookContent(bookId: string) {
  const contentUrl = `https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`;
  const contentResponse = await fetch(contentUrl);
  const content = await contentResponse.text();
  return {content, status: contentResponse.status}; // Encapsulate in an object to have it returned by reference; it's a book ... a lot of bytes!
}

export async function parseGutenbergBookToChunks(book: any) {
  try {
    const { content, status } = await fetchGutenbergBookContent(book.gutenbergId)
    if (status !== 200) {
      throw new Error(`Failed to fetch book content for ${book.gutenbergId}: ${status}`)
    }

    const chunkSize = 26000; // characters per chunk, refer to the README for the why.

    // Split content into paragraphs first
    const paragraphs = content.split(/\n\s*\n/);
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed our target size
      if ((currentChunk + paragraph).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.map((text, index) => ({
      bookId: book.id,
      text,
      order: index + 1,
    }));

  } catch (error) {
    console.error(`Error chunking and saving book content ${book.gutenbergId}:`, error);
     throw error;
  }
}
