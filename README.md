# Project Sarj Books

- ###[API Documentation](http://localhost:5050/api-docs) 

## Assumptions:
### Tokenizer
- As per Openai tokenizer: 100 tokens ~= 75 words.
- Model context window = 8192 tokens
- We gotta reserve 200 tokens for the prompt and 500 tokens for the output
- That leaves us with 7442 tokens for the content
- 7442 tokens ~= 5582 words ~= 26K characters, assuming average word length of 4.7 characters
- I know we're using Llama 3, but for our purposes, it's safe to assume the tokenizer is similar to GPT-4o.

### Book metadata
- I am lazyliy assuming books metadata don't change, so if a book exists in our DB, I don't bother to fetch/update it from Gutenberg.

Todo:


Things I am skipping:
- Tests
- Authentication
- Authorization
- Schema API IN/OUT validation
- Error handling
- Rate limiting
- Metrics
- Logging
- Health checks
- Caching