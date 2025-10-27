import React, { useState } from 'react';
import { Source, Persona } from '../types';
import { KnowledgePathwayReference } from '../services/advancedKnowledgeIngestionService';
import { SelectivePathwayProcessingService } from '../services/selectivePathwayProcessingService';
import KnowledgePathwayManager from './KnowledgePathwayManager';

interface SelectivePathwayProcessorProps {
  sources: Source[];
  persona: Persona;
  onContentGenerated: (content: string) => void;
  onClose: () => void;
}

const SelectivePathwayProcessor: React.FC<SelectivePathwayProcessorProps> = ({
  sources,
  persona,
  onContentGenerated,
  onClose
}) => {
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [isPathwayManagerOpen, setIsPathwayManagerOpen] = useState<boolean>(false);
  const [selectedPathways, setSelectedPathways] = useState<KnowledgePathwayReference[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');

  const selectivePathwayService = SelectivePathwayProcessingService.getInstance();

  const handlePathwaySelection = (pathways: KnowledgePathwayReference[]) => {
    setSelectedPathways(pathways);
    setIsPathwayManagerOpen(false);
  };

  const handleProcess = async () => {
    if (!taskDescription.trim()) {
      setError('Please enter a task description');
      return;
    }

    if (selectedPathways.length === 0) {
      setError('Please select at least one pathway');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const processingResult = await selectivePathwayService.processWithSelectedPathways(
        persona,
        sources,
        selectedPathways,
        taskDescription
      );

      setResult(processingResult.generatedContent);
    } catch (err) {
      setError('Failed to process with selected pathways');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onContentGenerated(result);
    onClose();
  };

  const getSourceName = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    return source ? source.name : 'Unknown Source';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Selective Pathway Processing</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="task" className="block text-sm font-medium text-slate-300 mb-1">
              Task Description
            </label>
            <textarea
              id="task"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what you want to accomplish with the selected pathways..."
            />
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsPathwayManagerOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Select Pathways ({selectedPathways.length})
            </button>
            
            <button
              onClick={handleProcess}
              disabled={isProcessing || !taskDescription.trim() || selectedPathways.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process with Pathways'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900 text-red-100">
            {error}
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto p-6">
          {selectedPathways.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Selected Pathways</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedPathways.map((pathway, index) => (
                  <div key={`${pathway.sourceId}-${pathway.pathwayId}`} className="p-3 bg-slate-750 rounded-md border border-slate-700">
                    <div className="font-medium text-slate-100">
                      {pathway.pathwayId} - {getSourceName(pathway.sourceId)}
                    </div>
                    <div className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {pathway.context}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {result && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Generated Content</h3>
              <div className="p-4 bg-slate-750 rounded-md border border-slate-700">
                <pre className="whitespace-pre-wrap text-slate-300 font-sans">
                  {result}
                </pre>
              </div>
            </div>
          )}
          
          {!result && !isProcessing && selectedPathways.length > 0 && (
            <div className="text-center py-8 text-slate-400">
              Click "Process with Pathways" to generate content based on your selected pathways
            </div>
          )}
          
          {!result && !isProcessing && selectedPathways.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              Select pathways to begin processing
            </div>
          )}
          
          {isProcessing && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-3"></div>
              <p className="text-slate-300">Processing with selected pathways...</p>
            </div>
          )}
        </div>
        
        {result && (
          <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Apply to Document
            </button>
          </div>
        )}
      </div>
      
      {isPathwayManagerOpen && (
        <KnowledgePathwayManager
          sources={sources}
          onPathwaySelect={handlePathwaySelection}
          onClose={() => setIsPathwayManagerOpen(false)}
        />
      )}
    </div>
  );
};

export default SelectivePathwayProcessor;