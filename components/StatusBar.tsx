import React from 'react';
import { Persona, Source } from '../types';

interface StatusBarProps {
  activePersona: Persona | null;
  knowledgeSources: Source[];
  isLoading: boolean;
  isRefining: boolean;
  isCheckingQuality: boolean;
  isAskingQuestion?: boolean;
  generatedContent: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  activePersona,
  knowledgeSources,
  isLoading,
  isRefining,
  isCheckingQuality,
  isAskingQuestion = false,
  generatedContent
}) => {
  const getStatusMessage = () => {
    if (isLoading) return 'Generating document...';
    if (isRefining) return 'Refining document...';
    if (isCheckingQuality) return 'Analyzing quality...';
    if (isAskingQuestion) return 'Asking persona...';
    if (generatedContent) return 'Document ready';
    if (activePersona && knowledgeSources.length > 0) return 'Ready to generate';
    if (activePersona) return 'Add knowledge sources to begin';
    return 'Select or create a persona to begin';
  };

  const getStatusColor = () => {
    if (isLoading || isRefining || isCheckingQuality || isAskingQuestion) return 'text-indigo-400';
    if (generatedContent) return 'text-green-400';
    if (activePersona && knowledgeSources.length > 0) return 'text-yellow-400';
    return 'text-slate-500';
  };

  const stats = {
    personas: activePersona ? 1 : 0,
    sources: knowledgeSources.length,
    words: generatedContent.split(' ').length
  };

  return (
    <div className="border-t border-slate-700 bg-slate-900/50 px-4 py-2 flex items-center justify-between text-xs">
      <div className={`font-medium ${getStatusColor()}`}>
        {getStatusMessage()}
      </div>

      <div className="flex items-center gap-4 text-slate-500">
        {activePersona && (
          <span>Active: {activePersona.name} {activePersona.surname}</span>
        )}
        <span>{stats.sources} sources</span>
        {generatedContent && <span>{stats.words} words</span>}
        <span className="text-slate-600">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
