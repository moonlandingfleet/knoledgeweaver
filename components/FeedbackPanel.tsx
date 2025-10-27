import React, { useState } from 'react';
import SparkleIcon from './icons/SparkleIcon';
import WandIcon from './icons/WandIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import UserCircleIcon from './icons/UserCircleIcon';

interface FeedbackPanelProps {
  temperature: number;
  setTemperature: (temp: number) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  onGenerate: () => void;
  onRefine: () => void;
  onQualityCheck: () => void;
  onAskQuestion?: (question: string) => void;
  onGenerateFromPrompt?: (prompt: string) => void;
  isLoading: boolean;
  isRefining: boolean;
  isCheckingQuality: boolean;
  isAskingQuestion?: boolean;
  hasKnowledgeSources: boolean;
  isPersonaActive: boolean;
  hasDocument: boolean;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  temperature,
  setTemperature,
  feedback,
  setFeedback,
  onGenerate,
  onRefine,
  onQualityCheck,
  onAskQuestion,
  onGenerateFromPrompt,
  isLoading,
  isRefining,
  isCheckingQuality,
  isAskingQuestion = false,
  hasKnowledgeSources,
  isPersonaActive,
  hasDocument,
}) => {
  const [question, setQuestion] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');

  const getTemperatureLabel = (value: number) => {
    if (value < 0.2) return "Strict Adherence";
    if (value < 0.4) return "Factual";
    if (value < 0.6) return "Balanced";
    if (value < 0.8) return "Creative";
    return "Expansive";
  };

  const isAnythingLoading = isLoading || isRefining || isCheckingQuality || isAskingQuestion;

  const handleAskQuestion = () => {
    if (question.trim() && onAskQuestion) {
      onAskQuestion(question.trim());
      setQuestion('');
    }
  };

  const handleGenerateFromPrompt = () => {
    if (generatePrompt.trim() && onGenerateFromPrompt) {
      onGenerateFromPrompt(generatePrompt.trim());
      setGeneratePrompt('');
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-lg p-6 flex flex-col gap-6 h-full border border-slate-700">
      <h2 className="text-xl font-bold text-slate-100">Control & Feedback</h2>
      
      <div>
        <label htmlFor="temperature" className="flex justify-between items-center text-sm font-medium text-slate-300 mb-2">
          <span>Diplomatic Flexibility</span>
          <span className="text-indigo-400 font-semibold">{getTemperatureLabel(temperature)}</span>
        </label>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          disabled={isAnythingLoading}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Conversational Interface */}
      {isPersonaActive && hasKnowledgeSources && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-md font-semibold text-slate-200">Ask the Persona</h3>
          </div>
          <div className="space-y-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question to your persona... (e.g., 'What's your opinion on the Turkey conflict?')"
              className="w-full h-20 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none text-slate-200"
              disabled={isAnythingLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion();
                }
              }}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isAnythingLoading || !question.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {isAskingQuestion ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  <span>Asking...</span>
                </>
              ) : (
                <>
                  <UserCircleIcon className="w-4 h-4" />
                  <span>Ask Question</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!hasDocument ? (
        <div className="space-y-4 mt-auto">
          <button
            onClick={onGenerate}
            disabled={isAnythingLoading || !hasKnowledgeSources || !isPersonaActive}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
            title={!isPersonaActive ? 'Please select a persona first.' : !hasKnowledgeSources ? 'Please add documents to the Knowledge Base.' : 'Generate Draft'}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <SparkleIcon className="w-5 h-5"/>
                <span>Generate Draft</span>
              </>
            )}
          </button>
          
          <div className="pt-4 border-t border-slate-700">
            <label htmlFor="generate-prompt" className="block text-sm font-medium text-slate-300 mb-2">
              Generate from Prompt
            </label>
            <textarea
              id="generate-prompt"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="e.g., 'Write about your achievements', 'Describe your expertise in Africa'"
              className="w-full h-20 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none text-slate-200"
              disabled={isAnythingLoading}
            />
            <button
              onClick={handleGenerateFromPrompt}
              disabled={isAnythingLoading || !generatePrompt.trim() || !hasKnowledgeSources || !isPersonaActive}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              <SparkleIcon className="w-4 h-4" />
              <span>Generate from Prompt</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-4">
            <div>
                <label htmlFor="feedback-text" className="block text-sm font-medium text-slate-300 mb-2">
                User Feedback
                </label>
                <textarea
                id="feedback-text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'Make the tone more formal', 'Elaborate on the second point.'"
                className="w-full h-32 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-y text-slate-200"
                disabled={isAnythingLoading}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onQualityCheck}
                disabled={isAnythingLoading || !hasDocument}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white font-bold rounded-lg shadow-lg hover:bg-slate-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500"
              >
                {isCheckingQuality ? (
                   <>
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <BookOpenIcon className="w-5 h-5" />
                    <span>Quality Check</span>
                  </>
                )}
              </button>
              <button
                onClick={onRefine}
                disabled={isAnythingLoading || !feedback.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500"
                >
                {isRefining ? (
                    <>
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Refining...</span>
                    </>
                ) : (
                    <>
                    <WandIcon className="w-5 h-5"/>
                    <span>Refine</span>
                    </>
                )}
              </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
