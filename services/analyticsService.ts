import{ Persona, Source } from '../types';

export interface PerformanceMetrics {
  // Quality over time
  averageQualityScore: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  consistencyScore: number;

  // Response metrics
  averageResponseTime: number;
 responseLengthTrend: number;
  personaConsistencyScore: number;

  // Knowledge integration
  knowledgeUtilizationRate: number;
  sourceDiversityScore: number;

  // User satisfaction indicators
  refinementRate: number; // How often users refine outputs
  questionSuccessRate: number; // How oftenconversational responses are followed up

  // Progress tracking
  weeklyImprovement: number;
  knowledgeGrowth: number;
  personaEvolution: number;
}

export interface QualityAssessment {
  personaConsistency: number; // 0-100
  knowledgeIntegration: number; // 0-100
  responseRelevance: number; // 0-100
  overallQuality: number; // 0-100
  timestamp: string;
  sessionId: string;
}

export interface AnalyticsEvent {
  type: 'persona_created' | 'document_generated' | 'document_refined' | 'quality_check' | 'file_uploaded' | 'search_performed' | 'persona_question' | 'quality_assessment'| 'advanced_file_processed' | 'edit_rated' | 'improvement_suggestions_generated' | 'selective_pathway_processing';
  timestamp: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  qualityScore?: QualityAssessment;
}

export interface UsageStats {
  totalPersonas: number;
  totalKnowledgeSources: number;
  totalDocumentsGenerated: number;
  totalRefinements: number;
  totalQualityChecks: number;
  averageDocumentLength: number;
  mostUsedPersona: string;
  lastActivity: string;
  sessionStartTime:string;
  totalWordsProcessed: number;
  fileTypesUsed: Record<string, number>;
  featuresUsed: Record<string, number>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private sessionStartTime: string;
  private currentSessionId: string;

  constructor() {
    this.sessionStartTime = new Date().toISOString();
    this.currentSessionId = `session-${Date.now()}`;
    this.loadEvents();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  trackEvent(event: AnalyticsEvent) {
    const enhancedEvent: AnalyticsEvent = {
      ...event,
      sessionId: event.sessionId || this.currentSessionId
    };
    this.events.push(enhancedEvent);
    this.saveEvents();
  }

  trackQualityAssessment(assessment: QualityAssessment) {
    this.trackEvent({
      type: 'quality_assessment',
      timestamp: assessment.timestamp,
      sessionId: assessment.sessionId,
      qualityScore: assessment
    });
  }

  getUsageStats(personas: Persona[], knowledgeSources: Source[], generatedContent: string): UsageStats {
    const personaNames = personas.map(p => `${p.name} ${p.surname}`);
    const mostUsedPersona = personaNames.length > 0
      ? personaNames.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a :b
        )
      : 'None';

    const fileTypesUsed: Record<string, number> = {};
    knowledgeSources.forEach(source => {
      const extension = source.name.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypesUsed[extension] = (fileTypesUsed[extension] || 0)+ 1;
    });

    const featuresUsed: Record<string, number> = {};
    this.events.forEach(event => {
      featuresUsed[event.type] = (featuresUsed[event.type] || 0) + 1;
    });

    const totalWordsProcessed = personas.reduce((total, persona) => {
      letwords = 0;
      words += persona.name.split(' ').length;
      words += persona.surname.split(' ').length;
      words += persona.role.split(' ').length;
      words += persona.bio?.split(' ').length || 0;
      persona.shaperSources.forEach(source => words += source.content.split(' ').length);
      return total + words;
    }, 0) + knowledgeSources.reduce((total, source) => total + source.content.split(' ').length, 0);

    return {
      totalPersonas: personas.length,
      totalKnowledgeSources: knowledgeSources.length,
      totalDocumentsGenerated: this.events.filter(e => e.type === 'document_generated').length,
      totalRefinements: this.events.filter(e => e.type === 'document_refined').length,
      totalQualityChecks: this.events.filter(e => e.type === 'quality_check').length,
      averageDocumentLength: generatedContent ? generatedContent.split(' ').length : 0,
      mostUsedPersona,
      lastActivity: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : this.sessionStartTime,
      sessionStartTime: this.sessionStartTime,
      totalWordsProcessed,
      fileTypesUsed,
      featuresUsed
    };
  }

  getPerformanceMetrics(): PerformanceMetrics{
    const qualityAssessments = this.events.filter(e => e.type === 'quality_assessment' && e.qualityScore);
    const recentAssessments = qualityAssessments.slice(-10); // Last 10 assessments

    const averageQualityScore = recentAssessments.length > 0
     ? recentAssessments.reduce((sum, e) => sum + (e.qualityScore?.overallQuality || 0), 0) / recentAssessments.length
      : 0;

    const personaQuestions = this.events.filter(e => e.type === 'persona_question');
    const refinements = this.events.filter(e => e.type === 'document_refined');
    const refinementsRate = personaQuestions.length > 0 ? refinements.length / personaQuestions.length : 0;

    const knowledgeGrowth = this.calculateKnowledgeGrowth();
    const weeklyImprovement = this.calculateWeeklyImprovement();

    return {
      averageQualityScore,
      qualityTrend: this.calculateQualityTrend(recentAssessments),
      consistencyScore: this.calculateConsistencyScore(),

      averageResponseTime: this.calculateAverageResponseTime(),
      responseLengthTrend: this.calculateResponseLengthTrend(),
      personaConsistencyScore: this.calculatePersonaConsistency(),

      knowledgeUtilizationRate: this.calculateKnowledgeUtilization(),
      sourceDiversityScore: this.calculateSourceDiversity(),

      refinementRate: refinementsRate,
      questionSuccessRate: this.calculateQuestionSuccessRate(),

      weeklyImprovement,
      knowledgeGrowth,
      personaEvolution: this.calculatePersonaEvolution()
    };
 }

  private calculateQualityTrend(assessments: AnalyticsEvent[]): 'improving' | 'stable' | 'declining' {
    if (assessments.length < 2) return 'stable';

    const firstHalf = assessments.slice(0, Math.floor(assessments.length / 2));
    const secondHalf = assessments.slice(Math.floor(assessments.length / 2));

    const firstAvg = firstHalf.reduce((sum, e) => sum + (e.qualityScore?.overallQuality || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum,e) => sum + (e.qualityScore?.overallQuality || 0), 0) / secondHalf.length;

    if (secondAvg > firstAvg + 5) return 'improving';
    if (secondAvg < firstAvg - 5) return 'declining';
    return 'stable';
 }

  private calculateConsistencyScore(): number {
    const assessments = this.events.filter(e => e.type === 'quality_assessment' && e.qualityScore);
    if (assessments.length < 2) return 0;

    const scores = assessments.map(e => e.qualityScore?.personaConsistency || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    // Lower variance = higher consistency (invert and scaleto 0-100)
    return Math.max(0, 100 - (variance / 10));
  }

  private calculateAverageResponseTime(): number {
    const questionEvents = this.events.filter(e => e.type === 'persona_question');
    if (questionEvents.length === 0) return 0;

    const totalTime = questionEvents.reduce((sum, event) => {
      const nextEvent = this.events.find(e =>
        e.timestamp > event.timestamp &&
        e.sessionId === event.sessionId &&
        e.type !== 'persona_question'
      );
      if (nextEvent) {
        const timeDiff = new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime();
        return sum + timeDiff;
      }
      return sum;
    }, 0);

    return totalTime / questionEvents.length / 1000; // Convert to seconds
  }

  private calculateResponseLengthTrend():number {
    const generationEvents = this.events.filter(e => e.type === 'document_generated');
    if (generationEvents.length < 2) return 0;

    const lengths = generationEvents.map(e => e.metadata?.contentLength || 0);
    const firstHalf = lengths.slice(0, Math.floor(lengths.length / 2));
    const secondHalf = lengths.slice(Math.floor(lengths.length / 2));

    const firstAvg = firstHalf.reduce((sum, len) => sum + len, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, len) => sum + len,0) / secondHalf.length;

    return secondAvg > firstAvg ? 1 : secondAvg < firstAvg ? -1 : 0;
  }

  private calculatePersonaConsistency(): number {
    const assessments = this.events.filter(e => e.type === 'quality_assessment' && e.qualityScore);
   if(assessments.length ===0) return 0;

    const consistencyScores = assessments.map(e => e.qualityScore?.personaConsistency || 0);
    return consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length;
  }

  private calculateKnowledgeUtilization(): number {
    const questionEvents= this.events.filter(e => e.type === 'persona_question');
    const sources = this.events.filter(e => e.type === 'file_uploaded');

    return sources.length > 0 ? questionEvents.length / sources.length * 100 : 0;
  }

  private calculateSourceDiversity(): number {
    constfileTypes = new Set(this.events
      .filter(e => e.type === 'file_uploaded')
      .map(e => e.metadata?.fileType)
      .filter(Boolean)
    );

    return Math.min(100, fileTypes.size * 20); // Max 5 file types = 100%
  }

  private calculateQuestionSuccessRate(): number {
    const questions = this.events.filter(e => e.type === 'persona_question');
    const followUps = this.events.filter(e =>
      e.type === 'persona_question' &&
      questions.some(q => q.timestamp < e.timestamp && q.sessionId === e.sessionId)
    );

    return questions.length > 0 ? (followUps.length / questions.length) * 100 : 0;
  }

  private calculateKnowledgeGrowth(): number {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentUploads = this.events.filter(e =>
      e.type === 'file_uploaded' &&
      new Date(e.timestamp) > oneWeekAgo
    );

    const olderUploads = this.events.filter(e =>
      e.type ==='file_uploaded' &&
      new Date(e.timestamp) <= oneWeekAgo
    );

    return olderUploads.length > 0 ? (recentUploads.length / olderUploads.length) * 100 : 0;
  }

  private calculateWeeklyImprovement(): number {
    const assessments = this.events.filter(e => e.type === 'quality_assessment' && e.qualityScore);
    if (assessments.length < 2) return 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recent =assessments.filter(e => new Date(e.timestamp) > oneWeekAgo);
    const older = assessments.filter(e => new Date(e.timestamp) <= oneWeekAgo);

    if (recent.length === 0 || older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, e)=> sum + (e.qualityScore?.overallQuality || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + (e.qualityScore?.overallQuality || 0), 0) / older.length;

    return recentAvg - olderAvg;
  }

 private calculatePersonaEvolution(): number {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentPersonas = this.events.filter(e =>
      e.type === 'persona_created' &&
      new Date(e.timestamp) > oneWeekAgo
    );

    const olderPersonas = this.events.filter(e =>
      e.type === 'persona_created' &&
      new Date(e.timestamp) <= oneWeekAgo
    );

    return olderPersonas.length > 0 ? (recentPersonas.length / olderPersonas.length) * 100 : 0;
  }

  private saveEvents() {
    try {
      localStorage.setItem('knowledge-weaver-analytics', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save analytics events:', error);
    }
  }

private loadEvents() {
    try {
      const stored = localStorage.getItem('knowledge-weaver-analytics');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load analytics events:', error);
      this.events = [];
    }
 }

  clearAnalytics() {
    this.events = [];
    localStorage.removeItem('knowledge-weaver-analytics');
  }

  exportPerformanceData(): string {
    const metrics = this.getPerformanceMetrics();
    const stats = this.getUsageStats([], [], ''); // We'll need to pass actual data

    return JSON.stringify({
      metrics,
      stats,
      events: this.events,
      exportDate: new Date().toISOString(),
      version: '2.0.0'
    }, null, 2);
  }

  getCurrentSessionId(): string {
    return this.currentSessionId;
  }
}
