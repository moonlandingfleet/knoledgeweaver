import React, { useState, useEffect } from 'react';
import { Source } from '../types';
import { AdvancedKnowledgeIngestionService, KnowledgePathwayReference } from '../services/advancedKnowledgeIngestionService';

interface KnowledgePathwayManagerProps {
  sources: Source[];
  onPathwaySelect: (pathways: KnowledgePathwayReference[]) => void;
  onClose: () => void;
}

const KnowledgePathwayManager: React.FC<KnowledgePathwayManagerProps> = ({
  sources,
  onPathwaySelect,
  onClose
}) => {
  const [query, setQuery] = useState<string>('');
  const [pathways, setPathways] = useState<KnowledgePathwayReference[]>([]);
  const [selectedPathways, setSelectedPathways] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ingestionService = AdvancedKnowledgeIngestionService.getInstance();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const relevantPathways = await ingestionService.findRelevantPathways(sources, query);
      setPathways(relevantPathways);
    } catch (err) {
      setError('Failed to search for relevant pathways');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePathwayToggle = (pathwayId: string, sourceId: string) => {
    const key = `${sourceId}-${pathwayId}`;
    const newSelected = new Set(selectedPathways);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedPathways(newSelected);
  };

  const handleApply = () => {
    const selected = pathways.filter(p => 
      selectedPathways.has(`${p.sourceId}-${p.pathwayId}`)
    );
    onPathwaySelect(selected);
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
            <h2 className="text-2xl font-bold text-slate-100">Knowledge Pathway Manager</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for relevant knowledge pathways..."
              className="flex-grow px-4 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900 text-red-100">
            {error}
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto p-6">
          {pathways.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {query ? 'No relevant pathways found. Try a different search.' : 'Enter a query to find relevant knowledge pathways.'}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">
                Found {pathways.length} relevant pathways
              </h3>
              
              {pathways.map((pathway) => {
                const key = `${pathway.sourceId}-${pathway.pathwayId}`;
                const isSelected = selectedPathways.has(key);
                
                return (
                  <div 
                    key={key}
                    className={`p-4 rounded-lg border ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-900 bg-opacity-20' 
                        : 'border-slate-700 bg-slate-750'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePathwayToggle(pathway.pathwayId, pathway.sourceId)}
                        className="mt-1 mr-3 h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <h4 className="font-medium text-slate-100">
                            {pathway.pathwayId} - {getSourceName(pathway.sourceId)}
                          </h4>
                          <span className="text-sm px-2 py-1 bg-slate-700 text-slate-300 rounded">
                            {pathway.relevance}% relevant
                          </span>
                        </div>
                        <p className="mt-2 text-slate-300">
                          {pathway.context}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {pathways.length > 0 && (
          <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedPathways.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Selected Pathways ({selectedPathways.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePathwayManager;