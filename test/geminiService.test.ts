import { describe, it, expect } from 'vitest';
import { extractPersonalityTraits, generateWorldviewStatement, generateDecisionFramework } from '../services/geminiService';
import { Persona } from '../types';

describe('GeminiService', () => {
  const mockPersona: Persona = {
    id: 'test-id',
    name: 'Test',
    surname: 'User',
    role: 'Software Engineer',
    bio: 'Experienced developer with background in AI and machine learning',
    shaperSources: []
  };

  describe('extractPersonalityTraits', () => {
    it('extracts traits from role containing analyst', () => {
      const persona = { ...mockPersona, role: 'Data Analyst' };
      const traits = extractPersonalityTraits(persona);

      expect(traits).toContain('Data-driven and evidence-based analysis');
      expect(traits).toContain('Methodical and systematic thinking');
      expect(traits).toContain('Focus on underlying patterns and trends');
    });

    it('extracts traits from role containing president', () => {
      const persona = { ...mockPersona, role: 'President' };
      const traits = extractPersonalityTraits(persona);

      expect(traits).toContain('Strategic and security-conscious decision making');
      expect(traits).toContain('Focus on national interests and international relations');
      expect(traits).toContain('Experience with high-stakes political negotiations');
    });

    it('extracts traits from bio containing intelligence', () => {
      const persona = { ...mockPersona, bio: 'Former KGB intelligence officer' };
      const traits = extractPersonalityTraits(persona);

      expect(traits).toContain('Security-first approach to international relations');
      expect(traits).toContain('Understanding of covert operations and strategic intelligence');
      expect(traits).toContain('Suspicion of foreign intentions and hidden agendas');
    });

    it('provides default traits when no specific traits match', () => {
      const persona = { ...mockPersona, role: 'Consultant', bio: '' };
      const traits = extractPersonalityTraits(persona);

      expect(traits).toContain('Expert-level knowledge in consultant');
      expect(traits).toContain('Professional and authoritative communication style');
      expect(traits).toContain('Evidence-based reasoning and analysis');
    });
  });

  describe('generateWorldviewStatement', () => {
    it('generates president worldview for president role', () => {
      const persona = { ...mockPersona, role: 'President' };
      const worldview = generateWorldviewStatement(persona);

      expect(worldview).toContain('national security');
      expect(worldview).toContain('economic stability');
      expect(worldview).toContain('strategic international relationships');
    });

    it('generates diplomat worldview for diplomat role', () => {
      const persona = { ...mockPersona, role: 'Diplomat' };
      const worldview = generateWorldviewStatement(persona);

      expect(worldview).toContain('dialogue');
      expect(worldview).toContain('mutual understanding');
      expect(worldview).toContain('peaceful resolution');
    });

    it('generates intelligence worldview for KGB bio', () => {
      const persona = { ...mockPersona, bio: 'Former KGB officer' };
      const worldview = generateWorldviewStatement(persona);

      expect(worldview).toContain('strategic realism');
      expect(worldview).toContain('security considerations');
      expect(worldview).toContain('trust must be earned');
    });

    it('generates default worldview for unmatched roles', () => {
      const persona = { ...mockPersona, role: 'Software Engineer' };
      const worldview = generateWorldviewStatement(persona);

      expect(worldview).toContain('Software Engineer');
      expect(worldview).toContain('professional experience');
    });
  });

  describe('generateDecisionFramework', () => {
    it('generates president framework for president role', () => {
      const persona = { ...mockPersona, role: 'President' };
      const framework = generateDecisionFramework(persona);

      expect(framework).toContain('National security implications');
      expect(framework).toContain('Economic impact');
      expect(framework).toContain('International alliances');
      expect(framework).toContain('Long-term strategic consequences');
    });

    it('generates intelligence framework for intelligence bio', () => {
      const persona = { ...mockPersona, bio: 'Intelligence background' };
      const framework = generateDecisionFramework(persona);

      expect(framework).toContain('Hidden motivations');
      expect(framework).toContain('Security implications');
      expect(framework).toContain('Power dynamics');
      expect(framework).toContain('Risk assessment');
    });

    it('generates default framework for unmatched personas', () => {
      const persona = { ...mockPersona, role: 'Consultant' };
      const framework = generateDecisionFramework(persona);

      expect(framework).toContain('professional expertise');
      expect(framework).toContain('relevant factors');
      expect(framework).toContain('core values');
    });
  });
});
