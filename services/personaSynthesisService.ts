import { GoogleGenerativeAI } from '@google/generative-ai';
import { Source, Persona } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export class PersonaSynthesisService {
  private static instance: PersonaSynthesisService;

  private constructor() {}

  static getInstance(): PersonaSynthesisService {
    if (!PersonaSynthesisService.instance) {
      PersonaSynthesisService.instance = new PersonaSynthesisService();
    }
    return PersonaSynthesisService.instance;
  }

  /**
   * Clean document content by removing citation markers and other noise
   */
  private cleanDocumentContent(content: string): string {
    // Remove citation markers like [1†], [2†], etc.
    return content
      .replace(/\[\d+†\]/g, '')
      .replace(/\[website\]/g, '')
      .replace(/\[archive\]/g, '')
      .replace(/\[link\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Automatically generate a persona from knowledge sources
   */
  async synthesizePersonaFromSources(sources: Source[]): Promise<Partial<Persona>> {
    if (sources.length === 0) {
      throw new Error('At least one source document is required to synthesize a persona');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Combine sources content for analysis (limit to prevent token overflow and clean content)
    const combinedContent = sources.map(source => {
      const cleanedContent = this.cleanDocumentContent(source.content);
      return `Document: ${source.name}\nContent: ${cleanedContent.substring(0, 3000)}`;
    }).join('\n\n---\n\n');

    // Generate persona details
    const prompt = `Based on the following documents, create a persona that embodies the knowledge and perspective contained within them.
    
Documents:
${combinedContent}

Please provide the following information about this persona in JSON format:
{
  "name": "First name of the main subject if it's a person, or a descriptive name if it's a topic",
  "surname": "Last name of the main subject if applicable, or leave empty",
  "role": "Professional role or title that best represents the knowledge domain (e.g., 'Venezuelan Novelist', 'AI Researcher', 'Historian')",
  "bio": "A detailed biography (4-5 sentences) describing the persona's background, expertise, achievements, and perspective based on the documents. Include specific examples of their work or contributions."
}

If the documents are about a specific person, focus on that person. If they're about a general topic, create a persona that represents an expert in that field.

Respond ONLY with the JSON object. Do not include any other text.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse persona details from AI response');
      }
      
      const personaData = JSON.parse(jsonMatch[0]);
      
      // If we get generic names, try to be more specific based on document names
      if (personaData.name === 'Generated Persona' || personaData.name === 'Document') {
        // Try to extract a more meaningful name from the first document's title
        const firstDocName = sources[0].name.replace(/\.md$/, '').replace(/_/g, ' ');
        if (firstDocName && firstDocName.length > 0) {
          const nameParts = firstDocName.split(' ');
          personaData.name = nameParts[0] || 'Subject';
          personaData.surname = nameParts.slice(1).join(' ') || 'Expert';
        }
      }
      
      return {
        name: personaData.name || 'Subject',
        surname: personaData.surname || 'Expert',
        role: personaData.role || 'Subject Matter Expert',
        bio: personaData.bio || `An expert persona generated from the document "${sources[0].name}".`,
        shaperSources: sources
      };
    } catch (error) {
      console.error('Failed to synthesize persona:', error);
      // Return a more meaningful default persona based on document names
      const firstDocName = sources[0].name.replace(/\.md$/, '').replace(/_/g, ' ');
      const nameParts = firstDocName.split(' ');
      const firstName = nameParts[0] || 'Subject';
      const lastName = nameParts.slice(1).join(' ') || 'Expert';
      
      return {
        name: firstName,
        surname: lastName,
        role: 'Subject Matter Expert',
        bio: `An expert persona generated from the document "${sources[0].name}".`,
        shaperSources: sources
      };
    }
  }

  /**
   * Extract key themes and values from sources to build persona's moral compass
   */
  async extractPersonaValues(sources: Source[]): Promise<string[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Clean and combine content
    const combinedContent = sources.map(source => {
      const cleanedContent = this.cleanDocumentContent(source.content);
      return `Document: ${source.name}\nContent: ${cleanedContent.substring(0, 1500)}`;
    }).join('\n\n---\n\n');

    const prompt = `Based on the following documents, identify 5-8 core values or principles that represent the underlying themes and perspectives in the content.
    
Documents:
${combinedContent}

Respond ONLY with a JSON array of strings representing these values. For example:
["Integrity", "Innovation", "Collaboration"]

Focus on values that are explicitly mentioned or strongly implied by the content.

Do not include any other text in your response.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse values from AI response');
      }
      
      const values = JSON.parse(jsonMatch[0]);
      return Array.isArray(values) ? values : [];
    } catch (error) {
      console.error('Failed to extract persona values:', error);
      // Return more contextually relevant default values
      if (sources.length > 0) {
        const firstDocName = sources[0].name.toLowerCase();
        if (firstDocName.includes('biography') || firstDocName.includes('life')) {
          return ['Integrity', 'Perseverance', 'Knowledge', 'Creativity', 'Authenticity'];
        } else if (firstDocName.includes('history') || firstDocName.includes('histor')) {
          return ['Accuracy', 'Objectivity', 'Context', 'Evidence', 'Analysis'];
        } else if (firstDocName.includes('tech') || firstDocName.includes('science')) {
          return ['Innovation', 'Precision', 'Evidence', 'Progress', 'Collaboration'];
        }
      }
      return ['Knowledge', 'Integrity', 'Expertise', 'Analysis', 'Communication'];
    }
  }

  /**
   * Update an existing persona's biography based on new sources
   */
  async updatePersonaBio(persona: Persona, newSources: Source[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Combine existing shaper sources and new sources (clean content)
    const allSources = [...persona.shaperSources, ...newSources];
    const combinedContent = allSources.map(source => {
      const cleanedContent = this.cleanDocumentContent(source.content);
      return `Document: ${source.name}\nContent: ${cleanedContent.substring(0, 2000)}`;
    }).join('\n\n---\n\n');

    const prompt = `Based on all the documents provided, update the biography for ${persona.name} ${persona.surname}, who is a ${persona.role}.
    
Current Biography:
${persona.bio}

All Documents:
${combinedContent}

Please provide an updated biography (4-5 sentences) that incorporates insights from all documents, including the new ones. 
The updated biography should:
1. Reflect the persona's evolving expertise
2. Include specific examples from the documents that shaped this persona's worldview
3. Show how the new documents add to or refine the persona's perspective

Respond ONLY with the updated biography text. Do not include any other text.`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Failed to update persona bio:', error);
      return persona.bio; // Return original bio if update fails
    }
  }

  /**
   * Generate a comprehensive persona with full details
   */
  async generateFullPersona(sources: Source[]): Promise<Persona> {
    // Get basic persona details
    const basicPersona = await this.synthesizePersonaFromSources(sources);
    
    // Get persona values
    const values = await this.extractPersonaValues(sources);
    
    // Create full persona object
    const persona: Persona = {
      id: `persona-${Date.now()}`,
      name: basicPersona.name || 'Subject',
      surname: basicPersona.surname || 'Expert',
      role: basicPersona.role || 'Subject Matter Expert',
      bio: basicPersona.bio || `An expert persona generated from the document "${sources[0]?.name || 'provided documents'}.`,
      shaperSources: basicPersona.shaperSources || [],
      calibrationStatus: 'uncalibrated',
      personalityProfile: {
        coreTraits: values,
        communicationStyle: 'Professional and knowledgeable',
        decisionFramework: 'Evidence-based with consideration for ethical implications',
        worldview: `A perspective shaped by the values: ${values.join(', ')}`,
        expertiseAreas: [basicPersona.role || 'General Expertise'],
        behavioralPatterns: ['Analytical', 'Detail-oriented', 'Knowledgeable'],
        valueSystem: values
      }
    };
    
    return persona;
  }
}