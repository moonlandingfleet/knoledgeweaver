import React, { useState, useEffect } from 'react';
import { Source, Persona, PersonaWeights } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import TrashIcon from './icons/TrashIcon';
import SparkleIcon from './icons/SparkleIcon';
import { parseFiles } from '../services/fileParser';
import { PersonaCalibrationService } from '../services/personaCalibrationService';
import { PersonaSynthesisService } from '../services/personaSynthesisService';
import { DocumentPersonaExtractor, ExtractedPersonaInfo } from '../services/documentPersonaExtractor';
import { AnalyticsService } from '../services/analyticsService';
import PersonaWeightsControl from './PersonaWeightsControl';

interface PersonaManagerProps {
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  activePersonaId: string | null;
  setActivePersonaId: (id: string | null) => void;
  knowledgeSources: Source[]; // Add this prop
  onClose: () => void;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ personas, setPersonas, activePersonaId, setActivePersonaId, knowledgeSources,onClose}) => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [isWeightsControlOpen, setIsWeightsControlOpen] = useState(false);
  const calibrationService = PersonaCalibrationService.getInstance();
  const synthesisService = PersonaSynthesisService.getInstance();
  const personaExtractor = DocumentPersonaExtractor.getInstance();

  useEffect(() => {
    // Escape key listener
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCreatePersona = () => {
    const newPersona: Persona = {
      id: `persona-${Date.now()}`,
      name: 'New',
      surname:'Persona',
      role: 'Analyst',
      bio: '',
      shaperSources: [],
      calibrationStatus: 'uncalibrated',
    };
    setPersonas([...personas, newPersona]);
    setSelectedPersona(newPersona);

    // Track persona creation
    const analyticsService = AnalyticsService.getInstance();
    analyticsService.trackEvent({
      type: 'persona_created',
      timestamp: new Date().toISOString(),
      metadata: {
        personaName: newPersona.name,
        personaRole: newPersona.role
      }
    });
  };
  
  const handleCreatePersonaFromSources = async (sources: Source[]) => {
    if (sources.length === 0) return;
    
    setIsAutoGenerating(true);
    try {
      const newPersona = await synthesisService.generateFullPersona(sources);
      setPersonas([...personas, newPersona]);
      setSelectedPersona(newPersona);
    } catch (error) {
      console.error('Failed to create persona from sources:', error);
      alert('Failed to auto-generate persona. Please try again.');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleUpdatePersonaWithNewSources = async () => {
    if (!selectedPersona) return;
    
    // Get sources that are not already in the persona's shaper sources
    const existingSourceIds = new Set(selectedPersona.shaperSources.map(s => s.id));
    const newSources = knowledgeSources.filter(s => !existingSourceIds.has(s.id));
    
    if (newSources.length === 0) {
      alert('No new sources to add. All selected sources are already part of this persona.');
      return;
    }
    
    setIsAutoGenerating(true);
    try {
      // Update the persona's biography with new sources
      const updatedBio = await synthesisService.updatePersonaBio(selectedPersona, newSources);
      
      // Create updated persona with new sources added
      const updatedPersona = {
        ...selectedPersona,
        bio: updatedBio,
        shaperSources: [...selectedPersona.shaperSources, ...newSources]
      };
      
      handleUpdateSelectedPersona(updatedPersona);
      alert(`Persona updated with ${newSources.length} new source(s)!`);
    } catch (error) {
      console.error('Failed to update persona with new sources:', error);
      alert('Failed to update persona with new sources. Please try again.');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleExtractPersonaInfo = async () => {
    if (!selectedPersona) return;
    
    // Get sources that are part of this persona
    const personaSources = selectedPersona.shaperSources;
    
    if (personaSources.length === 0) {
      alert('No sources available for persona information extraction. Please add shaper documents first.');
      return;
    }
    
    setIsExtractingInfo(true);
    try {
      // Extract persona information from the documents
      const extractedInfo: ExtractedPersonaInfo = await personaExtractor.extractPersonaInfoFromDocuments(personaSources);
      
      // Update the persona with extracted information
      const updatedPersona = {
        ...selectedPersona,
        name: extractedInfo.name,
        surname: extractedInfo.surname,
        role: extractedInfo.role,
        bio: extractedInfo.bio
      };
      
      handleUpdateSelectedPersona(updatedPersona);
      alert('Persona information extracted and updated successfully!');
    } catch (error) {
      console.error('Failed to extract persona information:', error);
      alert('Failed to extract persona information. Please try again.');
    } finally {
      setIsExtractingInfo(false);
    }
  };

  const handleSelectAndClose = (personaId: string) => {
    setActivePersonaId(personaId);
    onClose();
  };

  const handleUpdateSelectedPersona = (updatedPersona: Persona) => {
    setSelectedPersona(updatedPersona);
    setPersonas(personas.map(p => p.id === updatedPersona.id ? updatedPersona : p));
  };

  const handleWeightsChange = (newWeights: PersonaWeights) => {
    if (!selectedPersona) return;
    
    const updatedPersona = calibrationService.setPersonaWeights(selectedPersona, newWeights);
    handleUpdateSelectedPersona(updatedPersona);
  };

  const handleCalibratePersona = async() => {
    if (!selectedPersona) return;

    setIsCalibrating(true);
    try {
      const calibratedPersona = await calibrationService.calibratePersona(selectedPersona);
      handleUpdateSelectedPersona(calibratedPersona);
    } catch (error) {
      console.error('Calibration failed:', error);
      alert('Calibration failed. Please check your shaper documents and try again.');
    } finally {
      setIsCalibrating(false);
    }
  };
  
  const handleDeletePersona = (personaId: string) => {
    if (window.confirm("Are you sure you want to delete this persona? This cannot be undone.")) {
      setPersonas(personas.filter(p => p.id !== personaId));
      if (selectedPersona?.id === personaId) setSelectedPersona(null);
      if (activePersonaId === personaId) setActivePersonaId(null);
    }
  };
  
  const handleAddShaperFiles = async (files: FileList) => {
    if (!selectedPersona) return;
    const newSources = await parseFiles(files);
    const currentIds = new Set(selectedPersona.shaperSources.map(s => s.id));
    const uniqueNewSources = newSources.filter(s => !currentIds.has(s.id));
    const updatedPersona = {
      ...selectedPersona,
      shaperSources: [...selectedPersona.shaperSources, ...uniqueNewSources]
    };
    handleUpdateSelectedPersona(updatedPersona);
  };
  
  const handleRemoveShaperFile = (sourceId: string) => {
    if (!selectedPersona) return;
    const updatedPersona = {
      ...selectedPersona,
      shaperSources: selectedPersona.shaperSources.filter(s => s.id !== sourceId)
    };
    handleUpdateSelectedPersona(updatedPersona);
  };

  const handleSavePersona = () => {
    if (activePersonaId) {
      const updatedPersonas = personas.map(p => 
        p.id === activePersonaId ? selectedPersona : p
      );
      setPersonas(updatedPersonas);
      localStorage.setItem('personas', JSON.stringify(updatedPersonas));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="persona-manager-title"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="persona-manager-title" className="text-lg font-bold text-slate-100">Persona Manager</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100" aria-label="Close">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-grow flex overflow-hidden">
          {/* Personas List */}
          <div className="w-1/3 border-r border-slate-700 flex flex-col">
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={handleCreatePersona} 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  <span>New Persona</span>
                </button>
                {knowledgeSources.length > 0 && (
                  <button 
                    onClick={() => handleCreatePersonaFromSources(knowledgeSources)}
                    disabled={isAutoGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <SparkleIcon className="w-5 h-5" />
                    <span>{isAutoGenerating ? 'Generating...' : 'Auto-Generate'}</span>
                  </button>
                )}
              </div>
              
              {/* Update with new sources button */}
              {selectedPersona && knowledgeSources.length > 0 && (
                <div className="mb-4">
                  <button 
                    onClick={handleUpdatePersonaWithNewSources}
                    disabled={isAutoGenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 mb-2"
                  >
                    <SparkleIcon className="w-5 h-5" />
                    <span>{isAutoGenerating ? 'Updating...' : 'Update with New Sources'}</span>
                  </button>
                  <p className="text-xs text-slate-400 mt-1 text-center">
                    {knowledgeSources.filter(s => !selectedPersona.shaperSources.some(ps => ps.id === s.id)).length} new sources available
                  </p>
                </div>
              )}
            </div>
            <div className="flex-grow overflow-y-auto">
              {personas.map(persona => (
                <div
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona)}
                  className={`p-4 cursor-pointer border-l-4 transition-colors ${selectedPersona?.id === persona.id ? 'bg-slate-700/50 border-indigo-500' : 'border-transparent hover:bg-slate-700/30'}`}
                >
                  <h3 className="font-semibold text-slate-200">{persona.name} {persona.surname}</h3>
                  <p className="text-sm text-slate-400">{persona.role}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full mr-2 ${
                      persona.calibrationStatus === 'calibrated' ? 'bg-green-600 text-white' :
                      persona.calibrationStatus === 'calibrating' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {persona.calibrationStatus === 'calibrated' ? 'Calibrated' : 
                       persona.calibrationStatus === 'calibrating' ? 'Calibrating' : 'Uncalibrated'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {persona.shaperSources.length} source(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Persona Editor */}
          <div className="w-2/3 flex-grow overflow-y-auto p-6 space-y-6">
            {selectedPersona ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={selectedPersona.name} 
                      onChange={e => handleUpdateSelectedPersona({...selectedPersona, name: e.target.value})} 
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Surname</label>
                    <input 
                      type="text" 
                      value={selectedPersona.surname} 
                      onChange={e => handleUpdateSelectedPersona({...selectedPersona, surname: e.target.value})} 
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Role / Title</label>
                  <input 
                    type="text" 
                    value={selectedPersona.role} 
                    onChange={e => handleUpdateSelectedPersona({...selectedPersona, role: e.target.value})} 
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-300">Biography / Core Principles</label>
                    {selectedPersona.shaperSources.length > 0 && (
                      <button
                        onClick={handleExtractPersonaInfo}
                        disabled={isExtractingInfo}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50"
                      >
                        {isExtractingInfo ? 'Extracting...' : 'Auto-Fill from Docs'}
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={selectedPersona.bio} 
                    onChange={e => handleUpdateSelectedPersona({...selectedPersona, bio: e.target.value})} 
                    className="w-full h-32 p-2 bg-slate-900 border border-slate-600 rounded-md text-sm resize-y" 
                    placeholder="A detailed description of this persona's background, expertise, and worldview."
                  />
                  {selectedPersona.shaperSources.some(source => source.content.includes('scanned image')) && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Note: Some documents appear to be scanned images without selectable text. Information extraction may be limited.
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-md font-semibold text-slate-200 mb-2">Persona Shaper Documents</h4>
                  <label className="cursor-pointer font-semibold text-indigo-400 hover:text-indigo-300 text-sm block text-center p-4 border-2 border-dashed border-slate-600 rounded-lg hover:border-indigo-500 transition-colors">
                    Add Shaper Documents
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => e.target.files && handleAddShaperFiles(e.target.files)} 
                      accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.json" 
                    />
                  </label>
                  {selectedPersona.shaperSources.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                      {selectedPersona.shaperSources.map(source => (
                        <div key={source.id} className="flex items-center justify-between bg-slate-900/70 p-2 rounded-md text-sm">
                          <span className="text-slate-300 truncate">{source.name}</span>
                          <button 
                            onClick={() => handleRemoveShaperFile(source.id)} 
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <TrashIcon className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-700">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleDeletePersona(selectedPersona.id)} 
                      className="text-sm text-red-500 hover:text-red-400"
                    >
                      Delete Persona
                    </button>
                    <button
                      onClick={() => setIsWeightsControlOpen(true)}
                      className="px-3 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700"
                    >
                      Adjust Weights
                    </button>
                    {selectedPersona.shaperSources.length > 0 && (
                      <button
                        onClick={handleCalibratePersona}
                        disabled={isCalibrating}
                        className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCalibrating ? 'Calibrating...' : 'Calibrate Persona'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedPersona.calibrationStatus === 'calibrated' ? 'bg-green-600 text-white' :
                      selectedPersona.calibrationStatus === 'calibrating' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {calibrationService.getCalibrationStatus(selectedPersona).status}
                    </span>
                    <button 
                      onClick={() => handleSelectAndClose(selectedPersona.id)} 
                      className="px-4 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700"
                    >
                      Select & Close
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Select a persona on the left, or create a new one.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {isWeightsControlOpen && selectedPersona && (
        <PersonaWeightsControl
          persona={selectedPersona}
          onWeightsChange={handleWeightsChange}
          onClose={() => setIsWeightsControlOpen(false)}
        />
      )}
    </div>
  );
};

export default PersonaManager;