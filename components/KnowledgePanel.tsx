import React from 'react';
import { Source } from '../types';
import PlusCircleIcon from './icons/PlusCircleIcon';

interface KnowledgePanelProps {
  knowledgeSources: Source[];
  setKnowledgeSources: React.Dispatch<React.SetStateAction<Source[]>>;
  isLoading: boolean;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  knowledgeSources,
  setKnowledgeSources,
  isLoading,
}) => {
  return (
    <div className="p-4 flex-grow">
      <h3 className="text-lg font-bold text-slate-100 mb-4">Knowledge Base</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Add Files</span>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={(e) =>
              e.target.files &&
              setKnowledgeSources([
                ...knowledgeSources,
                ...Array.from(e.target.files).map((file) => ({
                  id: file.name,
                  name: file.name,
                  content: '',
                })),
              ])
            }
            accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.json"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          {knowledgeSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md"
            >
              <span className="text-sm text-slate-300 truncate">
                {source.name}
              </span>
              <button
                onClick={() =>
                  setKnowledgeSources(
                    knowledgeSources.filter((s) => s.id !== source.id)
                  )
                }
                className="text-slate-500 hover:text-red-400"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgePanel;
