import { Persona, Source } from '../types';

export interface KnowledgeWeaverData {
  personas: Persona[];
  knowledgeSources: Source[];
  exportDate: string;
  version: string;
  calibrationData?: {
    lastCalibrationCheck: string;
    calibratedPersonas: string[];
  };
  evolutionData?: {
    totalSnapshots: number;
    lastEvolutionUpdate: string;
  };
}

export const exportData = (personas: Persona[], knowledgeSources: Source[]): string => {
  const calibratedPersonas = personas
    .filter(p => p.calibrationStatus === 'calibrated')
    .map(p => p.id);

  const totalSnapshots = personas.reduce((sum, p) => sum + (p.documentSnapshots?.length || 0), 0);

  const data: KnowledgeWeaverData = {
    personas,
    knowledgeSources,
    exportDate: new Date().toISOString(),
    version: '1.2.0',
    calibrationData: {
      lastCalibrationCheck: new Date().toISOString(),
      calibratedPersonas
    },
    evolutionData: {
      totalSnapshots,
      lastEvolutionUpdate: new Date().toISOString()
    }
  };

  return JSON.stringify(data, null, 2);
};

export const importData = (jsonData: string): { personas: Persona[], knowledgeSources: Source[] } => {
  try {
    const data: KnowledgeWeaverData = JSON.parse(jsonData);

    // Basic validation
    if (!data.personas || !Array.isArray(data.personas)) {
      throw new Error('Invalid data format: missing personas array');
    }

    if (!data.knowledgeSources || !Array.isArray(data.knowledgeSources)) {
      throw new Error('Invalid data format: missing knowledgeSources array');
    }

    // Validate and migrate persona structure
    const migratedPersonas = data.personas.map((persona, index) => {
      if (!persona.id || !persona.name || !persona.role) {
        throw new Error(`Invalid persona at index ${index}: missing required fields`);
      }

      // Add calibrationStatus if missing (for backward compatibility)
      const migratedPersona: Persona = {
        ...persona,
        calibrationStatus: persona.calibrationStatus || 'uncalibrated'
      };

      return migratedPersona;
    });

    // Validate source structure
    data.knowledgeSources.forEach((source, index) => {
      if (!source.id || !source.name || !source.content) {
        throw new Error(`Invalid source at index ${index}: missing required fields`);
      }
    });

    return {
      personas: migratedPersonas,
      knowledgeSources: data.knowledgeSources
    };
  } catch (error) {
    throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const downloadData = (personas: Persona[], knowledgeSources: Source[], filename?: string) => {
  const data = exportData(personas, knowledgeSources);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `knowledge-weaver-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const uploadData = (): Promise<{ personas: Persona[], knowledgeSources: Source[] }> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = importData(content);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
};
