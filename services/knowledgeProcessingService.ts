import { Source, Persona } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalyticsService } from './analyticsService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface KnowledgeRelationship {
  sourceId: string;
  targetId: string;
  relationshipType: 'supports' | 'contradicts' | 'expands' | 'references';
  strength: number; // 0-100
  description: string;
}

export interface ProcessedKnowledge {
  id: string;
  content: string;
  summary: string;
  keyConcepts: string[];
  relationships: KnowledgeRelationship[];
  qualityScore: number; // 0-100
  lastProcessed: string;
}

export class KnowledgeProcessingService {
  private static instance: KnowledgeProcessingService;
  private processedKnowledge: Map<string, ProcessedKnowledge> = new Map();
  private analyticsService: AnalyticsService;

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.loadProcessedKnowledge();
  }

  static getInstance(): KnowledgeProcessingService {
    if (!KnowledgeProcessingService.instance) {
      KnowledgeProcessingService.instance = new KnowledgeProcessingService();
    }
    return KnowledgeProcessingService.instance;
  }

  async processSource(source: Source): Promise<ProcessedKnowledge> {
    const existing = this.processedKnowledge.get(source.id);
    if (existing && existing.lastProcessed > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) {
      // Return cached result if processed within last 24 hours
      return existing;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Generate summary
    const summaryPrompt = `Please provide a concise summary (2-3 sentences) of the following document:
    
${source.content}

Summary:`;

    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text().trim();

    // Extract key concepts
    const conceptsPrompt = `Extract 5-10 key concepts from the following document as a JSON array of strings:
    
${source.content}

Return ONLY a JSON array like: ["concept1", "concept2", ...]`;

    const conceptsResult = await model.generateContent(conceptsPrompt);
    let keyConcepts: string[] = [];
    try {
      const conceptsText = conceptsResult.response.text();
      const jsonMatch = conceptsText.match(/\[.*\]/s);
      if (jsonMatch) {
        keyConcepts = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse key concepts:', error);
    }

    // Assess quality
    const qualityPrompt = `Rate the quality of this document on a scale of 1-100 based on:
1. Clarity and organization
2. Factual accuracy
3. Depth of information
4. Relevance to typical research needs

Document:
${source.content}

Respond with ONLY a number between 1-100:`;

    const qualityResult = await model.generateContent(qualityPrompt);
    let qualityScore = 50;
    try {
      qualityScore = parseInt(qualityResult.response.text().trim()) || 50;
    } catch (error) {
      console.error('Failed to parse quality score:', error);
    }

    const processed: ProcessedKnowledge = {
      id: source.id,
      content: source.content,
      summary,
      keyConcepts,
      relationships: [],
      qualityScore,
      lastProcessed: new Date().toISOString()
    };

    this.processedKnowledge.set(source.id, processed);
    this.saveProcessedKnowledge();
    
    this.analyticsService.trackEvent({
      type: 'file_uploaded',
      timestamp: new Date().toISOString(),
      metadata: {
        sourceId: source.id,
        sourceName: source.name,
        qualityScore,
        contentLength: source.content.length
      }
    });

    return processed;
  }

  async analyzeRelationships(sources: Source[]): Promise<KnowledgeRelationship[]> {
    if (sources.length < 2) return [];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Compare each pair of sources
    const relationships: KnowledgeRelationship[] = [];
    
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const sourceA = sources[i];
        const sourceB = sources[j];
        
        const relationshipPrompt = `Analyze the relationship between these two documents:
        
Document A (${sourceA.name}):
${sourceA.content.substring(0, 500)}...

Document B (${sourceB.name}):
${sourceB.content.substring(0, 500)}...

Determine if Document A:
1. SUPPORTS Document B (they align or reinforce each other)
2. CONTRADICTS Document B (they conflict or oppose each other)
3. EXPANDS Document B (it adds detail or depth to it)
4. REFERENCES Document B (it cites or mentions it)

Respond with ONLY a JSON object in this format:
{
  "relationshipType": "supports|contradicts|expands|references",
  "strength": 1-100,
  "description": "brief explanation"
}`;

        try {
          const relationshipResult = await model.generateContent(relationshipPrompt);
          const relationshipText = relationshipResult.response.text();
          const jsonMatch = relationshipText.match(/\{.*\}/s);
          
          if (jsonMatch) {
            const relationshipData = JSON.parse(jsonMatch[0]);
            relationships.push({
              sourceId: sourceA.id,
              targetId: sourceB.id,
              relationshipType: relationshipData.relationshipType,
              strength: relationshipData.strength,
              description: relationshipData.description
            });
          }
        } catch (error) {
          console.error('Failed to analyze relationship:', error);
        }
      }
    }
    
    return relationships;
  }

  getProcessedKnowledge(sourceId: string): ProcessedKnowledge | undefined {
    return this.processedKnowledge.get(sourceId);
  }

  getAllProcessedKnowledge(): ProcessedKnowledge[] {
    return Array.from(this.processedKnowledge.values());
  }

  getKnowledgeQualityStats(): { 
    avgQuality: number; 
    highQualityCount: number; 
    totalSources: number;
    qualityDistribution: Record<string, number>;
  } {
    const allKnowledge = this.getAllProcessedKnowledge();
    
    if (allKnowledge.length === 0) {
      return {
        avgQuality: 0,
        highQualityCount: 0,
        totalSources: 0,
        qualityDistribution: {}
      };
    }

    const totalQuality = allKnowledge.reduce((sum, k) => sum + k.qualityScore, 0);
    const avgQuality = totalQuality / allKnowledge.length;
    
    const highQualityCount = allKnowledge.filter(k => k.qualityScore >= 80).length;
    
    // Calculate quality distribution
    const qualityDistribution: Record<string, number> = {
      'high': allKnowledge.filter(k => k.qualityScore >= 80).length,
      'medium': allKnowledge.filter(k => k.qualityScore >= 50 && k.qualityScore < 80).length,
      'low': allKnowledge.filter(k => k.qualityScore < 50).length
    };

    return {
      avgQuality,
      highQualityCount,
      totalSources: allKnowledge.length,
      qualityDistribution
    };
  }

  private saveProcessedKnowledge() {
    try {
      const data = JSON.stringify(Array.from(this.processedKnowledge.entries()));
      localStorage.setItem('knowledge-weaver-processed-knowledge', data);
    } catch (error) {
      console.error('Failed to save processed knowledge:', error);
    }
  }

  private loadProcessedKnowledge() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-processed-knowledge');
      if (stored) {
        const entries = JSON.parse(stored);
        this.processedKnowledge = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load processed knowledge:', error);
      this.processedKnowledge = new Map();
    }
  }

  clearProcessedKnowledge() {
    this.processedKnowledge.clear();
    localStorage.removeItem('knowledge-weaver-processed-knowledge');
  }
}