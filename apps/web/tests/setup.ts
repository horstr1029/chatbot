// Suppress Prisma / Redis / Qdrant connection noise in test output
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.QDRANT_URL = 'http://localhost:6333'
process.env.ANTHROPIC_API_KEY = 'test-key'
process.env.OPENAI_API_KEY = 'test-key'
process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
