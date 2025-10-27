import React, { useState, useEffect } from 'react';
import { Persona, DevelopmentGuidance, Source } from '../types';
import { DocumentEvolutionService } from '../services/documentEvolutionService';
import SparkleIcon from './icons/SparkleIcon';
import CloseIcon from './icons/CloseIcon';

interface DevelopmentGuidancePanelProps {
  persona: Persona;
  currentContent: string;
  knowledgeSources: Source[];
  onClose: () => void;
}

const DevelopmentGuidancePanel: React.FC<DevelopmentGuidancePanelProps> = ({
  persona,
  currentContent,
  knowledgeSources,
  onClose
}) => {
  const [guidance, setGuidance] = useState<DevelopmentGuidance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGuidance, setSelectedGuidance] = useState<DevelopmentGuidance | null>(null);

  const evolutionService = DocumentEvolutionService.getInstance();

  useEffect(() => {
    loadGuidance();
  }, [persona, currentContent, knowledgeSources]);

  const loadGuidance = async () => {
    if (!currentContent.trim() || !persona.documentSnapshots) return;

    setIsLoading(true);
    try {
      const newGuidance = await evolutionService.generateDevelopmentGuidance(
        persona,
        currentContent,
        knowledgeSources,
        persona.documentSnapshots
      );
      setGuidance(newGuidance);
    } catch (error) {
      console.error('Failed to load guidance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyGuidance = (guidanceItem: DevelopmentGuidance) => {
    // Mark as applied
    setGuidance(prev => prev.map(g =>
      g.id === guidanceItem.id ? { ...g, applied: true } : g
    ));

    // Copy suggestion to clipboard for easy application
    navigator.clipboard.writeText(guidanceItem.content);
    alert('Suggestion copied to clipboard! You can now paste it into your document.');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return '💡';
      case 'improvement': return '⬆️';
      case 'refinement': return '🔧';
      case 'validation': return '✅';
      default: return '💭';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">AI Development Guidance</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-400">Generating guidance...</div>
            </div>
          ) : guidance.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <SparkleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No guidance available yet.</p>
              <p className="text-sm">Generate a document and make some edits to see AI suggestions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {guidance.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    item.applied
                      ? 'bg-slate-700/50 border-slate-600'
                      : 'bg-slate-700/30 border-slate-600 hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <span className="text-sm font-medium text-slate-300 capitalize">{item.type}</span>
                      <span className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                        {item.confidence}% confidence
                      </span>
                    </div>
                    {!item.applied && (
                      <button
                        onClick={() => handleApplyGuidance(item)}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                    {item.applied && (
                      <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{item.content}</p>
                  <div className="text-xs text-slate-500 mt-2">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-700 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Guidance based on {persona.name}'s personality and document evolution</span>
            <button
              onClick={loadGuidance}
              disabled={isLoading}
              className="px-3 py-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 disabled:opacity-50"
            >
              Refresh Guidance
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DevelopmentGuidancePanel;