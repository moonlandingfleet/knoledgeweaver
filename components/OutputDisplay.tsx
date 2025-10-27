import React, { useState, useEffect } from 'react';
import CopyIcon from './icons/CopyIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import SparkleIcon from './icons/SparkleIcon';

declare global {
  interface Window {
    marked: {
      parse: (markdown: string) => string;
    };
  }
}

interface DocumentEditorProps {
  content: string;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
}

const SkeletonLoader: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
    <div className="h-4 bg-slate-700 rounded w-full"></div>
    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
    <div className="h-4 bg-slate-700 rounded w-1/2 mt-6"></div>
    <div className="h-4 bg-slate-700 rounded w-full"></div>
    <div className="h-4 bg-slate-700 rounded w-full"></div>
  </div>
);

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, isLoading, isRefining, error }) => {
  const [copied, setCopied] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (content) {
      if (typeof window.marked?.parse === 'function') {
        setHtmlContent(window.marked.parse(content));
      } else {
        const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        setHtmlContent(escapedContent.replace(/\n/g, '<br />'));
      }
    } else {
      setHtmlContent('');
    }
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasContent = !isLoading && !error && content;

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-lg p-6 flex-grow flex flex-col h-full border border-slate-700 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Synthesized Document</h2>
        {hasContent && (
          <button
            onClick={handleCopy}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <ClipboardCheckIcon className="w-5 h-5 text-green-400" />
            ) : (
              <CopyIcon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto pr-4 -mr-4 relative">
        {isRefining && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
                <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Refining...</span>
                </div>
            </div>
        )}
        {isLoading && <SkeletonLoader />}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-red-900/50 border border-red-700 p-4 rounded-lg">
              <h3 className="font-bold text-red-300">An Error Occurred</h3>
              <p className="text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}
        {!isLoading && !error && !content && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <SparkleIcon className="w-12 h-12 mx-auto mb-2" />
              <p>Your synthesized document will appear here.</p>
            </div>
          </div>
        )}
        {htmlContent && (
          <article 
            className={`prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-indigo-400 prose-blockquote:border-l-indigo-500 prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:p-1 prose-code:rounded transition-opacity duration-300 ${isRefining ? 'opacity-50' : 'opacity-100'}`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </div>
    </div>
  );
};

// Rename the component export
export default DocumentEditor;
