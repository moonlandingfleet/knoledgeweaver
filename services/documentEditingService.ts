import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona, Source } from '../types';
import { PersonaCalibrationService } from './personaCalibrationService';
import { AnalyticsService } from './analyticsService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface EditSegmentRequest {
  document: string;
  segment: string;
  instruction: string;
  persona: Persona;
  knowledgeSources: Source[];
}

export interface EditSegmentResult {
  editedSegment: string;
  confidence: number;
  reasoning: string;
}

export interface EditRating {
  id: string;
  editId: string;
  rating: number; // 1-5 stars
  feedback: string;
  timestamp: string;
}

export class DocumentEditingService {
  private static instance: DocumentEditingService;
  private analyticsService: AnalyticsService;
  private calibrationService: PersonaCalibrationService;
  private editRatings: Map<string, EditRating> = new Map();

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.calibrationService = PersonaCalibrationService.getInstance();
    this.loadRatings();
  }

  static getInstance(): DocumentEditingService {
    if (!DocumentEditingService.instance) {
      DocumentEditingService.instance = new DocumentEditingService();
    }
    return DocumentEditingService.instance;
  }

  /**
   * Edit a specific segment of a document based on user instruction, persona, and knowledge sources
   */
  async editSegment(request: EditSegmentRequest): Promise<EditSegmentResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Prepare knowledge context
    const knowledgeContext = request.knowledgeSources.map(source => 
      `${source.name}: ${source.content.substring(0, 500)}...`
    ).join('\n\n');
    
    // Get persona instruction
    const personaInstruction = this.calibrationService.isPersonaCalibrated(request.persona)
      ? this.calibrationService.generateEnhancedSystemInstruction(request.persona, request.knowledgeSources)
      : `You are ${request.persona.name} ${request.persona.surname}, a ${request.persona.role}.`;
    
    const prompt = `${personaInstruction}

TASK: Edit the following SEGMENT of a document according to the provided INSTRUCTION.

DOCUMENT CONTEXT:
${request.document}

SEGMENT TO EDIT:
${request.segment}

USER INSTRUCTION:
${request.instruction}

KNOWLEDGE BASE:
${knowledgeContext}

INSTRUCTIONS:
1. Edit ONLY the specified segment
2. Maintain consistency with the document's overall tone and style
3. Apply your persona's expertise and perspective
4. Use the knowledge base to inform your edits
5. Respond ONLY with the edited segment

EDITED SEGMENT:`;

    try {
      const result = await model.generateContent(prompt);
      const editedSegment = result.response.text().trim();
      
      // Generate confidence score
      const confidencePrompt = `Rate your confidence in this edit on a scale of 1-100:
      
Original Segment:
${request.segment}

Edited Segment:
${editedSegment}

Instruction: ${request.instruction}

Respond with ONLY a number between 1-100:`;
      
      let confidence = 80;
      try {
        const confidenceResult = await model.generateContent(confidencePrompt);
        confidence = parseInt(confidenceResult.response.text().trim()) || 80;
      } catch (error) {
        console.error('Failed to generate confidence score:', error);
      }
      
      // Generate reasoning
      const reasoningPrompt = `Briefly explain your reasoning for this edit in one sentence:
      
Original Segment:
${request.segment}

Edited Segment:
${editedSegment}

Instruction: ${request.instruction}`;
      
      let reasoning = 'Edit completed based on instruction and persona expertise.';
      try {
        const reasoningResult = await model.generateContent(reasoningPrompt);
        reasoning = reasoningResult.response.text().trim();
      } catch (error) {
        console.error('Failed to generate reasoning:', error);
      }
      
      // Track the edit
      this.analyticsService.trackEvent({
        type: 'segment_edited',
        timestamp: new Date().toISOString(),
        metadata: {
          personaId: request.persona.id,
          knowledgeSourceCount: request.knowledgeSources.length,
          segmentLength: request.segment.length,
          editedSegmentLength: editedSegment.length,
          confidence
        }
      });
      
      return {
        editedSegment,
        confidence,
        reasoning
      };
    } catch (error) {
      console.error('Failed to edit segment:', error);
      throw new Error('Failed to edit document segment');
    }
  }

  /**
   * Rate an edit and store the rating for learning purposes
   */
  async rateEdit(editId: string, rating: number, feedback: string): Promise<EditRating> {
    const editRating: EditRating = {
      id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      editId,
      rating,
      feedback,
      timestamp: new Date().toISOString()
    };

    this.editRatings.set(editRating.id, editRating);
    this.saveRatings();
    
    this.analyticsService.trackEvent({
      type: 'edit_rated',
      timestamp: editRating.timestamp,
      metadata: {
        editId: editRating.editId,
        rating: editRating.rating
      }
    });

    return editRating;
  }

  /**
   * Get average rating for a specific edit
   */
  getAverageRating(editId: string): number | null {
    const ratings = Array.from(this.editRatings.values()).filter(r => r.editId === editId);
    if (ratings.length === 0) return null;
    
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    return sum / ratings.length;
  }

  private saveRatings() {
    try {
      const data = JSON.stringify(Array.from(this.editRatings.entries()));
      localStorage.setItem('knowledge-weaver-edit-ratings', data);
    } catch (error) {
      console.error('Failed to save edit ratings:', error);
    }
  }

  private loadRatings() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-edit-ratings');
      if (stored) {
        const entries = JSON.parse(stored);
        this.editRatings = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load edit ratings:', error);
      this.editRatings = new Map();
    }
  }

  clearRatings() {
    this.editRatings.clear();
    localStorage.removeItem('knowledge-weaver-edit-ratings');
  }
}