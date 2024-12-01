# Project Sarj Books

- A live version of the website is hosted on [Railway](https://warrak-production.up.railway.app/)

- [API Documentation](http://localhost:5050/api-docs) 

- Stack:
    - Backend: [Fastify](https://www.fastify.io/)
    - Database: Postgres hosted on [Supabase](https://supabase.com/)
    - ORM: [Prisma](https://www.prisma.io/)
    - LLM Provider: [Groq](https://www.groq.com/)
    - Frontend: Server-side rendered with [Pug](https://pugjs.org/) for a template engine, and [Bootstrap](https://getbootstrap.com/) for styling.


## Technical Decisions:
- The biggest decision I made was probably NOT using a word embedding model to vectorize the books content.
    - The reason was development time ... I didn't get as much time as I hoped to implement this project.
    - I am not sure if it'd have taken longer, but it's not something I worked on before, so I didn't want to risk spending time on that.

### Chunking Sizes
- Since I don't use a word embedding model, I had to chunk the books content in a way that fits the LLM context window.
- As per Openai tokenizer: 100 tokens ~= 75 words.
- Model context window = 8192 tokens
- We gotta reserve 200 tokens for the prompt and 500 tokens for the output
- That leaves us with 7442 tokens for the content
- 7442 tokens ~= 5582 words ~= 26K characters, assuming average word length of 4.7 characters
- I know we're using Llama 3, but for our purposes, it's safe to assume the tokenizer is similar to GPT-4o.

### Book metadata
- I am lazyliy, and somewhat reasonably, assuming books metadata don't change, so if a book exists in our DB, I don't bother to fetch/update it from Gutenberg.

### Storage
- Maybe should've stored books on a storage bucket (S3), but I'm lazy.
    - To be fair tho, storing them in our DB as chunks does have the mertis of faster queries and 1 storage system.

Things I am skipping:
- Tests
- Authentication
- Authorization
- API Schema IN & OUT validation
- Error handling
- Rate limiting
- Metrics
- Logging
- Health checks
- Caching
Yeah I know that's a lot of things to skip, but it's an assessment project XD.