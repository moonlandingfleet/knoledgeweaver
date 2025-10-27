import { Source, Persona } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AdvancedKnowledgeIngestionService, KnowledgePathwayReference } from './advancedKnowledgeIngestionService';
import { AnalyticsService } from './analyticsService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface SelectiveProcessingResult {
  id: string;
  timestamp: string;
  personaId: string;
  selectedPathways: KnowledgePathwayReference[];
  processingSummary: string;
  generatedContent: string;
  confidence: number; // 0-100
}

export class SelectivePathwayProcessingService {
  private static instance: SelectivePathwayProcessingService;
  private analyticsService: AnalyticsService;
  private ingestionService: AdvancedKnowledgeIngestionService;
  private processingHistory: Map<string, SelectiveProcessingResult> = new Map();

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.ingestionService = AdvancedKnowledgeIngestionService.getInstance();
    this.loadProcessingHistory();
  }

  static getInstance(): SelectivePathwayProcessingService {
    if (!SelectivePathwayProcessingService.instance) {
      SelectivePathwayProcessingService.instance = new SelectivePathwayProcessingService();
    }
    return SelectivePathwayProcessingService.instance;
  }

  async processWithSelectedPathways(
    persona: Persona,
    sources: Source[],
    selectedPathways: KnowledgePathwayReference[],
    taskDescription: string
  ): Promise<SelectiveProcessingResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Prepare the context from selected pathways
    const pathwayContexts = selectedPathways.map(pathway => {
      const source = sources.find(s => s.id === pathway.sourceId);
      return {
        sourceName: source ? source.name : 'Unknown Source',
        pathwayId: pathway.pathwayId,
        content: pathway.context
      };
    });

    const contextText = pathwayContexts.map(ctx => 
      `Source: ${ctx.sourceName}\nPathway ${ctx.pathwayId}:\n${ctx.content}`
    ).join('\n\n---\n\n');

    // Create the prompt with the selected pathways
    const prompt = `You are ${persona.name} ${persona.surname}, a ${persona.role}. 

Using only the specific information pathways provided below, ${taskDescription}:

INFORMATION PATHWAYS:
${contextText}

IMPORTANT INSTRUCTIONS:
1. Use ONLY the information provided in the pathways above
2. Do not make up information or use knowledge not contained in the pathways
3. Reference the source documents and pathway IDs when appropriate
4. Maintain your persona's voice and expertise
5. Be concise and focused on the specific pathways provided

Response:`;

    try {
      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();
      
      // Generate a confidence score based on how well the content matches the pathways
      const confidencePrompt = `Rate the confidence level (0-100) that this response directly addresses the task using ONLY the provided information pathways:
      
Task: ${taskDescription}
      
Response:
${generatedContent}

Respond with ONLY a number between 0-100:`;

      let confidence = 75;
      try {
        const confidenceResult = await model.generateContent(confidencePrompt);
        confidence = parseInt(confidenceResult.response.text().trim()) || 75;
      } catch (error) {
        console.error('Failed to generate confidence score:', error);
      }

      // Generate a processing summary
      const summaryPrompt = `Provide a brief summary (1-2 sentences) of how the provided information pathways were used to address this task:
      
Task: ${taskDescription}

Response:
${generatedContent}

Summary:`;

      let processingSummary = 'Processed using selected information pathways.';
      try {
        const summaryResult = await model.generateContent(summaryPrompt);
        processingSummary = summaryResult.response.text().trim();
      } catch (error) {
        console.error('Failed to generate processing summary:', error);
      }

      const processingResult: SelectiveProcessingResult = {
        id: `processing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        personaId: persona.id,
        selectedPathways,
        processingSummary,
        generatedContent,
        confidence
      };

      this.processingHistory.set(processingResult.id, processingResult);
      this.saveProcessingHistory();
      
      this.analyticsService.trackEvent({
        type: 'selective_pathway_processing',
        timestamp: processingResult.timestamp,
        metadata: {
          personaId: processingResult.personaId,
          pathwayCount: processingResult.selectedPathways.length,
          confidence: processingResult.confidence,
          contentLength: processingResult.generatedContent.length
        }
      });

      return processingResult;
    } catch (error) {
      console.error('Failed to process with selected pathways:', error);
      throw new Error('Failed to process with selected pathways');
    }
  }

  async findOptimalPathways(
    persona: Persona,
    sources: Source[],
    taskDescription: string,
    maxPathways: number = 10
  ): Promise<KnowledgePathwayReference[]> {
    // First, get all pathways from the sources
    const allPathways: KnowledgePathwayReference[] = [];
    
    for (const source of sources) {
      const processed = await this.ingestionService.processSourceAdvanced(source, persona);
      
      for (const pathway of processed.pathways) {
        allPathways.push({
          sourceId: source.id,
          pathwayId: pathway.id,
          relevance: 50, // Will be updated below
          context: pathway.content
        });
      }
    }
    
    // Score each pathway for relevance to the task
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const scoredPathways: { pathway: KnowledgePathwayReference; score: number }[] = [];
    
    for (const pathway of allPathways) {
      const relevancePrompt = `Rate the relevance of this information pathway to the following task on a scale of 0-100:
      
Task: ${taskDescription}

Pathway:
${pathway.context}

Respond with ONLY a number between 0-100:`;
      
      try {
        const relevanceResult = await model.generateContent(relevancePrompt);
        const score = parseInt(relevanceResult.response.text().trim()) || 0;
        
        scoredPathways.push({
          pathway,
          score
        });
      } catch (error) {
        console.error('Failed to score pathway:', error);
        // Give it a default low score
        scoredPathways.push({
          pathway,
          score: 10
        });
      }
    }
    
    // Sort by score and take the top pathways
    scoredPathways.sort((a, b) => b.score - a.score);
    
    return scoredPathways
      .slice(0, maxPathways)
      .map(item => item.pathway);
  }

  getProcessingHistory(personaId: string): SelectiveProcessingResult[] {
    return Array.from(this.processingHistory.values())
      .filter(result => result.personaId === personaId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getProcessingResult(resultId: string): SelectiveProcessingResult | undefined {
    return this.processingHistory.get(resultId);
  }

  private saveProcessingHistory() {
    try {
      const data = JSON.stringify(Array.from(this.processingHistory.entries()));
      localStorage.setItem('knowledge-weaver-selective-processing-history', data);
    } catch (error) {
      console.error('Failed to save processing history:', error);
    }
  }

  private loadProcessingHistory() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-selective-processing-history');
      if (stored) {
        const entries = JSON.parse(stored);
        this.processingHistory = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load processing history:', error);
      this.processingHistory = new Map();
    }
  }

  clearProcessingHistory() {
    this.processingHistory.clear();
    localStorage.removeItem('knowledge-weaver-selective-processing-history');
  }
}