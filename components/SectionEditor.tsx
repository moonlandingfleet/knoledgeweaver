import React, { useState, useEffect } from 'react';
import { Persona, Source } from '../types';
import { StructuredDocumentService, DocumentSection } from '../services/structuredDocumentService';

interface SectionEditorProps {
  document: any; // StructuredDocument
  section: DocumentSection;
  persona: Persona;
  knowledgeSources: Source[];
  onEditComplete: (updatedSection: DocumentSection) => void;
  onClose: () => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  document,
  section,
  persona,
  knowledgeSources,
  onEditComplete,
  onClose
}) => {
  const [instruction, setInstruction] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>(section.content);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [reasoning, setReasoning] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const structuredDocumentService = StructuredDocumentService.getInstance();

  useEffect(() => {
    setEditedContent(section.content);
  }, [section]);

  const handleEdit = async () => {
    if (!instruction.trim()) {
      setError('Please provide an instruction for the edit');
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const updatedSection = await structuredDocumentService.editSection(
        document,
        section.id,
        instruction.trim(),
        persona,
        knowledgeSources
      );

      setEditedContent(updatedSection.content);
      // In a real implementation, we would get confidence and reasoning from the service
      setConfidence(85);
      setReasoning(`Edited section based on instruction: "${instruction}"`);
    } catch (err) {
      setError('Failed to edit section. Please try again.');
      console.error(err);
    } finally {
      setIsEditing(false);
    }
  };

  const handleApply = () => {
    const updatedSection: DocumentSection = {
      ...section,
      content: editedContent,
      wordCount: editedContent.split(' ').length
    };
    onEditComplete(updatedSection);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Edit Document Section</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-slate-200">Section: {section.title}</h3>
          </div>
          
          <div className="mb-4">
            <label htmlFor="instruction" className="block text-sm font-medium text-slate-300 mb-1">
              Editing Instruction
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe how you want this section to be edited (e.g., 'Make this more detailed', 'Focus on achievements', 'Add more context about South Africa')..."
            />
          </div>
          
          <button
            onClick={handleEdit}
            disabled={isEditing || !instruction.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Editing...' : 'Edit Section'}
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900 text-red-100">
            {error}
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Original Content</h3>
              <div className="p-4 bg-slate-750 rounded-md border border-slate-700 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-slate-300 font-sans">
                  {section.content}
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Edited Content</h3>
              <div className="p-4 bg-slate-750 rounded-md border border-slate-700 max-h-96 overflow-y-auto">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[200px] bg-transparent text-slate-300 font-sans resize-none focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          {confidence > 0 && (
            <div className="mt-6 p-4 bg-slate-750 rounded-md border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Edit Details</h3>
              <div className="text-sm text-slate-300">
                <p><span className="font-medium">Confidence:</span> {confidence}/100</p>
                <p><span className="font-medium">Reasoning:</span> {reasoning}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isEditing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionEditor;