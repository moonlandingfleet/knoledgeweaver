import { Persona, PersonalityProfile, Source } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface PersonaWeights {
  personality: number; // 0-1 scale
  knowledge: number; // 0-1 scale
  documentContext: number; // 0-1 scale
}

export class PersonaCalibrationService {
  private static instance: PersonaCalibrationService;

  static getInstance(): PersonaCalibrationService {
    if (!PersonaCalibrationService.instance) {
      PersonaCalibrationService.instance = new PersonaCalibrationService();
    }
    return PersonaCalibrationService.instance;
  }

  /**
   * Set weights for persona influence
   * @param persona The persona to update
   * @param weights The weights to set
   * @returns Updated persona with weights
   */
  setPersonaWeights(persona: Persona, weights: PersonaWeights): Persona {
    return {
      ...persona,
      weights: {
        personality: Math.max(0, Math.min(1, weights.personality || 0.15)),
        knowledge: Math.max(0, Math.min(1, weights.knowledge || 0.45)),
        documentContext: Math.max(0, Math.min(1, weights.documentContext || 0.40))
      }
    };
  }

  /**
   * Get persona weights with defaults
   * @param persona The persona to get weights for
   * @returns Persona weights with defaults if not set
   */
  getPersonaWeights(persona: Persona): PersonaWeights {
    if (persona.weights) {
      return {
        personality: Math.max(0, Math.min(1, persona.weights.personality)),
        knowledge: Math.max(0, Math.min(1, persona.weights.knowledge)),
        documentContext: Math.max(0, Math.min(1, persona.weights.documentContext))
      };
    }
    
    // Return default weights
    return {
      personality: 0.15,
      knowledge: 0.45,
      documentContext: 0.40
    };
  }

  async calibratePersona(persona: Persona): Promise<Persona> {
    if (persona.shaperSources.length === 0) {
      throw new Error('Persona must have shaper sources to calibrate');
    }

    try {
      // Extract personality profile from shaper sources
      const personalityProfile = await this.extractPersonalityProfile(persona);

      // Validate and refine the profile
      const refinedProfile = await this.refinePersonalityProfile(personalityProfile, persona);

      const updatedPersona: Persona = {
        ...persona,
        personalityProfile: refinedProfile,
        calibrationStatus: 'calibrated',
        lastCalibrated: new Date().toISOString()
      };

      return updatedPersona;
    } catch (error) {
      console.error('Calibration failed:', error);
      const updatedPersona: Persona = {
        ...persona,
        calibrationStatus: 'uncalibrated'
      };
      throw error;
    }
  }

  private async extractPersonalityProfile(persona: Persona): Promise<PersonalityProfile> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Combine shaper sources with more context (limit to prevent token overflow)
    const shaperContent = persona.shaperSources.map(s => 
      `Document: ${s.name}\nContent: ${s.content.substring(0, 2500)}`
    ).join('\n\n---\n\n');

    const prompt = `Analyze the following documents and extract a comprehensive personality profile for ${persona.name} ${persona.surname}, who is a ${persona.role}.

BIOGRAPHY: ${persona.bio}

SHAPER DOCUMENTS:
${shaperContent}

Please extract and structure the following personality components:

1. CORE TRAITS: List 6-10 fundamental personality traits that emerge from the documents
2. COMMUNICATION STYLE: Describe how this person communicates (formal/informal, direct/indirect, technical/layperson, etc.)
3. DECISION FRAMEWORK: How does this person make decisions? What factors do they consider?
4. WORLDVIEW: Core beliefs and perspective on the world based on the documents
5. EXPERTISE AREAS: Specific domains of knowledge and skill (3-5 areas)
6. BEHAVIORAL PATTERNS: Typical behaviors and approaches (3-5 patterns)
7. VALUE SYSTEM: Core values that guide actions (5-8 values)

Format as JSON with these exact keys: coreTraits, communicationStyle, decisionFramework, worldview, expertiseAreas, behavioralPatterns, valueSystem`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const profile = JSON.parse(jsonMatch[0]);

      return {
        coreTraits: Array.isArray(profile.coreTraits) ? profile.coreTraits : [],
        communicationStyle: profile.communicationStyle || '',
        decisionFramework: profile.decisionFramework || '',
        worldview: profile.worldview || '',
        expertiseAreas: Array.isArray(profile.expertiseAreas) ? profile.expertiseAreas : [],
        behavioralPatterns: Array.isArray(profile.behavioralPatterns) ? profile.behavioralPatterns : [],
        valueSystem: Array.isArray(profile.valueSystem) ? profile.valueSystem : []
      };
    } catch (error) {
      console.error('Failed to parse personality profile:', error);
      throw new Error('Failed to extract personality profile from AI response');
    }
  }

  private async refinePersonalityProfile(profile: PersonalityProfile, persona: Persona): Promise<PersonalityProfile> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Refine and validate this personality profile for ${persona.name} ${persona.surname} (${persona.role}).

CURRENT PROFILE:
${JSON.stringify(profile, null, 2)}

Ensure the profile is:
1. Consistent with the role and biography
2. Comprehensive but not verbose
3. Actionable for AI persona simulation
4. Free of contradictions
5. Balanced - not too extreme in any dimension

Return the refined profile as JSON with the same structure.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('Refinement failed, using original profile');
      return profile;
    }
  }

  generateEnhancedSystemInstruction(persona: Persona, knowledgeSources: Source[]): string {
    if (!persona.personalityProfile || persona.calibrationStatus !== 'calibrated') {
      // Fallback to basic instruction if not calibrated
      return `You are ${persona.name} ${persona.surname}, a ${persona.role}. ${persona.bio || ''}`;
    }

    const profile = persona.personalityProfile;
    const weights = this.getPersonaWeights(persona);
    
    const knowledgeText = knowledgeSources.length > 0
      ? '\n\nKNOWLEDGE BASE:\n' + knowledgeSources.map(s => `${s.name}: ${s.content.substring(0, 1000)}...`).join('\n')
      : '';

    return `You are ${persona.name} ${persona.surname}, embodying the role of ${persona.role}.

BIOGRAPHY & BACKGROUND:
${persona.bio}

CORE PERSONALITY PROFILE (Influence Weight: ${(weights.personality * 100).toFixed(0)}%):
- Core Traits: ${profile.coreTraits.join(', ')}
- Communication Style: ${profile.communicationStyle}
- Decision Framework: ${profile.decisionFramework}
- Worldview: ${profile.worldview}
- Expertise Areas: ${profile.expertiseAreas.join(', ')}
- Behavioral Patterns: ${profile.behavioralPatterns.join(', ')}
- Value System: ${profile.valueSystem.join(', ')}

KNOWLEDGE BASE INFLUENCE: ${(weights.knowledge * 100).toFixed(0)}%
${knowledgeText}

DOCUMENT CONTEXT INFLUENCE: ${(weights.documentContext * 100).toFixed(0)}%

INSTRUCTIONAL GUIDELINES:
1. **Personality Integration**: Every response must authentically reflect your core traits and communication style
2. **Decision Making**: Apply your decision framework to analyze information and form conclusions
3. **Worldview Application**: Filter all analysis through your established worldview and values
4. **Expertise Utilization**: Draw upon your specific expertise areas when relevant
5. **Behavioral Consistency**: Exhibit your characteristic behavioral patterns throughout interactions

When responding:
- Lead with your personality-driven perspective (weighted at ${Math.round(weights.personality * 100)}%)
- Reference your background and experiences naturally
- Apply your decision framework to reasoning
- Maintain consistency with your value system
- Use your communication style authentically
- Incorporate relevant knowledge base information (weighted at ${Math.round(weights.knowledge * 100)}%)
- Consider the current document context (weighted at ${Math.round(weights.documentContext * 100)}%)

Remember: You are not simulating this persona - you ARE this persona. Every thought, response, and analysis must flow naturally from this deeply integrated personality.`;
  }

  isPersonaCalibrated(persona: Persona): boolean {
    return persona.calibrationStatus === 'calibrated' && !!persona.personalityProfile;
  }

  getCalibrationStatus(persona: Persona): { status: string; details: string } {
    switch (persona.calibrationStatus) {
      case 'calibrated':
        return {
          status: 'Calibrated',
          details: `Last calibrated: ${persona.lastCalibrated ? new Date(persona.lastCalibrated).toLocaleDateString() : 'Unknown'}`
        };
      case 'calibrating':
        return { status: 'Calibrating', details: 'Personality analysis in progress' };
      default:
        return {
          status: 'Uncalibrated',
          details: persona.shaperSources.length > 0 ? 'Ready for calibration' : 'Add shaper documents to calibrate'
        };
    }
  }
}