import React, { useState, useEffect } from 'react';
import EditRatingPanel from './EditRatingPanel';
import SegmentEditor from './SegmentEditor';
import SectionEditor from './SectionEditor';
import { Persona, Source } from '../types';

interface DocumentEditorProps {
  content: string;
  setContent: (content: string) => void;
  onReset: () => void;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  clearError: () => void;
  activePersonaId: string | null;
  activePersona?: Persona | null;
  knowledgeSources?: Source[];
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  content,
  setContent,
  onReset,
  isLoading,
  isRefining,
  error,
  clearError,
  activePersonaId,
  activePersona = null,
  knowledgeSources = []
}) => {
  const [isEditRatingPanelOpen, setIsEditRatingPanelOpen] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<string>('');
  const [currentEditContent, setCurrentEditContent] = useState<string>('');
  const [isSegmentEditorOpen, setIsSegmentEditorOpen] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('');

  const handleRateEdit = () => {
    // Generate a unique ID for this edit
    const editId = `edit-${Date.now()}`;
    setCurrentEditId(editId);
    setCurrentEditContent(content);
    setIsEditRatingPanelOpen(true);
  };

  const handleRatingSubmit = () => {
    // Close the rating panel
    setIsEditRatingPanelOpen(false);
    // Reset the current edit tracking
    setCurrentEditId('');
    setCurrentEditContent('');
  };

  const handleSegmentSelect = () => {
    // Get the current selection from the textarea
    const textarea = document.querySelector('textarea');
    if (textarea && activePersona) {
      const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selection.trim()) {
        setSelectedSegment(selection);
        setIsSegmentEditorOpen(true);
      }
    }
  };

  const handleSegmentEditComplete = (editedSegment: string) => {
    // Replace the selected segment with the edited version
    if (selectedSegment) {
      const newContent = content.replace(selectedSegment, editedSegment);
      setContent(newContent);
    }
    setIsSegmentEditorOpen(false);
    setSelectedSegment('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100">Document Editor</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRateEdit}
            disabled={!content.trim() || !activePersonaId}
            className="px-3 py-1 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rate Edit
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="flex-grow relative">
        {error && (
          <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-red-900 text-red-100 text-sm">
            <div className="flex justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-200 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={handleSegmentSelect}
          className={`w-full h-full p-4 bg-slate-800 text-slate-100 resize-none focus:outline-none ${
            error ? 'pt-16' : ''
          }`}
          placeholder="Generated content will appear here..."
          disabled={isLoading || isRefining}
        />
        
        {isSegmentEditorOpen && activePersona && knowledgeSources && (
          <SegmentEditor
            document={content}
            selectedSegment={selectedSegment}
            persona={activePersona}
            knowledgeSources={knowledgeSources}
            onEditComplete={handleSegmentEditComplete}
            onClose={() => setIsSegmentEditorOpen(false)}
          />
        )}
      </div>
      
      {isEditRatingPanelOpen && activePersonaId && activePersona && (
        <EditRatingPanel
          editId={currentEditId}
          content={currentEditContent}
          persona={activePersona}
          onRatingSubmit={handleRatingSubmit}
          onClose={() => setIsEditRatingPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default DocumentEditor;