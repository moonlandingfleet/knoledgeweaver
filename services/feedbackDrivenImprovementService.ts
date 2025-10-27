import { Persona } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalyticsService } from './analyticsService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface EditRating {
  id: string;
  timestamp: string;
  editId: string; // Reference to the specific edit
  rating: number; // 1-5 stars
  detailedFeedback?: string;
  qualityMetrics: {
    clarity: number; // 0-100
    accuracy: number; // 0-100
    relevance: number; // 0-100
    personaAlignment: number; // 0-100
    overall: number; // 0-100
  };
}

export interface EditImprovementSuggestion {
  id: string;
  editId: string;
  suggestion: string;
  confidence: number; // 0-100
  implementation: string; // How to implement the suggestion
}

export class FeedbackDrivenImprovementService {
  private static instance: FeedbackDrivenImprovementService;
  private analyticsService: AnalyticsService;
  private editRatings: Map<string, EditRating> = new Map();
  private improvementSuggestions: Map<string, EditImprovementSuggestion[]> = new Map();

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.loadRatings();
  }

  static getInstance(): FeedbackDrivenImprovementService {
    if (!FeedbackDrivenImprovementService.instance) {
      FeedbackDrivenImprovementService.instance = new FeedbackDrivenImprovementService();
    }
    return FeedbackDrivenImprovementService.instance;
  }

  async rateEdit(editId: string, rating: number, detailedFeedback?: string): Promise<EditRating> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Generate quality metrics based on the rating and feedback
    const metricsPrompt = `Based on a ${rating}/5 star rating and the following feedback, generate quality metrics (0-100) for this edit:
    
Feedback: ${detailedFeedback || 'No detailed feedback provided'}

Respond ONLY with a JSON object in this format:
{
  "clarity": 0,
  "accuracy": 0,
  "relevance": 0,
  "personaAlignment": 0,
  "overall": 0
}`;

    let qualityMetrics: EditRating['qualityMetrics'] = {
      clarity: 0,
      accuracy: 0,
      relevance: 0,
      personaAlignment: 0,
      overall: 0
    };

    try {
      const metricsResult = await model.generateContent(metricsPrompt);
      const metricsText = metricsResult.response.text();
      const jsonMatch = metricsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        qualityMetrics = { ...qualityMetrics, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (error) {
      console.error('Failed to generate quality metrics:', error);
      // Fallback to simple calculation based on star rating
      const score = (rating / 5) * 100;
      qualityMetrics = {
        clarity: score,
        accuracy: score,
        relevance: score,
        personaAlignment: score,
        overall: score
      };
    }

    const editRating: EditRating = {
      id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      editId,
      rating,
      detailedFeedback,
      qualityMetrics
    };

    this.editRatings.set(editRating.id, editRating);
    this.saveRatings();
    
    this.analyticsService.trackEvent({
      type: 'edit_rated',
      timestamp: editRating.timestamp,
      metadata: {
        editId: editRating.editId,
        rating: editRating.rating,
        qualityMetrics: editRating.qualityMetrics
      }
    });

    return editRating;
  }

  async generateImprovementSuggestions(editId: string, content: string, persona: Persona): Promise<EditImprovementSuggestion[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `As an expert editor, analyze this content and provide specific improvement suggestions for ${persona.name} ${persona.surname} (${persona.role}).

Content:
${content}

Provide 3-5 specific, actionable suggestions to improve this content. Each suggestion should:
1. Identify a specific issue or opportunity
2. Explain why it's important
3. Provide concrete implementation guidance
4. Include a confidence level (0-100) in your suggestion

Format your response as a JSON array with objects containing:
- suggestion: detailed explanation of the issue/opportunity
- confidence: number 0-100
- implementation: step-by-step guidance on how to implement

Respond ONLY with the JSON array:`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      
      const suggestionsData = JSON.parse(jsonMatch[0]);
      
      const suggestions: EditImprovementSuggestion[] = suggestionsData.map((s: any, index: number) => ({
        id: `suggestion-${editId}-${index}`,
        editId,
        suggestion: s.suggestion,
        confidence: s.confidence,
        implementation: s.implementation
      }));
      
      this.improvementSuggestions.set(editId, suggestions);
      this.saveSuggestions();
      
      this.analyticsService.trackEvent({
        type: 'improvement_suggestions_generated',
        timestamp: new Date().toISOString(),
        metadata: {
          editId,
          suggestionCount: suggestions.length
        }
      });
      
      return suggestions;
    } catch (error) {
      console.error('Failed to generate improvement suggestions:', error);
      return [];
    }
  }

  getEditRatings(editId: string): EditRating[] {
    return Array.from(this.editRatings.values()).filter(rating => rating.editId === editId);
  }

  getAverageRatings(editId: string): EditRating['qualityMetrics'] | null {
    const ratings = this.getEditRatings(editId);
    if (ratings.length === 0) return null;
    
    const sum = ratings.reduce((acc, rating) => {
      acc.clarity += rating.qualityMetrics.clarity;
      acc.accuracy += rating.qualityMetrics.accuracy;
      acc.relevance += rating.qualityMetrics.relevance;
      acc.personaAlignment += rating.qualityMetrics.personaAlignment;
      acc.overall += rating.qualityMetrics.overall;
      return acc;
    }, {
      clarity: 0,
      accuracy: 0,
      relevance: 0,
      personaAlignment: 0,
      overall: 0
    });
    
    return {
      clarity: sum.clarity / ratings.length,
      accuracy: sum.accuracy / ratings.length,
      relevance: sum.relevance / ratings.length,
      personaAlignment: sum.personaAlignment / ratings.length,
      overall: sum.overall / ratings.length
    };
  }

  getImprovementSuggestions(editId: string): EditImprovementSuggestion[] {
    return this.improvementSuggestions.get(editId) || [];
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

  private saveSuggestions() {
    try {
      const data = JSON.stringify(Array.from(this.improvementSuggestions.entries()));
      localStorage.setItem('knowledge-weaver-improvement-suggestions', data);
    } catch (error) {
      console.error('Failed to save improvement suggestions:', error);
    }
  }

  private loadSuggestions() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-improvement-suggestions');
      if (stored) {
        const entries = JSON.parse(stored);
        this.improvementSuggestions = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load improvement suggestions:', error);
      this.improvementSuggestions = new Map();
    }
  }

  clearRatings() {
    this.editRatings.clear();
    localStorage.removeItem('knowledge-weaver-edit-ratings');
  }

  clearSuggestions() {
    this.improvementSuggestions.clear();
    localStorage.removeItem('knowledge-weaver-improvement-suggestions');
  }
}