import React, { useState, useEffect, useMemo } from 'react';
import { Persona, Source } from '../types';
import { SearchService, SearchResult, SearchFilters } from '../services/searchService';
import CloseIcon from './icons/CloseIcon';
import DocumentPlusIcon from './icons/DocumentPlusIcon';

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

interface SearchModalProps {
  personas: Persona[];
  knowledgeSources: Source[];
  onSelectPersona: (personaId: string) => void;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ personas, knowledgeSources, onSelectPersona, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' });
  const [isSearching, setIsSearching] = useState(false);

  const searchService = useMemo(() => SearchService.getInstance(), []);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = searchService.search(query, personas, knowledgeSources, filters);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [query, personas, knowledgeSources, filters, searchService]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'persona') {
      onSelectPersona(result.id);
      onClose();
    }
    // For other types, could navigate to specific content
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            Advanced Search
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex gap-4">
            <div className="flex-grow relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search personas, documents, content..."
                className="w-full pl-10 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={filters.type || 'all'}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-300 text-sm"
            >
              <option value="all">All Types</option>
              <option value="personas">Personas</option>
              <option value="sources">Knowledge Sources</option>
              <option value="content">Content</option>
            </select>
          </div>

          {query && (
            <div className="mt-2 text-sm text-slate-400">
              {isSearching ? 'Searching...' : `${results.length} results found`}
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {query.trim() === '' ? (
            <div className="text-center text-slate-500 py-8">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find personas, documents, or content</p>
              <p className="text-xs mt-2">Search across names, roles, biographies, and document content</p>
            </div>
          ) : isSearching ? (
            <div className="text-center text-slate-500 py-8">
              <div className="w-8 h-8 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p>Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-xs mt-2">Try different keywords or check your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-900/70 hover:border-slate-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        result.type === 'persona' ? 'bg-blue-900/50 text-blue-300' :
                        result.type === 'source' ? 'bg-green-900/50 text-green-300' :
                        'bg-purple-900/50 text-purple-300'
                      }`}>
                        {result.type}
                      </span>
                      <h3 className="font-semibold text-slate-200">{result.title}</h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      {result.relevance}% match
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                    {result.snippet}
                  </p>

                  {result.matches.length > 0 && (
                    <div className="text-xs text-slate-500">
                      Matches in: {result.matches.map(m => m.field).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
