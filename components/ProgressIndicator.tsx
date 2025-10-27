import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  message: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ current, total, message }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <div className="text-center mb-4">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-slate-700 rounded-full animate-spin mx-auto mb-3"></div>
          <h3 className="text-lg font-semibold text-slate-100">Processing Files</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-300">Progress</span>
            <span className="text-sm text-slate-300">{current} / {total}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="text-center text-xs text-slate-500 mt-1">
            {percentage.toFixed(0)}% Complete
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center">
          Please wait while your files are being processed...
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
