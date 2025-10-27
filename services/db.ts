import { openDB } from 'idb';
import { Persona, Source } from '../types';

const dbPromise = openDB('knowledge-weaver-db', 1, {
  upgrade(db) {
    db.createObjectStore('personas', { keyPath: 'id' });
    db.createObjectStore('knowledgeSources', { keyPath: 'id' });
  },
});

export const getPersonas = async (): Promise<Persona[]> => {
  return (await dbPromise).getAll('personas');
};

export const savePersonas = async (personas: Persona[]) => {
  const tx = (await dbPromise).transaction('personas', 'readwrite');
  await Promise.all(personas.map((persona) => tx.store.put(persona)));
  await tx.done;
};

export const getKnowledgeSources = async (): Promise<Source[]> => {
  return (await dbPromise).getAll('knowledgeSources');
};

export const saveKnowledgeSources = async (sources: Source[]) => {
  const tx = (await dbPromise).transaction('knowledgeSources', 'readwrite');
  await Promise.all(sources.map((source) => tx.store.put(source)));
  await tx.done;
};
