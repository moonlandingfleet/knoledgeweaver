import { describe, it, expect, vi } from 'vitest';
import { startChatSession } from '../services/geminiService';
import { Persona, Source } from '../types';

global.fetch = vi.fn();

describe('GeminiService', () => {
  const mockPersona: Persona = {
    id: 'test-id',
    name: 'Test',
    surname: 'User',
    role: 'Software Engineer',
    bio: 'Experienced developer with background in AI and machine learning',
    shaperSources: [],
    calibrationStatus: 'uncalibrated',
  };

  const mockSources: Source[] = [
    {
      id: 'source-1',
      name: 'Source 1',
      content: 'This is the content of source 1.',
    },
  ];

  it('should start a chat session and return a stream of text', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello'));
        controller.enqueue(new TextEncoder().encode(' '));
        controller.enqueue(new TextEncoder().encode('world'));
        controller.close();
      },
    });

    (fetch as any).mockResolvedValue({
      body: mockStream,
    });

    const stream = startChatSession(mockPersona, 'Test prompt', mockSources);
    const reader = stream[Symbol.asyncIterator]();

    let result = '';
    let next = await reader.next();
    while (!next.done) {
      result += next.value;
      next = await reader.next();
    }

    expect(result).toBe('Hello world');
  });
});
