import React, { useState, useCallback, useEffect } from 'react';
import { AnalysisTask, Source, Persona } from './types';
import { startChatSession, sendMessageStreamToChat, runQualityCheck, askPersonaQuestion } from './services/geminiService';
import ControlPanel from './components/ControlPanel';
import DocumentEditor from './components/DocumentEditor';
import FeedbackPanel from './components/FeedbackPanel';
import QualityReport from './components/QualityReport';
import SparkleIcon from './components/icons/SparkleIcon';
import PersonaManager from './components/PersonaManager';
import DataManager from './components/DataManager';
import SearchModal from './components/SearchModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DevelopmentGuidancePanel from './components/DevelopmentGuidancePanel';
import KnowledgeQualityDashboard from './components/KnowledgeQualityDashboard';
import BookOpenIcon from './components/icons/BookOpenIcon';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import StatusBar from './components/StatusBar';
import { AnalyticsService, QualityAssessment } from './services/analyticsService';
import { DocumentEvolutionService } from './services/documentEvolutionService';
import { FeedbackService, EditQualityMetrics } from './services/feedbackService';
import { KnowledgeProcessingService } from './services/knowledgeProcessingService';
import { AdvancedKnowledgeIngestionService } from './services/advancedKnowledgeIngestionService';
import { FeedbackDrivenImprovementService } from './services/feedbackDrivenImprovementService';
import { SelectivePathwayProcessingService } from './services/selectivePathwayProcessingService';
import { DocumentEditingService } from './services/documentEditingService';
import { StructuredDocumentService } from './services/structuredDocumentService';
// import type { ChatSession } from '@google/generative-ai';

const App: React.FC = () => {
  const [savedPersonas, setSavedPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<Source[]>([]);
  
  const [temperature, setTemperature] = useState<number>(0.5);
  const [feedback, setFeedback] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isCheckingQuality, setIsCheckingQuality] = useState<boolean>(false);
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);
  const [isPersonaManagerOpen, setIsPersonaManagerOpen] = useState<boolean>(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState<boolean>(false);
  const [isKnowledgeQualityOpen, setIsKnowledgeQualityOpen] = useState<boolean>(false);

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [qualityReport, setQualityReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<any | null>(null);

  const analyticsService = AnalyticsService.getInstance();
  const evolutionService = DocumentEvolutionService.getInstance();
  const feedbackService = FeedbackService.getInstance();
  const knowledgeProcessingService = KnowledgeProcessingService.getInstance();
  const advancedIngestionService = AdvancedKnowledgeIngestionService.getInstance();
  const feedbackDrivenImprovementService = FeedbackDrivenImprovementService.getInstance();
  const selectivePathwayService = SelectivePathwayProcessingService.getInstance();
  const documentEditingService = DocumentEditingService.getInstance();
  const structuredDocumentService = StructuredDocumentService.getInstance();

  // Load personas from localStorage on initial render
  useEffect(() => {
    try {
      const storedPersonas = localStorage.getItem('knowledge-weaver-personas');
      if (storedPersonas) {
        setSavedPersonas(JSON.parse(storedPersonas));
      }
    } catch (e) {
      console.error("Failed to load personas from localStorage", e);
    }
  }, []);

  // Save personas to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('knowledge-weaver-personas', JSON.stringify(savedPersonas));
    } catch (e) {
      console.error("Failed to save personas to localStorage", e);
    }
  }, [savedPersonas]);

  const activePersona = savedPersonas.find(p => p.id === activePersonaId) || null;

  const handleStream = async (stream: AsyncGenerator<string, void, unknown>) => {
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk;
      setGeneratedContent(fullText);
    }
  };

  const handleGenerateDraft = useCallback(async () => {
    if (!activePersona) {
      setError('Please select or create a persona first.');
      return;
    }
    if (knowledgeSources.length === 0) {
      setError('Please add sources to the Knowledge Base before generating a draft.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedContent('');
    setChatSession(null);

    try {
      const initialGeneration = startChatSession(
        activePersona,
        'Synthesize a comprehensive draft based on the provided knowledge sources.',
        knowledgeSources,
        temperature
      );

      analyticsService.trackEvent({
        type: 'document_generated',
        timestamp: new Date().toISOString(),
        metadata: { persona: activePersona.name, sourceCount: knowledgeSources.length }
      });

      let fullContent = '';
      for await (const chunk of initialGeneration) {
        fullContent += chunk;
        setGeneratedContent(fullContent);
      }

      // Create initial snapshot after generation
      if (fullContent.trim()) {
        const snapshot = await evolutionService.createSnapshot(activePersona, fullContent, '', 1);
        const updatedPersona = {
          ...activePersona,
          documentSnapshots: [snapshot]
        };
        setSavedPersonas(prev => prev.map(p => p.id === activePersona.id ? updatedPersona : p));
      }

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setChatSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [activePersona, knowledgeSources, temperature, analyticsService, evolutionService]);

  const handleRefine = useCallback(async () => {
    if (!activePersona) {
      setError('No active persona selected.');
      return;
    }
    if (!feedback.trim()) {
      setError('Please provide feedback to refine the document.');
      return;
    }
    setIsRefining(true);
    setError(null);

    try {
      const previousContent = generatedContent;
      const refinementStream = sendMessageStreamToChat(feedback, generatedContent);

      // Track refinement feedback
      feedbackService.trackRefinementFeedback(feedback, activePersona.id, activePersona.id);

      analyticsService.trackEvent({
        type: 'document_refined',
        timestamp: new Date().toISOString(),
        metadata: { feedbackLength: feedback.length, contentLength: generatedContent.length }
      });

      let fullContent = '';
      for await (const chunk of refinementStream) {
        fullContent += chunk;
        setGeneratedContent(fullContent);
      }

      // Create snapshot after refinement
      if (fullContent.trim() && activePersona.documentSnapshots) {
        const version = (activePersona.documentSnapshots.length || 0) + 1;
        const snapshot = await evolutionService.createSnapshot(activePersona, fullContent, previousContent, version);
        const updatedPersona = {
          ...activePersona,
          documentSnapshots: [...(activePersona.documentSnapshots || []), snapshot]
        };
        setSavedPersonas(prev => prev.map(p => p.id === activePersona.id ? updatedPersona : p));
      }

      setFeedback(''); // Clear feedback after successful refinement
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsRefining(false);
    }
  }, [activePersona, feedback, generatedContent, analyticsService, evolutionService, feedbackService]);

  const handleQualityCheck = useCallback(async () => {
    if (!generatedContent) {
      setError('There is no document to analyze.');
      return;
    }
    if (!activePersona) {
      setError('An active persona is required for a quality check.');
      return;
    }
    setIsCheckingQuality(true);
    setError(null);
    try {
      const report = await runQualityCheck(generatedContent, activePersona);
      setQualityReport(report);

      // Parse and track quality assessment
      const assessment = parseQualityAssessment(report, activePersona);
      if (assessment) {
        analyticsService.trackQualityAssessment(assessment);
        
        // Track quality check feedback with metrics
        const qualityMetrics: EditQualityMetrics = {
          clarity: assessment.personaConsistency,
          accuracy: assessment.knowledgeIntegration,
          relevance: assessment.responseRelevance,
          overall: assessment.overallQuality
        };
        
        feedbackService.trackQualityCheckFeedback(report, qualityMetrics, activePersona.id, activePersona.id);
      }

      analyticsService.trackEvent({
        type: 'quality_check',
        timestamp: new Date().toISOString(),
        metadata: { contentLength: generatedContent.length, persona: activePersona.name }
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsCheckingQuality(false);
    }
  }, [generatedContent, activePersona, analyticsService, feedbackService]);

  const parseQualityAssessment = (report: string, persona: Persona): QualityAssessment | null => {
    try {
      const lines = report.split('\n');
      let personaConsistency = 0;
      let knowledgeIntegration = 0;
      let responseRelevance = 0;
      let overallQuality = 0;

      lines.forEach(line => {
        const consistencyMatch = line.match(/PERSONA CONSISTENCY:\s*(\d+)\/100/);
        if (consistencyMatch) personaConsistency = parseInt(consistencyMatch[1]);

        const knowledgeMatch = line.match(/KNOWLEDGE INTEGRATION:\s*(\d+)\/100/);
        if (knowledgeMatch) knowledgeIntegration = parseInt(knowledgeMatch[1]);

        const relevanceMatch = line.match(/RESPONSE RELEVANCE:\s*(\d+)\/100/);
        if (relevanceMatch) responseRelevance = parseInt(relevanceMatch[1]);

        const overallMatch = line.match(/OVERALL QUALITY:\s*(\d+)\/100/);
        if (overallMatch) overallQuality = parseInt(overallMatch[1]);
      });

      return {
        personaConsistency,
        knowledgeIntegration,
        responseRelevance,
        overallQuality,
        timestamp: new Date().toISOString(),
        sessionId: analyticsService.getCurrentSessionId()
      };
    } catch (error) {
      console.error('Failed to parse quality assessment:', error);
      return null;
    }
  };

  const handleGenerateFromPrompt = useCallback(async (prompt: string) => {
    if (!activePersona) {
      setError('Please select or create a persona first.');
      return;
    }
    if (knowledgeSources.length === 0) {
      setError('Please add sources to the Knowledge Base before generating content.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedContent('');
    setChatSession(null);

    try {
      const generatedContent = await structuredDocumentService.generateDocumentFromSources(
        knowledgeSources,
        prompt,
        activePersona
      );

      setGeneratedContent(generatedContent);

      // Create initial snapshot after generation
      if (generatedContent.trim()) {
        const snapshot = await evolutionService.createSnapshot(activePersona, generatedContent, '', 1);
        const updatedPersona = {
          ...activePersona,
          documentSnapshots: [snapshot]
        };
        setSavedPersonas(prev => prev.map(p => p.id === activePersona.id ? updatedPersona : p));
      }

      analyticsService.trackEvent({
        type: 'document_generated',
        timestamp: new Date().toISOString(),
        metadata: { persona: activePersona.name, sourceCount: knowledgeSources.length, prompt }
      });

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setChatSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [activePersona, knowledgeSources, analyticsService, evolutionService, structuredDocumentService]);

  const handleAskQuestion = useCallback(async (question: string) => {
    if (!activePersona) {
      setError('Please select or create a persona first.');
      return;
    }
    if (knowledgeSources.length === 0) {
      setError('Please add sources to the Knowledge Base before asking questions.');
      return;
    }
    if (!chatSession) {
      // Create a chat session if one doesn't exist
      try {
        startChatSession(activePersona, 'Start a conversation to answer questions based on the provided knowledge sources.', knowledgeSources, temperature);
        setChatSession({}); // Placeholder - we'll need to modify the service to return chat session
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to create chat session.';
        setError(errorMessage);
        return;
      }
    }

    setIsAskingQuestion(true);
    setError(null);

    try {
      if (chatSession) {
        const responseStream = askPersonaQuestion(activePersona, knowledgeSources, question);

        analyticsService.trackEvent({
          type: 'persona_question',
          timestamp: new Date().toISOString(),
          metadata: {
            persona: activePersona.name,
            questionLength: question.length,
            sourceCount: knowledgeSources.length
          }
        });

        await handleStream(responseStream);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsAskingQuestion(false);
    }
  }, [activePersona, knowledgeSources, temperature, chatSession, analyticsService]);
  
  const handleReset = useCallback(() => {
    setGeneratedContent('');
    setFeedback('');
    setChatSession(null);
    setError(null);
    setKnowledgeSources([]);
  }, []);

  const handleImportData = useCallback((personas: Persona[], knowledgeSources: Source[]) => {
    setSavedPersonas(personas);
    setKnowledgeSources(knowledgeSources);
    setActivePersonaId(null);
    handleReset();
  }, [handleReset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-900">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparkleIcon className="w-8 h-8 text-indigo-400 mr-3" />
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            Knowledge Weaver
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-3 py-2 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors text-sm flex items-center gap-2"
            title="Search (Ctrl+K)"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Search
          </button>
          <button
            onClick={() => setIsKnowledgeQualityOpen(true)}
            className="px-3 py-2 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors text-sm flex items-center gap-2"
          >
            <BookOpenIcon className="w-4 h-4" />
            Knowledge Quality
          </button>
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="px-3 py-2 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors text-sm flex items-center gap-2"
          >
            <BookOpenIcon className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setIsGuidanceOpen(true)}
            className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
          >
            <SparkleIcon className="w-4 h-4" />
            AI Guidance
          </button>
          <button
            onClick={() => setIsDataManagerOpen(true)}
            className="px-3 py-2 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors text-sm"
          >
            Data Manager
          </button>
        </div>
      </header>
      <main className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        <div className="md:col-span-4 lg:col-span-3 flex flex-col">
          <ControlPanel
            activePersona={activePersona}
            onManagePersonas={() => setIsPersonaManagerOpen(true)}
            knowledgeSources={knowledgeSources}
            setKnowledgeSources={setKnowledgeSources}
            isLoading={isLoading || isRefining || isCheckingQuality || isAskingQuestion}
          />
        </div>
        <div className="md:col-span-8 lg:col-span-6 flex flex-col">
          <DocumentEditor
            content={generatedContent}
            setContent={setGeneratedContent}
            onReset={handleReset}
            isLoading={isLoading}
            isRefining={isRefining}
            error={error}
            clearError={() => setError(null)}
            activePersonaId={activePersonaId}
            activePersona={activePersona}
            knowledgeSources={knowledgeSources}
          />
        </div>
        <div className="md:col-span-12 lg:col-span-3 flex flex-col">
          <FeedbackPanel
            temperature={temperature}
            setTemperature={setTemperature}
            feedback={feedback}
            setFeedback={setFeedback}
            onGenerate={handleGenerateDraft}
            onRefine={handleRefine}
            onQualityCheck={handleQualityCheck}
            onAskQuestion={handleAskQuestion}
            onGenerateFromPrompt={handleGenerateFromPrompt}
            isLoading={isLoading}
            isRefining={isRefining}
            isCheckingQuality={isCheckingQuality}
            isAskingQuestion={isAskingQuestion}
            hasKnowledgeSources={knowledgeSources.length > 0}
            isPersonaActive={!!activePersona}
            hasDocument={!!generatedContent}
          />
        </div>
      </main>
      {isPersonaManagerOpen && (
        <PersonaManager
            personas={savedPersonas}
            setPersonas={setSavedPersonas}
            activePersonaId={activePersonaId}
            setActivePersonaId={setActivePersonaId}
            knowledgeSources={knowledgeSources}
            onClose={() => setIsPersonaManagerOpen(false)}
        />
      )}
      {qualityReport && (
        <QualityReport 
            report={qualityReport} 
            onClose={() => setQualityReport(null)} 
        />
      )}
      {isDataManagerOpen && (
        <DataManager
          personas={savedPersonas}
          knowledgeSources={knowledgeSources}
          onImport={handleImportData}
          onClose={() => setIsDataManagerOpen(false)}
        />
      )}
      {isSearchOpen && (
        <SearchModal
          personas={savedPersonas}
          knowledgeSources={knowledgeSources}
          onSelectPersona={(personaId) => {
            setActivePersonaId(personaId);
            analyticsService.trackEvent({
              type: 'search_performed',
              timestamp: new Date().toISOString(),
              metadata: { personaSelected: personaId }
            });
          }}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
      {isAnalyticsOpen && (
        <AnalyticsDashboard
          personas={savedPersonas}
          knowledgeSources={knowledgeSources}
          generatedContent={generatedContent}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}
      {isKnowledgeQualityOpen && (
        <KnowledgeQualityDashboard
          onClose={() => setIsKnowledgeQualityOpen(false)}
        />
      )}
      {isGuidanceOpen && activePersona && (
        <DevelopmentGuidancePanel
          persona={activePersona}
          currentContent={generatedContent}
          knowledgeSources={knowledgeSources}
          onClose={() => setIsGuidanceOpen(false)}
        />
      )}
      <StatusBar
        activePersona={activePersona}
        knowledgeSources={knowledgeSources}
        isLoading={isLoading}
        isRefining={isRefining}
        isCheckingQuality={isCheckingQuality}
        isAskingQuestion={isAskingQuestion}
        generatedContent={generatedContent}
      />
      <KeyboardShortcuts />
    </div>
  );
};

export default App;