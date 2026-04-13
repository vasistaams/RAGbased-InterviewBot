/**
 * ============================================
 *  OpenAI Integration Service (Bonus)
 * ============================================
 * 
 * This module provides a drop-in replacement for the keyword-based
 * retriever. It uses OpenAI's API to generate more natural,
 * context-aware responses using true RAG (Retrieval-Augmented Generation).
 * 
 * SETUP:
 *   1. Get an API key from https://platform.openai.com/api-keys
 *   2. Create a .env file in project root with: OPENAI_API_KEY=sk-...
 *   3. In server.js, switch retriever to this module
 * 
 * VECTOR DB UPGRADE PATH:
 *   For production, replace the keyword retrieval with:
 *   - Pinecone (cloud-hosted vector database)
 *   - ChromaDB (open-source, runs locally)
 *   - Weaviate (open-source, Kubernetes-friendly)
 * 
 *   Flow: User Query → Embed Query → Search Vector DB → Get Top-K → 
 *         Inject into LLM Prompt → Generate Answer
 */

// Uncomment these when ready to use:
// const { OpenAI } = require('openai');
// const retriever = require('./retriever');

/**
 * Example: Initialize OpenAI client
 * 
 * const openai = new OpenAI({
 *   apiKey: process.env.OPENAI_API_KEY
 * });
 */

/**
 * RAG-enhanced answer generation using OpenAI.
 * 
 * Steps:
 *   1. Retrieve relevant context from knowledge base (Retrieval)
 *   2. Augment the prompt with retrieved context (Augmentation)
 *   3. Generate response using LLM (Generation)
 * 
 * @param {string} query - User's question
 * @returns {object} - { answer, source, model }
 */
async function generateRAGResponse(query) {
  // Step 1: RETRIEVE — Get relevant context from knowledge base
  // const retriever = require('./retriever');
  // const context = retriever.retrieve(query);

  // Step 2: AUGMENT — Build prompt with context
  // const systemPrompt = `You are an expert interview preparation assistant. 
  // Use the following context to answer the user's question. 
  // If the context is relevant, base your answer on it. 
  // If not, provide a helpful answer from your knowledge.
  // Keep answers structured with bullet points and examples.
  // 
  // Context from knowledge base:
  // ${context.found ? context.answer : 'No specific context found.'}`;

  // Step 3: GENERATE — Call OpenAI API
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-3.5-turbo',
  //   messages: [
  //     { role: 'system', content: systemPrompt },
  //     { role: 'user', content: query }
  //   ],
  //   max_tokens: 1000,
  //   temperature: 0.7
  // });

  // return {
  //   answer: completion.choices[0].message.content,
  //   source: context.found ? 'knowledge_base + openai' : 'openai',
  //   model: 'gpt-3.5-turbo',
  //   tokens_used: completion.usage.total_tokens
  // };

  // Placeholder until OpenAI is configured
  return {
    answer: 'OpenAI integration is not yet configured. Please set OPENAI_API_KEY in .env file.',
    source: 'placeholder',
    model: 'none'
  };
}

/**
 * Generate embeddings for vector database integration.
 * 
 * Use this to convert the knowledge base entries into vectors
 * for semantic search instead of keyword matching.
 * 
 * @param {string} text - Text to embed
 * @returns {number[]} - Embedding vector
 */
async function generateEmbedding(text) {
  // const response = await openai.embeddings.create({
  //   model: 'text-embedding-ada-002',
  //   input: text
  // });
  // return response.data[0].embedding;

  console.log('⚠️ Embedding generation requires OpenAI API key.');
  return [];
}

/**
 * Vector Database Integration Blueprint
 * 
 * // Using Pinecone:
 * // const { PineconeClient } = require('@pinecone-database/pinecone');
 * // const pinecone = new PineconeClient();
 * // await pinecone.init({ apiKey: process.env.PINECONE_API_KEY });
 * // const index = pinecone.Index('interview-kb');
 * 
 * // Upsert knowledge base:
 * // for (const entry of knowledgeBase.entries) {
 * //   const embedding = await generateEmbedding(entry.question + ' ' + entry.answer);
 * //   await index.upsert([{ id: String(entry.id), values: embedding, metadata: entry }]);
 * // }
 * 
 * // Query:
 * // const queryEmbedding = await generateEmbedding(userQuery);
 * // const results = await index.query({ vector: queryEmbedding, topK: 3 });
 */

module.exports = {
  generateRAGResponse,
  generateEmbedding
};
