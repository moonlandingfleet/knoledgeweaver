import React, { useState } from 'react';

interface SectionFeedbackProps {
  sectionContent: string;
  onFeedbackSubmit: (feedback: string) => void;
}

const SectionFeedback: React.FC<SectionFeedbackProps> = ({ sectionContent, onFeedbackSubmit }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    onFeedbackSubmit(feedback);
    setFeedback('');
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-lg font-bold text-slate-100 mb-4">Feedback</h3>
      <div className="space-y-2">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full h-24 p-2 bg-slate-900 border border-slate-600 rounded-md text-sm resize-y"
          placeholder="Provide feedback on this section..."
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default SectionFeedback;
