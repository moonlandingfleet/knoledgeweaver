export enum AnalysisTask {
  SYNTHESIZE_DRAFT = 'Synthesize Draft',
  CONVERSATIONAL_RESPONSE = 'Conversational Response',
  OUTLINE = 'Outline',
  CONCEPTS = 'Key Concepts',
  SUMMARY = 'Summarize',
  RELATIONSHIPS = 'Analyze Relationships',
}

export interface Source {
  id: string;
  name: string;
  content: string;
}

export interface PersonalityProfile {
  coreTraits: string[];
  communicationStyle: string;
  decisionFramework: string;
  worldview: string;
  expertiseAreas: string[];
  behavioralPatterns: string[];
  valueSystem: string[];
}

export interface DocumentSnapshot {
  id: string;
  timestamp: string;
  content: string;
  version: number;
  changes: string[];
  contextSummary: string;
}

export interface DevelopmentGuidance {
  id: string;
  timestamp: string;
  type: 'suggestion' | 'improvement' | 'refinement' | 'validation';
  content: string;
  applied: boolean;
  confidence: number;
}

export interface PersonaWeights {
  personality: number; // 0-1 scale
  knowledge: number; // 0-1 scale
  documentContext: number; // 0-1 scale
}

export interface Persona {
  id: string;
  name: string;
  surname: string;
  role: string;
  bio: string;
  shaperSources: Source[];
  personalityProfile?: PersonalityProfile;
  calibrationStatus: 'uncalibrated' | 'calibrating' | 'calibrated';
  lastCalibrated?: string;
  weights?: PersonaWeights;
  documentSnapshots?: DocumentSnapshot[];
  developmentGuidance?: DevelopmentGuidance[];
  personalityChemistry?: {
    alignmentScore: number;
    lastBalanced: string;
    evolutionHistory: string[];
  };
}