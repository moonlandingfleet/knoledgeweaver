import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona, Source } from '../types';
import { PersonaCalibrationService } from './personaCalibrationService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level: number; // Heading level (1-6)
  position: number; // Position in document
  wordCount: number;
}

export interface StructuredDocument {
  id: string;
  title: string;
  sections: DocumentSection[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  content: string;
  changes: string[]; // Summary of changes
  timestamp: string;
  author: string; // Persona name
}

export class StructuredDocumentService {
  private static instance: StructuredDocumentService;
  private calibrationService: PersonaCalibrationService;

  private constructor() {
    this.calibrationService = PersonaCalibrationService.getInstance();
  }

  static getInstance(): StructuredDocumentService {
    if (!StructuredDocumentService.instance) {
      StructuredDocumentService.instance = new StructuredDocumentService();
    }
    return StructuredDocumentService.instance;
  }

  /**
   * Create a structured document from plain text by identifying sections
   */
  async createStructuredDocument(content: string, title: string = 'Untitled Document'): Promise<StructuredDocument> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Extract sections from document
    const sectionPrompt = `Analyze this document and identify its sections with headings:
    
Document:
${content}

Please provide a JSON array of sections with:
- id: a unique identifier for the section
- title: the section heading
- content: the section content
- level: heading level (1-6)
- position: position in document (0-based)
- wordCount: number of words in section

Respond ONLY with the JSON array:`;

    let sections: DocumentSection[] = [];
    try {
      const result = await model.generateContent(sectionPrompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        sections = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse sections:', error);
      // Fallback: create a single section with all content
      sections = [{
        id: 'section-0',
        title: 'Main Content',
        content: content,
        level: 1,
        position: 0,
        wordCount: content.split(' ').length
      }];
    }

    const structuredDocument: StructuredDocument = {
      id: `doc-${Date.now()}`,
      title,
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return structuredDocument;
  }

  /**
   * Edit a specific section of a structured document
   */
  async editSection(
    document: StructuredDocument,
    sectionId: string,
    instruction: string,
    persona: Persona,
    knowledgeSources: Source[]
  ): Promise<DocumentSection> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const section = document.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section with id ${sectionId} not found`);
    }

    // Prepare knowledge context
    const knowledgeContext = knowledgeSources.map(source => 
      `${source.name}: ${source.content.substring(0, 500)}...`
    ).join('\n\n');
    
    // Get persona instruction
    const personaInstruction = this.calibrationService.isPersonaCalibrated(persona)
      ? this.calibrationService.generateEnhancedSystemInstruction(persona, knowledgeSources)
      : `You are ${persona.name} ${persona.surname}, a ${persona.role}.`;
    
    const prompt = `${personaInstruction}

TASK: Edit the following SECTION of a document according to the provided INSTRUCTION.

DOCUMENT TITLE: ${document.title}

SECTION TITLE: ${section.title}

SECTION CONTENT:
${section.content}

USER INSTRUCTION:
${instruction}

KNOWLEDGE BASE:
${knowledgeContext}

INSTRUCTIONS:
1. Edit ONLY the specified section
2. Maintain consistency with the document's overall tone and style
3. Apply your persona's expertise and perspective
4. Use the knowledge base to inform your edits
5. Respond ONLY with the edited section content

EDITED SECTION:`;

    try {
      const result = await model.generateContent(prompt);
      const editedContent = result.response.text().trim();
      
      // Update the section
      const updatedSection: DocumentSection = {
        ...section,
        content: editedContent,
        wordCount: editedContent.split(' ').length,
        position: section.position // Keep position the same
      };
      
      return updatedSection;
    } catch (error) {
      console.error('Failed to edit section:', error);
      throw new Error('Failed to edit document section');
    }
  }

  /**
   * Create a new version of a document with changes
   */
  createDocumentVersion(
    documentId: string,
    content: string,
    changes: string[],
    versionNumber: number,
    author: string
  ): DocumentVersion {
    const version: DocumentVersion = {
      id: `version-${documentId}-${versionNumber}`,
      documentId,
      versionNumber,
      content,
      changes,
      timestamp: new Date().toISOString(),
      author
    };
    
    // Save to localStorage
    try {
      const versions = this.getDocumentVersions(documentId);
      versions.push(version);
      localStorage.setItem(`document-versions-${documentId}`, JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save document version:', error);
    }
    
    return version;
  }

  /**
   * Get all versions of a document
   */
  getDocumentVersions(documentId: string): DocumentVersion[] {
    try {
      const stored = localStorage.getItem(`document-versions-${documentId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load document versions:', error);
    }
    return [];
  }

  /**
   * Get a specific version of a document
   */
  getDocumentVersion(documentId: string, versionNumber: number): DocumentVersion | undefined {
    const versions = this.getDocumentVersions(documentId);
    return versions.find(v => v.versionNumber === versionNumber);
  }

  /**
   * Generate a document from sources with a specific prompt
   */
  async generateDocumentFromSources(
    sources: Source[],
    prompt: string,
    persona: Persona
  ): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Prepare knowledge context
    const knowledgeContext = sources.map(source => 
      `${source.name}:\n${source.content}`
    ).join('\n\n---\n\n');
    
    // Get persona instruction
    const personaInstruction = this.calibrationService.isPersonaCalibrated(persona)
      ? this.calibrationService.generateEnhancedSystemInstruction(persona, sources)
      : `You are ${persona.name} ${persona.surname}, a ${persona.role}.`;
    
    const generationPrompt = `${personaInstruction}

TASK: ${prompt}

KNOWLEDGE BASE:
${knowledgeContext}

Please create a document based on the above information and instructions.
Document:`;

    try {
      const result = await model.generateContent(generationPrompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Failed to generate document:', error);
      throw new Error('Failed to generate document from sources');
    }
  }
}