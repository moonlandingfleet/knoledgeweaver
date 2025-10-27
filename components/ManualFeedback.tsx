import React, { useState } from 'react';
import { FeedbackService } from '../services/feedbackService';

interface ManualFeedbackProps {
  documentId?: string;
  personaId?: string;
  onFeedbackSubmit?: () => void;
}

const ManualFeedback: React.FC<ManualFeedbackProps> = ({ 
  documentId, 
  personaId,
  onFeedbackSubmit 
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const feedbackService = FeedbackService.getInstance();

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    
    try {
      feedbackService.trackManualRating(rating, comment, documentId, personaId);
      setIsSubmitted(true);
      
      if (onFeedbackSubmit) {
        onFeedbackSubmit();
      }
      
      // Reset form after submission
      setTimeout(() => {
        setRating(0);
        setComment('');
        setIsSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-900/50 border border-green-700 rounded-lg p-4">
        <div className="flex items-center text-green-400">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-slate-100 mb-3">Rate this Document</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Your Rating
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-slate-500'}`}
            >
              {star <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-slate-300 mb-2">
          Additional Comments
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike about this document?"
          className="w-full h-24 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-y text-slate-200"
        />
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
            Submitting...
          </div>
        ) : (
          'Submit Feedback'
        )}
      </button>
    </div>
  );
};

export default ManualFeedback;