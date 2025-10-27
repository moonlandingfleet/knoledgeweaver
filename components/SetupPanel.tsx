import React from 'react';
import { Source, Persona } from '../types';
import PersonaPanel from './PersonaPanel';
import KnowledgePanel from './KnowledgePanel';

interface SetupPanelProps {
  activePersona: Persona | null;
  onManagePersonas: () => void;
  knowledgeSources: Source[];
  setKnowledgeSources: React.Dispatch<React.SetStateAction<Source[]>>;
  isLoading: boolean;
}

const SetupPanel: React.FC<SetupPanelProps> = ({
  activePersona,
  onManagePersonas,
  knowledgeSources,
  setKnowledgeSources,
  isLoading,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <PersonaPanel activePersona={activePersona} onManagePersonas={onManagePersonas} />
      <KnowledgePanel
        knowledgeSources={knowledgeSources}
        setKnowledgeSources={setKnowledgeSources}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SetupPanel;
