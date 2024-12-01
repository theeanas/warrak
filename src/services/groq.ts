import axios from 'axios';

interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeBaseRequest<T>(messages: GroqMessage[], streaming: boolean): Promise<T> {
    const systemMessage: GroqMessage = {
      role: 'system',
      // To make it boring. Sorry!
      content: 'You are a helpful assistant that only discusses books related topics.'
    };

    try {
      const response = await axios.post<T>(
        this.baseUrl,
        {
          model: 'llama3-8b-8192',
          messages: [systemMessage, ...messages],
          stream: streaming,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          ...(streaming && { responseType: 'stream' })
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Groq API error: ${error.message}`);
      }
      throw new Error('Groq API error: unknown error');
    }
  }

  private async makeRequest(messages: GroqMessage[]): Promise<ReadableStream> {
    return this.makeBaseRequest<ReadableStream>(messages, true);
  }

  private async makeRequestNonStream(messages: GroqMessage[]): Promise<string> {
    const response = await this.makeBaseRequest<GroqResponse>(messages, false);
    return response.choices[0].message.content;
  }

  async generateChunkSummary(bookText: string): Promise<string> {
    const prompt = `Provide a summary of the following part of a book, be very concise and very thorough:\n\n${bookText}`;
    return this.makeRequestNonStream([{ role: 'user', content: prompt }]);
  }

  async identifyKeyCharacters(bookText: string): Promise<ReadableStream> {
    const prompt = `Analyze the following text and identify the key characters. For each character, provide their name, personality concisely, and a very brief description of their role in the story:\n\n${bookText}`;
    return this.makeRequest([{ role: 'user', content: prompt }]);
  }

  async detectLanguage(bookText: string): Promise<ReadableStream> {
    const prompt = `Analyze the following text and identify the language it's written in. If possible, also mention any distinct linguistic features or dialects:\n\n${bookText}`;
    return this.makeRequest([{ role: 'user', content: prompt }]);
  }

  async generatePlotSummary(bookText: string): Promise<ReadableStream> {
    const prompt = `Provide a concise summary of the following text, highlighting the main plot points and key events:\n\n${bookText}`;
    return this.makeRequest([{ role: 'user', content: prompt }]);
  }
}

export const groq = new GroqService(process.env.GROQ_API_KEY!);
