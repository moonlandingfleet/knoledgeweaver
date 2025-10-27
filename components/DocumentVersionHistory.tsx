import React, { useState, useEffect } from 'react';
import { StructuredDocumentService, DocumentVersion } from '../services/structuredDocumentService';

interface DocumentVersionHistoryProps {
  documentId: string;
  onClose: () => void;
  onVersionSelect: (version: DocumentVersion) => void;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId,
  onClose,
  onVersionSelect
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const structuredDocumentService = StructuredDocumentService.getInstance();

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const documentVersions = structuredDocumentService.getDocumentVersions(documentId);
      setVersions(documentVersions.sort((a, b) => b.versionNumber - a.versionNumber));
    } catch (err) {
      setError('Failed to load document versions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: DocumentVersion) => {
    onVersionSelect(version);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Document Version History</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <p className="text-slate-400">Track the evolution of your document through different versions</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900 text-red-100">
            {error}
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No versions found for this document</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div 
                  key={version.id} 
                  className="p-4 bg-slate-750 rounded-lg border border-slate-700 hover:border-indigo-500 cursor-pointer transition-colors"
                  onClick={() => handleVersionSelect(version)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-100">Version {version.versionNumber}</h3>
                      <p className="text-sm text-slate-400">By {version.author}</p>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(version.timestamp)}</span>
                  </div>
                  
                  {version.changes.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Changes:</h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        {version.changes.slice(0, 3).map((change, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                        {version.changes.length > 3 && (
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>+ {version.changes.length - 3} more changes</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-slate-500">
                    {version.content.split(' ').length} words
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionHistory;