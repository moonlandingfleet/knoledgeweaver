import { Persona, Source } from '../types';

export interface SearchResult {
  type: 'persona' | 'source' | 'content';
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  matches: {
    field: string;
    value: string;
    highlighted: string;
  }[];
}

export interface SearchFilters {
  type?: 'all' | 'personas' | 'sources' | 'content';
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasContent?: boolean;
}

export class SearchService {
  private static instance: SearchService;

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  search(
    query: string,
    personas: Persona[],
    knowledgeSources: Source[],
    filters: SearchFilters = {}
  ): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    // Search personas
    if (filters.type === 'all' || filters.type === 'personas' || !filters.type) {
      personas.forEach(persona => {
        const matches = this.findMatches(persona, searchTerms);
        if (matches.length > 0) {
          results.push({
            type: 'persona',
            id: persona.id,
            title: `${persona.name} ${persona.surname}`,
            snippet: persona.bio || persona.role,
            relevance: this.calculateRelevance(matches),
            matches
          });
        }
      });
    }

    // Search knowledge sources
    if (filters.type === 'all' || filters.type === 'sources' || !filters.type) {
      knowledgeSources.forEach(source => {
        const matches = this.findMatches(source, searchTerms);
        if (matches.length > 0) {
          results.push({
            type: 'source',
            id: source.id,
            title: source.name,
            snippet: source.content.substring(0, 150) + (source.content.length > 150 ? '...' : ''),
            relevance: this.calculateRelevance(matches),
            matches
          });
        }
      });
    }

    // Search within content
    if (filters.type === 'all' || filters.type === 'content' || !filters.type) {
      personas.forEach(persona => {
        persona.shaperSources.forEach(source => {
          const matches = this.findMatches(source, searchTerms);
          if (matches.length > 0) {
            results.push({
              type: 'content',
              id: `${persona.id}-${source.id}`,
              title: `${source.name} (from ${persona.name})`,
              snippet: source.content.substring(0, 150) + (source.content.length > 150 ? '...' : ''),
              relevance: this.calculateRelevance(matches),
              matches
            });
          }
        });
      });
    }

    // Apply filters
    let filteredResults = results.filter(result => {
      if (filters.hasContent !== undefined) {
        if (filters.hasContent && (!result.snippet || result.snippet.trim().length === 0)) return false;
        if (!filters.hasContent && result.snippet && result.snippet.trim().length > 0) return false;
      }

      return true;
    });

    // Sort by relevance
    filteredResults.sort((a, b) => b.relevance - a.relevance);

    return filteredResults.slice(0, 50); // Limit to top 50 results
  }

  private findMatches(item: Persona | Source, searchTerms: string[]) {
    const matches: SearchResult['matches'] = [];
    const fields = this.getSearchableFields(item);

    fields.forEach(field => {
      const value = field.value.toLowerCase();
      const fieldMatches: string[] = [];

      searchTerms.forEach(term => {
        if (value.includes(term)) {
          fieldMatches.push(term);
        }
      });

      if (fieldMatches.length > 0) {
        matches.push({
          field: field.name,
          value: field.value,
          highlighted: this.highlightMatches(field.value, fieldMatches)
        });
      }
    });

    return matches;
  }

  private getSearchableFields(item: Persona | Source) {
    if ('bio' in item) {
      // It's a Persona
      const persona = item as Persona;
      return [
        { name: 'name', value: persona.name },
        { name: 'surname', value: persona.surname },
        { name: 'role', value: persona.role },
        { name: 'bio', value: persona.bio || '' },
        ...persona.shaperSources.map(source => ({ name: `shaper-${source.name}`, value: source.content }))
      ];
    } else {
      // It's a Source
      const source = item as Source;
      return [
        { name: 'name', value: source.name },
        { name: 'content', value: source.content }
      ];
    }
  }

  private calculateRelevance(matches: SearchResult['matches']): number {
    let relevance = 0;
    matches.forEach(match => {
      const fieldWeights = {
        'name': 10,
        'role': 8,
        'bio': 6,
        'content': 4,
        'shaper': 5
      };

      const weight = fieldWeights[match.field as keyof typeof fieldWeights] || 3;
      relevance += weight * match.value.length;
    });

    return relevance;
  }

  private highlightMatches(text: string, terms: string[]): string {
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**');
    });
    return highlighted;
  }
}
