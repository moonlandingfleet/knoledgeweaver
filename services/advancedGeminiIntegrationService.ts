import { GoogleGenerativeAI } from '@google/generative-ai';
import { Source } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Use the newer embedding model
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001"
});

// Use the more capable model for generation
const generationModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash"
});

export interface DocumentEmbedding {
  sourceId: string;
  embeddings: number[];
  metadata: {
    title: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface SemanticSearchResult {
  sourceId: string;
  similarity: number;
  content: string;
  metadata: DocumentEmbedding['metadata'];
}

export class AdvancedGeminiIntegrationService {
  private static instance: AdvancedGeminiIntegrationService;
  private documentEmbeddings: Map<string, DocumentEmbedding[]> = new Map();

  private constructor() {
    this.loadEmbeddings();
  }

  static getInstance(): AdvancedGeminiIntegrationService {
    if (!AdvancedGeminiIntegrationService.instance) {
      AdvancedGeminiIntegrationService.instance = new AdvancedGeminiIntegrationService();
    }
    return AdvancedGeminiIntegrationService.instance;
  }

  /**
   * Generate embeddings for a document
   */
  async generateDocumentEmbeddings(source: Source): Promise<DocumentEmbedding[]> {
    // Check if we already have embeddings for this document
    const existing = this.documentEmbeddings.get(source.id);
    if (existing) {
      return existing;
    }

    // Split document into chunks (simplified for this example)
    const chunks = this.chunkDocument(source.content, 1000);
    
    const embeddings: DocumentEmbedding[] = [];
    
    // Generate embedding for each chunk
    for (let i = 0; i < chunks.length; i++) {
      try {
        const result = await embeddingModel.embedContent(chunks[i]);
        const embeddingData: DocumentEmbedding = {
          sourceId: source.id,
          embeddings: result.embedding.values,
          metadata: {
            title: source.name,
            chunkIndex: i,
            totalChunks: chunks.length
          }
        };
        embeddings.push(embeddingData);
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${i}:`, error);
      }
    }
    
    // Store embeddings for future use
    this.documentEmbeddings.set(source.id, embeddings);
    this.saveEmbeddings();
    
    return embeddings;
  }

  /**
   * Perform semantic search across documents
   */
  async semanticSearch(query: string, sources: Source[], topK: number = 5): Promise<SemanticSearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await embeddingModel.embedContent(query);
    const queryVector = queryEmbedding.embedding.values;
    
    // Collect all document embeddings
    const allEmbeddings: DocumentEmbedding[] = [];
    for (const source of sources) {
      const embeddings = await this.generateDocumentEmbeddings(source);
      allEmbeddings.push(...embeddings);
    }
    
    // Calculate similarities
    const similarities: { embedding: DocumentEmbedding; similarity: number }[] = [];
    
    for (const embedding of allEmbeddings) {
      const similarity = this.cosineSimilarity(queryVector, embedding.embeddings);
      similarities.push({ embedding, similarity });
    }
    
    // Sort by similarity and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Get top K results
    const topResults = similarities.slice(0, topK);
    
    // Map back to search results with content
    const searchResults: SemanticSearchResult[] = [];
    for (const { embedding, similarity } of topResults) {
      const source = sources.find(s => s.id === embedding.sourceId);
      if (source) {
        // Extract the relevant content chunk
        const chunks = this.chunkDocument(source.content, 1000);
        const content = chunks[embedding.metadata.chunkIndex] || '';
        
        searchResults.push({
          sourceId: embedding.sourceId,
          similarity,
          content,
          metadata: embedding.metadata
        });
      }
    }
    
    return searchResults;
  }

  /**
   * Generate content using RAG (Retrieval-Augmented Generation)
   */
  async generateWithRAG(
    query: string,
    sources: Source[],
    personaContext?: string
  ): Promise<string> {
    // First, perform semantic search to retrieve relevant context
    const searchResults = await this.semanticSearch(query, sources, 3);
    
    // Build context from search results
    const context = searchResults.map(result => 
      `Source: ${result.metadata.title}\nContent: ${result.content}`
    ).join('\n\n');
    
    // Generate response using the context
    const prompt = `
${personaContext ? `Context: You are ${personaContext}\n\n` : ''}
Based on the following retrieved documents, answer the query according to your role and expertise:

RETRIEVED DOCUMENTS:
${context}

QUERY: ${query}

Please provide a comprehensive answer that references the relevant documents:
`;

    try {
      const result = await generationModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Failed to generate content with RAG:', error);
      throw new Error('Failed to generate content with RAG');
    }
  }

  /**
   * Split document into chunks
   */
  private chunkDocument(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let position = 0;
    
    while (position < content.length) {
      const chunk = content.substring(position, position + chunkSize);
      chunks.push(chunk);
      position += chunkSize;
    }
    
    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private saveEmbeddings() {
    try {
      const data = JSON.stringify(Array.from(this.documentEmbeddings.entries()));
      localStorage.setItem('knowledge-weaver-document-embeddings', data);
    } catch (error) {
      console.error('Failed to save document embeddings:', error);
    }
  }

  private loadEmbeddings() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-document-embeddings');
      if (stored) {
        const entries = JSON.parse(stored);
        this.documentEmbeddings = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load document embeddings:', error);
      this.documentEmbeddings = new Map();
    }
  }

  clearEmbeddings() {
    this.documentEmbeddings.clear();
    localStorage.removeItem('knowledge-weaver-document-embeddings');
  }
}