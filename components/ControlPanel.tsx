import React, { useState, useCallback } from 'react';
import { Source, Persona } from '../types';
import TrashIcon from './icons/TrashIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import { AnalyticsService } from '../services/analyticsService';
import { parseFiles } from '../services/fileParser';

interface ControlPanelProps {
  activePersona: Persona | null;
  onManagePersonas: () => void;
  knowledgeSources: Source[];
  setKnowledgeSources: React.Dispatch<React.SetStateAction<Source[]>>;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
 activePersona,
  onManagePersonas,
  knowledgeSources,
  setKnowledgeSources,
  isLoading
}) => {
  const [textInput, setTextInput] = useState('');
  const TEXT_SOURCE_ID = 'text-input-source';

  const handleTextBlur = useCallback(() => {
    const existingSourceIndex = knowledgeSources.findIndex(s=> s.id === TEXT_SOURCE_ID);
    if (textInput.trim()) {
      const newSource: Source = { id: TEXT_SOURCE_ID, name: 'Text Input', content: textInput };
      if (existingSourceIndex > -1) {
        const newSources = [...knowledgeSources];
        newSources[existingSourceIndex] = newSource;
        setKnowledgeSources(newSources);
      } else {
        setKnowledgeSources([...knowledgeSources, newSource]);
      }
    } else if (existingSourceIndex > -1) {
      setKnowledgeSources(knowledgeSources.filter(s => s.id !== TEXT_SOURCE_ID));
    }
 }, [textInput, knowledgeSources, setKnowledgeSources]);

  const handleAddKnowledgeFiles = async (files: FileList) => {
    const newSources = await parseFiles(files);
    const currentIds = new Set(knowledgeSources.map(s => s.id));
    const uniqueNewSources = newSources.filter(s => !currentIds.has(s.id));
    setKnowledgeSources(prev => [...prev, ...uniqueNewSources]);

    // Track file uploads
    const analyticsService = AnalyticsService.getInstance();
    uniqueNewSources.forEach(source => {
      analyticsService.trackEvent({
        type: 'file_uploaded',
        timestamp: new Date().toISOString(),
       metadata:{
fileName: source.name,
          fileType: source.name.split('.').pop()?.toLowerCase(),
          contentLength: source.content.length
        }
      });
    });
  };

  const handleRemoveSource = (id: string) => {
    setKnowledgeSources(knowledgeSources.filter(s => s.id !== id));
if (id===TEXT_SOURCE_ID) setTextInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* PersonaProfile Section */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircleIcon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">ActivePersona</h2>
          </div>
        </div>
        {activePersona ? (
          <div className="space-y-3 bg-slate-900/50 p-3 rounded-lg">
            <h3 className="text-md font-semibold text-slate-100">{activePersona.name} {activePersona.surname}</h3>
            <p className="text-sm text-indigo-400">{activePersona.role}</p>
            <p className="text-xs text-slate-400 italic">
              {activePersona.shaperSources.length} shaper doc(s)loaded.
           </p>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-400 bg-slate-900/50 p-4 rounded-lg">
            No active persona. Select one to begin.
          </div>
        )}
        <button onClick={onManagePersonas}
          className="w-full px-4 py-2 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors"
        >
          Manage Personas
        </button>
      </div>
      
     <div className="p-4 border-t border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Knowledge Base</h3>
        <label className="cursor-pointer font-semibold text-indigo-400 hover:text-indigo-300 text-sm block text-center p-2 border border-dashed border-slate-600 rounded-md hover:border-indigo-500 transition-colors mb-2">
          Add Files
          <input 
            type="file" 
            multiple 
            className="hidden" 
            onChange={(e) =>e.target.files && handleAddKnowledgeFiles(e.target.files)} 
            accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.json" 
            disabled={isLoading}
          />
        </label>
        <div className="mt-3 max-h-40 overflow-y-auto">
          {knowledgeSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-300 truncate flex-1 mr-2" title={source.name}>
                {source.name}
              </span>
              <button 
               onClick={()=> handleRemoveSource(source.id)}
                className="text-slate-500 hover:text-red-400"
                title="Remove source"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          ))}
          {knowledgeSources.length === 0&&(
            <p className="text-sm text-slate-500 italic">No sources added yet</p>
          )}
        </div>
      </div>
      
      {/* Add new section for advanced processing */}
      <div className="p-4 border-t border-slate-700">
       <h3 className="text-sm font-semibold text-slate-300 mb-2">AdvancedProcessing</h3>
        <button
          className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!activePersona || knowledgeSources.length === 0}
>
          Selective Pathway Processing
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;