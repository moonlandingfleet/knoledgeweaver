import React from 'react';
import { DocumentSnapshot } from '../types';

interface VersionHistoryProps {
  snapshots: DocumentSnapshot[];
  onSelectVersion: (version: DocumentSnapshot) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ snapshots, onSelectVersion }) => {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-lg font-bold text-slate-100 mb-4">Version History</h3>
      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="p-2 bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-700"
            onClick={() => onSelectVersion(snapshot)}
          >
            <p className="text-sm text-slate-300">
              Version {snapshot.version} - {new Date(snapshot.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;
