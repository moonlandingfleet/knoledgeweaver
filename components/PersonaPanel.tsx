import React from 'react';
import { Persona } from '../types';
import UserCircleIcon from './icons/UserCircleIcon';

interface PersonaPanelProps {
  activePersona: Persona | null;
  onManagePersonas: () => void;
}

const PersonaPanel: React.FC<PersonaPanelProps> = ({ activePersona, onManagePersonas }) => {
  return (
    <div className="p-4 border-b border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-100">Persona</h2>
        </div>
        <button
          onClick={onManagePersonas}
          className="px-3 py-1 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors text-sm"
        >
          Manage
        </button>
      </div>
      {activePersona ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-md font-semibold text-slate-100">
            {activePersona.name} {activePersona.surname}
          </h3>
          <p className="text-sm text-indigo-400">{activePersona.role}</p>
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-400">
          No active persona.
        </div>
      )}
    </div>
  );
};

export default PersonaPanel;
