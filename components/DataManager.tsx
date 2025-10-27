import React, { useState } from 'react';
import { Persona, Source } from '../types';
import CloseIcon from './icons/CloseIcon';
import DownloadIcon from './icons/DownloadIcon';
import { downloadData, uploadData } from '../services/dataManager';

interface DataManagerProps {
  personas: Persona[];
  knowledgeSources: Source[];
  onImport: (personas: Persona[], knowledgeSources: Source[]) => void;
  onClose: () => void;
}

const DataManager: React.FC<DataManagerProps> = ({ personas, knowledgeSources, onImport, onClose }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExport = () => {
    downloadData(personas, knowledgeSources);
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus('Select a backup file...');

      const data = await uploadData();
      setImportStatus(`Found ${data.personas.length} personas and ${data.knowledgeSources.length} sources`);

      // Confirm import
      if (window.confirm(`Import ${data.personas.length} personas and ${data.knowledgeSources.length} knowledge sources? This will replace your current data.`)) {
        onImport(data.personas, data.knowledgeSources);
        setImportStatus('Import successful!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportStatus('Import cancelled');
      }
    } catch (error) {
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Import failed'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const totalDataSize = JSON.stringify({ personas, knowledgeSources }).length;
  const readableSize = totalDataSize < 1024
    ? `${totalDataSize} bytes`
    : totalDataSize < 1024 * 1024
    ? `${(totalDataSize / 1024).toFixed(1)} KB`
    : `${(totalDataSize / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">Data Management</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Data Stats */}
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h3 className="text-md font-semibold text-slate-200 mb-3">Current Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Personas:</span>
                  <span className="text-slate-300">{personas.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Knowledge Sources:</span>
                  <span className="text-slate-300">{knowledgeSources.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Size:</span>
                  <span className="text-slate-300">{readableSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated:</span>
                  <span className="text-slate-300">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h3 className="text-md font-semibold text-slate-200 mb-3">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Export Data
                </button>

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importing...' : 'Import Data'}
                </button>
              </div>

              {importStatus && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  importStatus.startsWith('Error') ? 'bg-red-900/50 text-red-300' :
                  importStatus.includes('successful') ? 'bg-green-900/50 text-green-300' :
                  'bg-blue-900/50 text-blue-300'
                }`}>
                  {importStatus}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-slate-900/30 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-200 mb-2">How to use:</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <p><strong>Export:</strong> Download your personas and knowledge sources as a backup file.</p>
              <p><strong>Import:</strong> Restore previously exported data. This will replace your current data.</p>
              <p><strong>Tip:</strong> Export regularly to avoid losing your work!</p>
            </div>
          </div>

          {/* File Format Info */}
          <div className="bg-slate-900/30 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-200 mb-2">File Format:</h4>
            <div className="text-xs text-slate-400">
              <p>Data is saved in JSON format with the following structure:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code className="text-indigo-300">personas[]</code> - Your AI personas with shaper documents</li>
                <li><code className="text-indigo-300">knowledgeSources[]</code> - Your knowledge base documents</li>
                <li><code className="text-indigo-300">exportDate</code> - When the backup was created</li>
                <li><code className="text-indigo-300">version</code> - Data format version</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DataManager;
