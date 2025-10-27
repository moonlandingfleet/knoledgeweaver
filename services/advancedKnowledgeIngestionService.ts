import { Source, Persona } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { KnowledgeProcessingService, ProcessedKnowledge, KnowledgeRelationship } from './knowledgeProcessingService';
import { AnalyticsService } from './analyticsService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface AdvancedProcessedKnowledge extends ProcessedKnowledge {
  // Extended with more detailed analysis
  keyPoints: {
    id: string;
    content: string;
    relevance: number; // 0-100
    category: string;
  }[];
  pathways: {
    id: string;
    title: string;
    content: string;
    connections: string[]; // IDs of related key points
  }[];
  moralCompassIndicators: {
    theme: string;
    alignment: number; // -100 to 100 (negative to positive alignment)
    examples: string[];
  }[];
}

export interface KnowledgePathwayReference {
  sourceId: string;
  pathwayId: string;
  relevance: number; // 0-100
  context: string;
}

export class AdvancedKnowledgeIngestionService {
  private static instance: AdvancedKnowledgeIngestionService;
  private knowledgeProcessingService: KnowledgeProcessingService;
  private analyticsService: AnalyticsService;
  private processedKnowledge: Map<string, AdvancedProcessedKnowledge> = new Map();

  private constructor() {
    this.knowledgeProcessingService = KnowledgeProcessingService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
    this.loadProcessedKnowledge();
  }

  static getInstance(): AdvancedKnowledgeIngestionService {
    if (!AdvancedKnowledgeIngestionService.instance) {
      AdvancedKnowledgeIngestionService.instance = new AdvancedKnowledgeIngestionService();
    }
    return AdvancedKnowledgeIngestionService.instance;
  }

  async processSourceAdvanced(source: Source, persona?: Persona): Promise<AdvancedProcessedKnowledge> {
    // Check if we already have processed this source
    const existing = this.processedKnowledge.get(source.id);
    if (existing && existing.lastProcessed > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) {
      return existing;
    }

    // First, process with the existing service
    const basicProcessed = await this.knowledgeProcessingService.processSource(source);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Extract key points with relevance scoring
    const keyPointsPrompt = `Extract 10-15 key points from this document, each with:
1. A unique identifier
2. The point content (1-2 sentences)
3. A relevance score (0-100) for general importance
4. A category for grouping

Document:
${source.content.substring(0, 5000)}

Respond ONLY with a JSON array in this format:
[
  {
    "id": "point1",
    "content": "Key point content",
    "relevance": 85,
    "category": "Category name"
  }
]`;

    let keyPoints: AdvancedProcessedKnowledge['keyPoints'] = [];
    try {
      const keyPointsResult = await model.generateContent(keyPointsPrompt);
      const keyPointsText = keyPointsResult.response.text();
      const jsonMatch = keyPointsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keyPoints = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to extract key points:', error);
    }

    // Generate pathways (numbered routes to specific information sets)
    const pathwaysPrompt = `Based on this document, create 5-10 "pathways" which are focused routes to specific information sets.
Each pathway should have:
1. A unique identifier (e.g., "1.2", "2.3")
2. A descriptive title
3. The pathway content (3-5 key sentences)
4. Connections to related key points (by their IDs)

Document:
${source.content.substring(0, 5000)}

Respond ONLY with a JSON array in this format:
[
  {
    "id": "1.2",
    "title": "Pathway title",
    "content": "Pathway content",
    "connections": ["point1", "point3"]
  }
]`;

    let pathways: AdvancedProcessedKnowledge['pathways'] = [];
    try {
      const pathwaysResult = await model.generateContent(pathwaysPrompt);
      const pathwaysText = pathwaysResult.response.text();
      const jsonMatch = pathwaysText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        pathways = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to generate pathways:', error);
    }

    // Extract moral compass indicators if persona is provided
    let moralCompassIndicators: AdvancedProcessedKnowledge['moralCompassIndicators'] = [];
    if (persona) {
      const moralCompassPrompt = `Analyze this document for moral/ethical themes that might influence a personality's "moral compass".
For each theme, identify:
1. The theme name
2. An alignment score (-100 to 100) where negative indicates opposition and positive indicates alignment
3. Examples from the text that support this assessment

Document:
${source.content.substring(0, 3000)}

Persona Context:
${persona.name} ${persona.surname}, ${persona.role}
${persona.bio}

Respond ONLY with a JSON array in this format:
[
  {
    "theme": "Theme name",
    "alignment": 75,
    "examples": ["Example 1", "Example 2"]
  }
]`;

      try {
        const moralCompassResult = await model.generateContent(moralCompassPrompt);
        const moralCompassText = moralCompassResult.response.text();
        const jsonMatch = moralCompassText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          moralCompassIndicators = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error('Failed to extract moral compass indicators:', error);
      }
    }

    // Create the advanced processed knowledge object
    const advancedProcessed: AdvancedProcessedKnowledge = {
      ...basicProcessed,
      keyPoints,
      pathways,
      moralCompassIndicators
    };

    // Store for future use
    this.processedKnowledge.set(source.id, advancedProcessed);
    this.saveProcessedKnowledge();
    
    this.analyticsService.trackEvent({
      type: 'advanced_file_processed',
      timestamp: new Date().toISOString(),
      metadata: {
        sourceId: source.id,
        sourceName: source.name,
        qualityScore: advancedProcessed.qualityScore,
        keyPointsCount: keyPoints.length,
        pathwaysCount: pathways.length,
        moralCompassIndicatorsCount: moralCompassIndicators.length
      }
    });

    return advancedProcessed;
  }

  async findRelevantPathways(sources: Source[], query: string): Promise<KnowledgePathwayReference[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const relevantPathways: KnowledgePathwayReference[] = [];
    
    for (const source of sources) {
      const processed = await this.processSourceAdvanced(source);
      
      // For each pathway, determine relevance to the query
      for (const pathway of processed.pathways) {
        const relevancePrompt = `Rate the relevance of this information pathway to the following query on a scale of 0-100:
        
Query: ${query}

Pathway (${pathway.id} - ${pathway.title}):
${pathway.content}

Respond with ONLY a number between 0-100:`;
        
        try {
          const relevanceResult = await model.generateContent(relevancePrompt);
          const relevanceScore = parseInt(relevanceResult.response.text().trim()) || 0;
          
          if (relevanceScore > 30) { // Only include pathways with some relevance
            relevantPathways.push({
              sourceId: source.id,
              pathwayId: pathway.id,
              relevance: relevanceScore,
              context: pathway.content
            });
          }
        } catch (error) {
          console.error(`Failed to assess relevance for pathway ${pathway.id}:`, error);
        }
      }
    }
    
    // Sort by relevance
    relevantPathways.sort((a, b) => b.relevance - a.relevance);
    
    return relevantPathways;
  }

  getProcessedKnowledge(sourceId: string): AdvancedProcessedKnowledge | undefined {
    return this.processedKnowledge.get(sourceId);
  }

  getAllProcessedKnowledge(): AdvancedProcessedKnowledge[] {
    return Array.from(this.processedKnowledge.values());
  }

  private saveProcessedKnowledge() {
    try {
      const data = JSON.stringify(Array.from(this.processedKnowledge.entries()));
      localStorage.setItem('knowledge-weaver-advanced-processed-knowledge', data);
    } catch (error) {
      console.error('Failed to save advanced processed knowledge:', error);
    }
  }

  private loadProcessedKnowledge() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-advanced-processed-knowledge');
      if (stored) {
        const entries = JSON.parse(stored);
        this.processedKnowledge = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load advanced processed knowledge:', error);
      this.processedKnowledge = new Map();
    }
  }

  clearProcessedKnowledge() {
    this.processedKnowledge.clear();
    localStorage.removeItem('knowledge-weaver-advanced-processed-knowledge');
  }
}