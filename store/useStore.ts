import create from 'zustand';
import { Persona, Source, DocumentSnapshot } from '../types';

interface AppState {
  personas: Persona[];
  activePersonaId: string | null;
  knowledgeSources: Source[];
  generatedContent: string;
  snapshots: DocumentSnapshot[];
  setPersonas: (personas: Persona[]) => void;
  setActivePersonaId: (id: string | null) => void;
  setKnowledgeSources: (sources: Source[]) => void;
  setGeneratedContent: (content: string) => void;
  setSnapshots: (snapshots: DocumentSnapshot[]) => void;
}

export const useStore = create<AppState>((set) => ({
  personas: [],
  activePersonaId: null,
  knowledgeSources: [],
  generatedContent: '',
  snapshots: [],
  setPersonas: (personas) => set({ personas }),
  setActivePersonaId: (id) => set({ activePersonaId: id }),
  setKnowledgeSources: (sources) => set({ knowledgeSources: sources }),
  setGeneratedContent: (content) => set({ generatedContent: content }),
  setSnapshots: (snapshots) => set({ snapshots }),
}));
