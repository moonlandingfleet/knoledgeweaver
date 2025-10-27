import React, { useState, useEffect } from 'react';
import { Persona, Source } from '../types';
import { DocumentEditingService, EditSegmentResult } from '../services/documentEditingService';

interface SegmentEditorProps {
  document: string;
  selectedSegment: string;
  persona: Persona;
  knowledgeSources: Source[];
  onEditComplete: (editedSegment: string) => void;
  onClose: () => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({
  document,
  selectedSegment,
  persona,
  knowledgeSources,
  onEditComplete,
  onClose
}) => {
  const [instruction, setInstruction] = useState<string>('');
  const [editedSegment, setEditedSegment] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editResult, setEditResult] = useState<EditSegmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const documentEditingService = DocumentEditingService.getInstance();

  useEffect(() => {
    setEditedSegment(selectedSegment);
  }, [selectedSegment]);

  const handleEdit = async () => {
    if (!instruction.trim()) {
      setError('Please provide an instruction for the edit');
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const result = await documentEditingService.editSegment({
        document,
        segment: selectedSegment,
        instruction: instruction.trim(),
        persona,
        knowledgeSources
      });

      setEditedSegment(result.editedSegment);
      setEditResult(result);
    } catch (err) {
      setError('Failed to edit segment. Please try again.');
      console.error(err);
    } finally {
      setIsEditing(false);
    }
  };

  const handleApply = () => {
    onEditComplete(editedSegment);
  };

  const handleRateEdit = async () => {
    if (!editResult || rating === 0) return;

    try {
      await documentEditingService.rateEdit(
        `segment-edit-${Date.now()}`,
        rating,
        feedback
      );
      alert('Thank you for your feedback!');
      setRating(0);
      setFeedback('');
    } catch (err) {
      console.error('Failed to submit rating:', err);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => setRating(star)}
        className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-400'}`}
      >
        ★
      </button>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Edit Document Segment</h2>
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
            <label htmlFor="instruction" className="block text-sm font-medium text-slate-300 mb-1">
              Editing Instruction
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe how you want this segment to be edited (e.g., 'Make this more formal', 'Add more details about Africa', 'Emphasize the South African context')..."
            />
          </div>
          
          <button
            onClick={handleEdit}
            disabled={isEditing || !instruction.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Editing...' : 'Edit Segment'}
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
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Original Segment</h3>
              <div className="p-4 bg-slate-750 rounded-md border border-slate-700">
                <pre className="whitespace-pre-wrap text-slate-300 font-sans">
                  {selectedSegment}
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Edited Segment</h3>
              <div className="p-4 bg-slate-750 rounded-md border border-slate-700">
                <textarea
                  value={editedSegment}
                  onChange={(e) => setEditedSegment(e.target.value)}
                  className="w-full h-full min-h-[200px] bg-transparent text-slate-300 font-sans resize-none focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          {editResult && (
            <div className="mt-6 p-4 bg-slate-750 rounded-md border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Edit Details</h3>
              <div className="text-sm text-slate-300 mb-3">
                <p><span className="font-medium">Confidence:</span> {editResult.confidence}/100</p>
                <p><span className="font-medium">Reasoning:</span> {editResult.reasoning}</p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-slate-200 mb-2">Rate this Edit</h4>
                <div className="flex items-center mb-2">
                  {renderStars()}
                  <span className="ml-3 text-slate-400">
                    {rating > 0 ? `${rating} of 5 stars` : 'Select rating'}
                  </span>
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Additional feedback about this edit..."
                />
                <button
                  onClick={handleRateEdit}
                  disabled={rating === 0}
                  className="mt-2 px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Rating
                </button>
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

export default SegmentEditor;