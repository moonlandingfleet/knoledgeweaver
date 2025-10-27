import React, { useEffect, useState } from 'react';
import CloseIcon from './icons/CloseIcon';

interface QualityReportProps {
  report: string;
  onClose: () => void;
}

const QualityReport: React.FC<QualityReportProps> = ({ report, onClose }) => {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    // Escape key listener
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (report) {
       if (typeof window.marked?.parse === 'function') {
        setHtmlContent(window.marked.parse(report));
      } else {
        const escapedContent = report.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        setHtmlContent(escapedContent.replace(/\n/g, '<br />'));
      }
    } else {
        setHtmlContent('');
    }
  }, [report]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quality-report-title"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="quality-report-title" className="text-lg font-bold text-slate-100">
            Editor's Analysis
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
            aria-label="Close quality report"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {htmlContent && (
             <article 
                className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-indigo-400 prose-blockquote:border-l-indigo-500 prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:p-1 prose-code:rounded"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default QualityReport;
