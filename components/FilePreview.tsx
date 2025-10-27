import React, { useState, useEffect } from 'react';
import { Source } from '../types';
import CloseIcon from './icons/CloseIcon';
import DocumentPlusIcon from './icons/DocumentPlusIcon';
import { parseFiles } from '../services/fileParser';
import ProgressIndicator from './ProgressIndicator';

interface FilePreviewProps {
  files: File[];
  onConfirm: (sources: Source[]) => void;
  onCancel: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, onConfirm, onCancel }) => {
  const [previews, setPreviews] = useState<{ file: File; content: string; error?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processedSources, setProcessedSources] = useState<Source[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  useEffect(() => {
    const generatePreviews = async () => {
      setIsProcessing(true);
      const previewData: { file: File; content: string; error?: string }[] = [];

      for (const file of files) {
        try {
          let content = '';

          if (file.type === 'application/pdf') {
            // For PDFs, just show file info
            content = `[PDF Document: ${file.name}]\n\nThis is a PDF file. Full content will be extracted when processed.`;
          } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
            // For text files, show first 500 characters
            const text = await file.text();
            content = text.length > 500 ? text.substring(0, 500) + '...' : text;
          } else if (file.name.endsWith('.csv')) {
            // For CSV, show first few lines
            const text = await file.text();
            const lines = text.split('\n').slice(0, 5);
            content = lines.join('\n') + (lines.length < text.split('\n').length ? '\n...' : '');
          } else {
            // For other formats, show file info
            content = `[${file.type || 'Unknown format'} Document: ${file.name}]\n\nThis document format will be processed when added to the knowledge base.`;
          }

          previewData.push({ file, content });
        } catch (error) {
          previewData.push({
            file,
            content: '',
            error: error instanceof Error ? error.message : 'Could not read file'
          });
        }
      }

      setPreviews(previewData);
      setIsProcessing(false);
    };

    generatePreviews();
  }, [files]);

  const handleConfirm = async () => {
    if (processedSources.length > 0) {
      onConfirm(processedSources);
    } else {
      // Process files and generate sources
      try {
        setShowProgress(true);
        setProgress({ current: 0, total: files.length, message: 'Starting file processing...' });

        const sources = await parseFiles(files, (current, total, message) => {
          setProgress({ current: current + 1, total, message });
        });

        setProcessedSources(sources);
        onConfirm(sources);
      } catch (error) {
        console.error('Error processing files:', error);
        // Still try to create basic sources from previews
        const basicSources: Source[] = previews.map(preview => ({
          id: `${preview.file.name}-${preview.file.lastModified}`,
          name: preview.file.name,
          content: preview.error || preview.content,
        }));
        onConfirm(basicSources);
      } finally {
        setShowProgress(false);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-100">File Preview</h2>
            <button
              onClick={onCancel}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              aria-label="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </header>

          <main className="flex-grow overflow-hidden flex flex-col">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin mx-auto mb-2"></div>
                  <p>Generating previews...</p>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex overflow-hidden">
                <div className="w-1/3 border-r border-slate-700 overflow-y-auto p-4">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Files ({files.length})</h3>
                  <div className="space-y-2">
                    {previews.map((preview, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-md text-sm"
                      >
                        <DocumentPlusIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <p className="text-slate-300 truncate" title={preview.file.name}>
                            {preview.file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(preview.file.size / 1024).toFixed(1)}KB
                          </p>
                        </div>
                        {preview.error && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title={preview.error}></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-2/3 overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-slate-200">Content Preview</h3>
                    <button
                      onClick={handleConfirm}
                      disabled={isProcessing || showProgress}
                      className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {showProgress ? 'Processing...' : 'Add Files'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="border border-slate-600 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-slate-900/50 border-b border-slate-600">
                          <span className="text-sm font-medium text-slate-300">{preview.file.name}</span>
                          {preview.error && (
                            <span className="text-xs text-red-400">Error</span>
                          )}
                        </div>
                        <div className="p-3 max-h-40 overflow-y-auto">
                          {preview.error ? (
                            <p className="text-red-400 text-sm">{preview.error}</p>
                          ) : (
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                              {preview.content}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showProgress && (
        <ProgressIndicator
          current={progress.current}
          total={progress.total}
          message={progress.message}
        />
      )}
    </>
  );
};

export default FilePreview;
