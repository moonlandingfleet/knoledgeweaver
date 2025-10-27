import { AnalyticsService } from './analyticsService';

export interface EditQualityMetrics {
  clarity: number; // 0-100
  accuracy: number; // 0-100
  relevance: number; // 0-100
  overall: number; // 0-100
}

export interface UserFeedback {
  id: string;
  timestamp: string;
  type: 'refinement' | 'quality_check' | 'manual_rating';
  content: string;
  rating?: number; // 1-5 stars
  qualityMetrics?: EditQualityMetrics;
  documentId?: string;
  personaId?: string;
  sessionId: string;
}

export class FeedbackService {
  private static instance: FeedbackService;
  private feedbacks: UserFeedback[] = [];
  private analyticsService: AnalyticsService;

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.loadFeedbacks();
  }

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  trackRefinementFeedback(feedbackText: string, documentId?: string, personaId?: string): UserFeedback {
    const feedback: UserFeedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'refinement',
      content: feedbackText,
      documentId,
      personaId,
      sessionId: this.analyticsService.getCurrentSessionId()
    };

    this.feedbacks.push(feedback);
    this.saveFeedbacks();
    this.analyticsService.trackEvent({
      type: 'document_refined',
      timestamp: feedback.timestamp,
      metadata: {
        feedbackLength: feedbackText.length,
        documentId,
        personaId
      }
    });

    return feedback;
  }

  trackQualityCheckFeedback(report: string, qualityMetrics: EditQualityMetrics, documentId?: string, personaId?: string): UserFeedback {
    const feedback: UserFeedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'quality_check',
      content: report,
      qualityMetrics,
      documentId,
      personaId,
      sessionId: this.analyticsService.getCurrentSessionId()
    };

    this.feedbacks.push(feedback);
    this.saveFeedbacks();
    this.analyticsService.trackEvent({
      type: 'quality_check',
      timestamp: feedback.timestamp,
      metadata: {
        documentId,
        personaId,
        qualityMetrics
      }
    });

    return feedback;
  }

  trackManualRating(rating: number, comment: string, documentId?: string, personaId?: string): UserFeedback {
    const feedback: UserFeedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'manual_rating',
      content: comment,
      rating,
      documentId,
      personaId,
      sessionId: this.analyticsService.getCurrentSessionId()
    };

    this.feedbacks.push(feedback);
    this.saveFeedbacks();
    
    this.analyticsService.trackEvent({
      type: 'quality_assessment',
      timestamp: feedback.timestamp,
      metadata: {
        rating,
        documentId,
        personaId
      }
    });

    return feedback;
  }

  getFeedbackHistory(documentId?: string, personaId?: string): UserFeedback[] {
    return this.feedbacks.filter(feedback => {
      if (documentId && feedback.documentId !== documentId) return false;
      if (personaId && feedback.personaId !== personaId) return false;
      return true;
    });
  }

  getEditQualityStats(): { 
    avgClarity: number; 
    avgAccuracy: number; 
    avgRelevance: number; 
    avgOverall: number;
    totalFeedbacks: number;
  } {
    const qualityFeedbacks = this.feedbacks.filter(f => f.qualityMetrics);
    
    if (qualityFeedbacks.length === 0) {
      return {
        avgClarity: 0,
        avgAccuracy: 0,
        avgRelevance: 0,
        avgOverall: 0,
        totalFeedbacks: 0
      };
    }

    const totals = qualityFeedbacks.reduce((acc, feedback) => {
      if (feedback.qualityMetrics) {
        acc.clarity += feedback.qualityMetrics.clarity;
        acc.accuracy += feedback.qualityMetrics.accuracy;
        acc.relevance += feedback.qualityMetrics.relevance;
        acc.overall += feedback.qualityMetrics.overall;
      }
      return acc;
    }, { clarity: 0, accuracy: 0, relevance: 0, overall: 0 });

    const count = qualityFeedbacks.length;

    return {
      avgClarity: totals.clarity / count,
      avgAccuracy: totals.accuracy / count,
      avgRelevance: totals.relevance / count,
      avgOverall: totals.overall / count,
      totalFeedbacks: count
    };
  }

  private saveFeedbacks() {
    try {
      localStorage.setItem('knowledge-weaver-feedbacks', JSON.stringify(this.feedbacks));
    } catch (error) {
      console.error('Failed to save feedbacks:', error);
    }
  }

  private loadFeedbacks() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-feedbacks');
      if (stored) {
        this.feedbacks = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
      this.feedbacks = [];
    }
  }

  clearFeedbacks() {
    this.feedbacks = [];
    localStorage.removeItem('knowledge-weaver-feedbacks');
  }
}