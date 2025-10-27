import React, { useState, useEffect } from 'react';
import { Persona } from '../types';
import { FeedbackDrivenImprovementService, EditRating, EditImprovementSuggestion } from '../services/feedbackDrivenImprovementService';

interface EditRatingPanelProps {
  editId: string;
  content: string;
  persona: Persona;
  onRatingSubmit: (rating: EditRating) => void;
  onClose: () => void;
}

const EditRatingPanel: React.FC<EditRatingPanelProps> = ({
  editId,
  content,
  persona,
  onRatingSubmit,
  onClose
}) => {
  const [rating, setRating] = useState<number>(0);
  const [detailedFeedback, setDetailedFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<EditImprovementSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const feedbackService = FeedbackDrivenImprovementService.getInstance();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!content.trim()) return;
      
      setLoadingSuggestions(true);
      try {
        const suggestions = await feedbackService.generateImprovementSuggestions(editId, content, persona);
        setSuggestions(suggestions);
      } catch (err) {
        setError('Failed to generate improvement suggestions');
        console.error(err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [editId, content, persona]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const editRating = await feedbackService.rateEdit(editId, rating, detailedFeedback);
      onRatingSubmit(editRating);
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit rating');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-100">Rate This Edit</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {isSubmitted ? (
          <div className="p-6 text-center">
            <div className="text-5xl text-green-500 mb-4">✓</div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">Thank You!</h3>
            <p className="text-slate-300 mb-6">Your feedback helps improve future edits.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex-grow overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-md">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-200 mb-2">Overall Rating</h3>
                <div className="flex items-center">
                  {renderStars()}
                  <span className="ml-3 text-slate-400">
                    {rating > 0 ? `${rating} of 5 stars` : 'Select rating'}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="feedback" className="block text-lg font-medium text-slate-200 mb-2">
                  Detailed Feedback
                </label>
                <textarea
                  id="feedback"
                  value={detailedFeedback}
                  onChange={(e) => setDetailedFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What did you like or dislike about this edit? How could it be improved?"
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-slate-200">Improvement Suggestions</h3>
                  {loadingSuggestions && (
                    <span className="text-slate-400">Generating suggestions...</span>
                  )}
                </div>
                
                {suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion.id} className="p-4 bg-slate-750 rounded-md border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-slate-100">Suggestion</h4>
                          <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                            {suggestion.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-slate-300 mb-3">{suggestion.suggestion}</p>
                        <div className="text-sm">
                          <h5 className="font-medium text-slate-200 mb-1">Implementation:</h5>
                          <p className="text-slate-400">{suggestion.implementation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    {loadingSuggestions 
                      ? 'Analyzing content for suggestions...' 
                      : 'No suggestions available'}
                  </div>
                )}
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
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditRatingPanel;