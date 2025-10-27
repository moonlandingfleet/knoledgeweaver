import { Persona, DocumentSnapshot, DevelopmentGuidance, Source } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export class DocumentEvolutionService {
  private static instance: DocumentEvolutionService;

  static getInstance(): DocumentEvolutionService {
    if (!DocumentEvolutionService.instance) {
      DocumentEvolutionService.instance = new DocumentEvolutionService();
    }
    return DocumentEvolutionService.instance;
  }

  async createSnapshot(
    persona: Persona,
    currentContent: string,
    previousContent?: string,
    version: number = 1
  ): Promise<DocumentSnapshot> {
    const changes = previousContent
      ? await this.analyzeChanges(previousContent, currentContent)
      : ['Initial document creation'];

    const contextSummary = await this.generateContextSummary(currentContent, persona);

    const snapshot: DocumentSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: currentContent,
      version,
      changes,
      contextSummary
    };

    return snapshot;
  }

  private async analyzeChanges(oldContent: string, newContent: string): Promise<string[]> {
    if (oldContent === newContent) return ['No changes detected'];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Compare the old and new document versions and identify the key changes:

OLD VERSION:
${oldContent}

NEW VERSION:
${newContent}

List the main changes in bullet points, focusing on:
- Content additions or modifications
- Structural changes
- Key improvements or refinements
- Any significant shifts in perspective or emphasis

Be concise but specific.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse the response into bullet points
      const changes = response
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.trim().replace(/^[-•]\s*/, ''));

      return changes.length > 0 ? changes : ['Content updated'];
    } catch (error) {
      console.error('Failed to analyze changes:', error);
      return ['Content updated'];
    }
  }

  private async generateContextSummary(content: string, persona: Persona): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Create a concise summary of the current document context for ${persona.name} ${persona.surname} (${persona.role}):

DOCUMENT CONTENT:
${content}

Provide a 2-3 sentence summary that captures:
1. The main topic or purpose
2. Key arguments or points made
3. Current state of development

This summary will help maintain context continuity in future interactions.`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Failed to generate context summary:', error);
      return 'Document context summary unavailable';
    }
  }

  async generateDevelopmentGuidance(
    persona: Persona,
    currentContent: string,
    knowledgeSources: Source[],
    snapshots: DocumentSnapshot[]
  ): Promise<DevelopmentGuidance[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const recentSnapshots = snapshots.slice(-3); // Last 3 snapshots for context
    const evolutionContext = recentSnapshots.map(s =>
      `Version ${s.version} (${new Date(s.timestamp).toLocaleDateString()}): ${s.contextSummary}`
    ).join('\n');

    const knowledgeContext = knowledgeSources.map(s =>
      `${s.name}: ${s.content.substring(0, 200)}...`
    ).join('\n');

    const prompt = `As ${persona.name} ${persona.surname}, a ${persona.role}, analyze this document and provide development guidance.

CURRENT DOCUMENT:
${currentContent}

KNOWLEDGE BASE:
${knowledgeContext}

DOCUMENT EVOLUTION HISTORY:
${evolutionContext}

Provide 3-5 specific, actionable suggestions for improving this document. Each suggestion should:
1. Be specific and implementable
2. Align with my personality and expertise as ${persona.role}
3. Consider the knowledge base provided
4. Build upon the document's evolution

Format as JSON array with objects containing:
- type: "suggestion" | "improvement" | "refinement" | "validation"
- content: detailed suggestion text
- confidence: number 0-100 indicating confidence level

Return only the JSON array.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');

      const guidance = JSON.parse(jsonMatch[0]);

      return guidance.map((item: any, index: number) => ({
        id: `guidance-${Date.now()}-${index}`,
        timestamp: new Date().toISOString(),
        type: item.type || 'suggestion',
        content: item.content || '',
        applied: false,
        confidence: item.confidence || 50
      }));
    } catch (error) {
      console.error('Failed to generate development guidance:', error);
      return [];
    }
  }

  async balancePersonalityChemistry(
    persona: Persona,
    currentContent: string,
    knowledgeSources: Source[]
  ): Promise<{ alignmentScore: number; recommendations: string[] }> {
    if (!persona.personalityProfile) {
      return { alignmentScore: 0, recommendations: ['Persona not calibrated'] };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const profile = persona.personalityProfile;
    const knowledgeContext = knowledgeSources.map(s =>
      `${s.name}: ${s.content.substring(0, 300)}...`
    ).join('\n\n');

    const prompt = `Evaluate how well this document aligns with ${persona.name} ${persona.surname}'s personality profile.

PERSONALITY PROFILE:
- Core Traits: ${profile.coreTraits.join(', ')}
- Communication Style: ${profile.communicationStyle}
- Decision Framework: ${profile.decisionFramework}
- Worldview: ${profile.worldview}
- Expertise Areas: ${profile.expertiseAreas.join(', ')}
- Behavioral Patterns: ${profile.behavioralPatterns.join(', ')}
- Value System: ${profile.valueSystem.join(', ')}

DOCUMENT CONTENT:
${currentContent}

KNOWLEDGE CONTEXT:
${knowledgeContext}

Analyze the alignment and provide:
1. An alignment score (0-100)
2. 3-5 specific recommendations to better align the document with the personality

Format as JSON with "alignmentScore" and "recommendations" array.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to balance personality chemistry:', error);
      return {
        alignmentScore: 50,
        recommendations: ['Unable to analyze alignment at this time']
      };
    }
  }

  getEvolutionContext(persona: Persona, currentContent: string): string {
    if (!persona.documentSnapshots || persona.documentSnapshots.length === 0) {
      return '';
    }

    const recentSnapshots = persona.documentSnapshots.slice(-2);
    const evolutionContext = recentSnapshots.map(snapshot =>
      `Previous Version ${snapshot.version}: ${snapshot.contextSummary}`
    ).join('\n');

    return `\n\nDOCUMENT EVOLUTION CONTEXT:\n${evolutionContext}\n\nCurrent development focus: Maintain consistency with established direction while incorporating new insights.`;
  }
}