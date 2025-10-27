import { Persona, Source } from '../types';

async function* startChatSession(persona: Persona, initialPrompt: string, knowledgeSources: Source[], temperature = 0.7, currentContent?: string) {
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      persona,
      initialPrompt,
      knowledgeSources,
      temperature,
      currentContent,
    }),
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

export { startChatSession };

export async function* askPersonaQuestion(
  persona: Persona,
  knowledgeSources: Source[],
  userQuery: string
) {
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      persona,
      knowledgeSources,
      userQuery,
    }),
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

export async function* sendMessageStreamToChat(
  feedback: string,
  currentDocument: string
) {
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      feedback,
      currentDocument,
    }),
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

export async function runQualityCheck(documentContent: string, persona: Persona): Promise<string> {
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentContent,
      persona,
    }),
  });

  const data = await response.json();
  return data.text;
}
