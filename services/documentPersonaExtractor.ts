import { GoogleGenerativeAI } from '@google/generative-ai';
import { Source } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface ExtractedPersonaInfo {
  name: string;
  surname: string;
  role: string;
  bio: string;
}

export class DocumentPersonaExtractor {
  private static instance: DocumentPersonaExtractor;

  private constructor() {}

  static getInstance(): DocumentPersonaExtractor {
    if (!DocumentPersonaExtractor.instance) {
      DocumentPersonaExtractor.instance = new DocumentPersonaExtractor();
    }
    return DocumentPersonaExtractor.instance;
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
   * Check if document content is likely to be extractable
   */
  private isContentExtractable(content: string): boolean {
    // Check if content exists and has meaningful length
    if (!content || content.trim().length < 50) {
      return false;
    }
    
    // Check if content contains actual text (not just special characters or notes)
    const textContent = content.replace(/\[Note:.*?\]/g, '').trim();
    return textContent.length > 50;
  }

  /**
   * Extract persona information from a single document
   */
  async extractPersonaInfoFromDocument(source: Source): Promise<ExtractedPersonaInfo> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Check if content is extractable
    if (!this.isContentExtractable(source.content)) {
      // Return default values with informative message
      const fileName = source.name.replace(/\.pdf$/, '').replace(/_/g, ' ');
      return {
        name: fileName.split(' ')[0] || 'Document',
        surname: fileName.split(' ').slice(1).join(' ') || 'Expert',
        role: 'Subject Matter Expert',
        bio: `An expert persona based on the document "${source.name}". Note: The document appears to be a scanned image without selectable text, so detailed content analysis is not possible.`
      };
    }
    
    // Use a portion of the document content for analysis and clean it
    const cleanedContent = this.cleanDocumentContent(source.content);
    const documentContent = cleanedContent.substring(0, 3000);

    const prompt = `Based on the following document, extract persona information that would best represent the subject of this document.
    
Document Title: ${source.name}
Document Content:
${documentContent}

Please provide the following information in JSON format:
{
  "name": "First name of the person (if identifiable) or a suitable generic name",
  "surname": "Last name of the person (if identifiable) or leave empty if not applicable",
  "role": "Professional role or title that best represents this person's expertise or occupation",
  "bio": "A detailed biography (4-5 sentences) describing this person's background, expertise, achievements, and perspective based on the document content. Focus on their key contributions and areas of expertise."
}

If the document is about a specific person, extract information about that person. If it's a general topic, create a persona that represents an expert in that field.

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
      
      // If we get the default "Document Expert" response, try to be more specific
      if (personaData.name === 'Document' && personaData.surname === 'Expert') {
        // Try to extract a more meaningful name from the document title or content
        const titleBasedName = source.name.replace(/\.md$/, '').replace(/_/g, ' ');
        if (titleBasedName && titleBasedName.length > 0 && titleBasedName !== 'Document') {
          personaData.name = titleBasedName.split(' ')[0] || 'Subject';
          personaData.surname = titleBasedName.split(' ').slice(1).join(' ') || 'Expert';
        }
      }
      
      return {
        name: personaData.name || 'Subject',
        surname: personaData.surname || 'Expert',
        role: personaData.role || 'Subject Matter Expert',
        bio: personaData.bio || `An expert in the subject matter of the document "${source.name}".`
      };
    } catch (error) {
      console.error('Failed to extract persona info from document:', error);
      // Return more meaningful default values based on document name
      const titleBasedName = source.name.replace(/\.md$/, '').replace(/_/g, ' ');
      return {
        name: titleBasedName.split(' ')[0] || 'Subject',
        surname: titleBasedName.split(' ').slice(1).join(' ') || 'Expert',
        role: 'Subject Matter Expert',
        bio: `An expert in the subject matter of the document "${source.name}".`
      };
    }
  }

  /**
   * Extract persona information from multiple documents
   */
  async extractPersonaInfoFromDocuments(sources: Source[]): Promise<ExtractedPersonaInfo> {
    if (sources.length === 0) {
      throw new Error('At least one source document is required');
    }

    // Check if any content is extractable
    const extractableSources = sources.filter(source => this.isContentExtractable(source.content));
    
    if (extractableSources.length === 0) {
      // If no extractable content, create a generic persona
      const fileName = sources[0].name.replace(/\.pdf$/, '').replace(/_/g, ' ');
      return {
        name: fileName.split(' ')[0] || 'Knowledge',
        surname: fileName.split(' ').slice(1).join(' ') || 'Synthesizer',
        role: 'Multidisciplinary Expert',
        bio: `An expert persona based on ${sources.length} documents. Note: The documents appear to be scanned images without selectable text, so detailed content analysis is not possible.`
      };
    }

    // If only one document is extractable, use the single document extraction
    if (extractableSources.length === 1) {
      return this.extractPersonaInfoFromDocument(extractableSources[0]);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Combine sources content for analysis (clean each one)
    const combinedContent = extractableSources.map(source => {
      const cleanedContent = this.cleanDocumentContent(source.content);
      return `Document: ${source.name}\nContent: ${cleanedContent.substring(0, 1500)}`;
    }).join('\n\n---\n\n');

    const prompt = `Based on the following documents, create persona information that best represents the collective knowledge and perspective contained within them.
    
Documents:
${combinedContent}

Please provide the following information in JSON format:
{
  "name": "First name for a persona that represents the collective expertise",
  "surname": "Last name for the persona",
  "role": "Professional role or title that best represents the combined knowledge domain",
  "bio": "A detailed biography (4-5 sentences) describing the persona's background, expertise, and perspective based on all documents. Highlight how the different documents contribute to this persona's expertise."
}

If the documents are about a specific person, focus on that person. If they cover different topics, create a multidisciplinary expert persona.

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
      
      return {
        name: personaData.name || 'Knowledge',
        surname: personaData.surname || 'Synthesizer',
        role: personaData.role || 'Multidisciplinary Expert',
        bio: personaData.bio || 'An expert persona generated from multiple provided documents.'
      };
    } catch (error) {
      console.error('Failed to extract persona info from documents:', error);
      // Return default values if extraction fails
      return {
        name: 'Knowledge',
        surname: 'Synthesizer',
        role: 'Multidisciplinary Expert',
        bio: 'An expert persona generated from multiple provided documents.'
      };
    }
  }

  /**
   * Extract and merge persona information when adding new documents to an existing persona
   */
  async updatePersonaInfoWithNewDocuments(existingInfo: ExtractedPersonaInfo, newSources: Source[]): Promise<ExtractedPersonaInfo> {
    // Check if any new sources have extractable content
    const extractableSources = newSources.filter(source => this.isContentExtractable(source.content));
    
    if (extractableSources.length === 0) {
      // If no extractable content, return existing info with a note
      return {
        ...existingInfo,
        bio: existingInfo.bio + ` Note: Additional documents were added but appear to be scanned images without selectable text.`
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Combine new sources content for analysis (clean each one)
    const newContent = extractableSources.map(source => {
      const cleanedContent = this.cleanDocumentContent(source.content);
      return `Document: ${source.name}\nContent: ${cleanedContent.substring(0, 1000)}`;
    }).join('\n\n---\n\n');

    const prompt = `Based on the existing persona information and the new documents, update the persona information to reflect the expanded knowledge base.
    
Existing Persona:
Name: ${existingInfo.name}
Surname: ${existingInfo.surname}
Role: ${existingInfo.role}
Bio: ${existingInfo.bio}

New Documents:
${newContent}

Please provide updated persona information in JSON format that incorporates insights from the new documents:
{
  "name": "Updated first name if needed",
  "surname": "Updated last name if needed",
  "role": "Updated role that reflects the expanded expertise",
  "bio": "An updated biography (4-5 sentences) that incorporates insights from the new documents while maintaining continuity with the existing persona."
}

Respond ONLY with the JSON object. Do not include any other text.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse updated persona details from AI response');
      }
      
      const personaData = JSON.parse(jsonMatch[0]);
      
      return {
        name: personaData.name || existingInfo.name,
        surname: personaData.surname || existingInfo.surname,
        role: personaData.role || existingInfo.role,
        bio: personaData.bio || existingInfo.bio
      };
    } catch (error) {
      console.error('Failed to update persona info with new documents:', error);
      // Return existing info if update fails
      return existingInfo;
    }
  }
}