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

  private async makeRequest(messages: GroqMessage[]): Promise<ReadableStream> {
    // To make it boring. Sorry!
    const systemMessage: GroqMessage = {
      role: 'system',
      content: 'You are a helpful assistant that only discusses books related topics.'
    };

    try {
      const response = await axios.post<ReadableStream>(
        this.baseUrl,
        {
          model: 'llama3-8b-8192',
          messages: [systemMessage, ...messages],
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          responseType: 'stream'
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Groq API error: ${error.message}`);
      } else {
        throw new Error('Groq API error: unknown error');
      }
    }
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
    const prompt = `Please provide a concise summary of the following text, highlighting the main plot points and key events:\n\n${bookText}`;
    return this.makeRequest([{ role: 'user', content: prompt }]);
  }
}

export const groq = new GroqService(process.env.GROQ_API_KEY!);
