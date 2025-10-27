import React from 'react';
import SparkleIcon from './icons/SparkleIcon';

interface KeyboardShortcutsProps {
  isVisible?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 text-xs text-slate-400 max-w-xs">
      <div className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
        <SparkleIcon className="w-3 h-3" />
        Shortcuts
      </div>
      <div className="space-y-1">
        <div><kbd className="bg-slate-700 px-1 rounded">Ctrl+K</kbd> Search</div>
        <div><kbd className="bg-slate-700 px-1 rounded">Esc</kbd> Close modals</div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
