import React, { useState, useEffect } from 'react';
import { Persona, PersonaWeights } from '../types';

interface PersonaWeightsControlProps {
  persona: Persona;
  onWeightsChange: (weights: PersonaWeights) => void;
  onClose: () => void;
}

const PersonaWeightsControl: React.FC<PersonaWeightsControlProps> = ({
  persona,
  onWeightsChange,
  onClose
}) => {
  const [weights, setWeights] = useState<PersonaWeights>({
    personality: 0.15,
    knowledge: 0.45,
    documentContext: 0.40
  });

  useEffect(() => {
    if (persona.weights) {
      setWeights(persona.weights);
    }
  }, [persona]);

  const handleWeightChange = (weightType: keyof PersonaWeights, value: number) => {
    const newWeights = {
      ...weights,
      [weightType]: value
    };
    setWeights(newWeights);
  };

  const handleSave = () => {
    onWeightsChange(weights);
    onClose();
  };

  const totalWeight = weights.personality + weights.knowledge + weights.documentContext;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Persona Influence Weights</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <p className="text-slate-400">
            Adjust how much influence each component has on the persona's responses
          </p>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">
                Personality Influence ({(weights.personality * 100).toFixed(0)}%)
              </label>
              <span className="text-sm text-slate-400">
                {weights.personality.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.personality}
              onChange={(e) => handleWeightChange('personality', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              How much the persona's personality traits, values, and decision-making framework influence responses
            </p>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">
                Knowledge Base Influence ({(weights.knowledge * 100).toFixed(0)}%)
              </label>
              <span className="text-sm text-slate-400">
                {weights.knowledge.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.knowledge}
              onChange={(e) => handleWeightChange('knowledge', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              How much the uploaded documents and knowledge base influence responses
            </p>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">
                Document Context Influence ({(weights.documentContext * 100).toFixed(0)}%)
              </label>
              <span className="text-sm text-slate-400">
                {weights.documentContext.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.documentContext}
              onChange={(e) => handleWeightChange('documentContext', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              How much the current document being edited influences responses
            </p>
          </div>
          
          <div className="p-3 bg-slate-750 rounded-md border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Total Influence</span>
              <span className={`text-sm font-bold ${totalWeight === 1 ? 'text-green-400' : totalWeight > 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                {(totalWeight * 100).toFixed(0)}%
              </span>
            </div>
            {totalWeight !== 1 && (
              <p className="text-xs text-slate-500 mt-1">
                {totalWeight > 1 
                  ? 'Total exceeds 100%. Consider reducing some weights.' 
                  : 'Total is less than 100%. Consider increasing some weights.'}
              </p>
            )}
          </div>
          
          <div className="p-3 bg-slate-750 rounded-md border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Balanced (Default): 15% Personality, 45% Knowledge, 40% Context</li>
              <li>• Creative Writing: 25% Personality, 35% Knowledge, 40% Context</li>
              <li>• Technical Analysis: 10% Personality, 55% Knowledge, 35% Context</li>
              <li>• Opinion Piece: 30% Personality, 40% Knowledge, 30% Context</li>
            </ul>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={totalWeight !== 1}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Weights
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaWeightsControl;