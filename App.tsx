import React, { useCallback, useEffect } from 'react';
import { useStore } from './store/useStore';
import { getPersonas, savePersonas, getKnowledgeSources, saveKnowledgeSources } from './services/db';
import { startChatSession, sendMessageStreamToChat, runQualityCheck, askPersonaQuestion } from './services/geminiService';
import SetupPanel from './components/SetupPanel';
import DocumentEditor from './components/DocumentEditor';
import FeedbackPanel from './components/FeedbackPanel';
import QualityReport from './components/QualityReport';
import MainLayout from './components/MainLayout';
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
  const {
    personas,
    activePersonaId,
    knowledgeSources,
    generatedContent,
    setPersonas,
    setActivePersonaId,
    setKnowledgeSources,
    setGeneratedContent,
  } = useStore();

  const [temperature, setTemperature] = React.useState<number>(0.5);
  const [feedback, setFeedback] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRefining, setIsRefining] = React.useState<boolean>(false);
  const [isCheckingQuality, setIsCheckingQuality] = React.useState<boolean>(false);
  const [isAskingQuestion, setIsAskingQuestion] = React.useState<boolean>(false);
  const [isPersonaManagerOpen, setIsPersonaManagerOpen] = React.useState<boolean>(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = React.useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState<boolean>(false);
  const [isGuidanceOpen, setIsGuidanceOpen] = React.useState<boolean>(false);
  const [isKnowledgeQualityOpen, setIsKnowledgeQualityOpen] = React.useState<boolean>(false);
  const [qualityReport, setQualityReport] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [chatSession, setChatSession] = React.useState<any | null>(null);

  const analyticsService = AnalyticsService.getInstance();
  const evolutionService = DocumentEvolutionService.getInstance();
  const feedbackService = FeedbackService.getInstance();
  const knowledgeProcessingService = KnowledgeProcessingService.getInstance();
  const advancedIngestionService = AdvancedKnowledgeIngestionService.getInstance();
  const feedbackDrivenImprovementService = FeedbackDrivenImprovementService.getInstance();
  const selectivePathwayService = SelectivePathwayProcessingService.getInstance();
  const documentEditingService = DocumentEditingService.getInstance();
  const structuredDocumentService = StructuredDocumentService.getInstance();

  useEffect(() => {
    const loadData = async () => {
      const personas = await getPersonas();
      setPersonas(personas);
      const knowledgeSources = await getKnowledgeSources();
      setKnowledgeSources(knowledgeSources);
    };
    loadData();
  }, [setPersonas, setKnowledgeSources]);

  useEffect(() => {
    savePersonas(personas);
  }, [personas]);

  useEffect(() => {
    saveKnowledgeSources(knowledgeSources);
  }, [knowledgeSources]);

  const activePersona = personas.find((p) => p.id === activePersonaId) || null;

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
        metadata: { persona: activePersona.name, sourceCount: knowledgeSources.length },
      });

      let fullContent = '';
      for await (const chunk of initialGeneration) {
        fullContent += chunk;
        setGeneratedContent(fullContent);
      }

      if (fullContent.trim()) {
        const snapshot = await evolutionService.createSnapshot(activePersona, fullContent, '', 1);
        const updatedPersona = {
          ...activePersona,
          documentSnapshots: [snapshot],
        };
        setPersonas(personas.map((p) => (p.id === activePersona.id ? updatedPersona : p)));
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setChatSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [activePersona, knowledgeSources, temperature, analyticsService, evolutionService, personas, setPersonas, setGeneratedContent]);

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

      feedbackService.trackRefinementFeedback(feedback, activePersona.id, activePersona.id);

      analyticsService.trackEvent({
        type: 'document_refined',
        timestamp: new Date().toISOString(),
        metadata: { feedbackLength: feedback.length, contentLength: generatedContent.length },
      });

      let fullContent = '';
      for await (const chunk of refinementStream) {
        fullContent += chunk;
        setGeneratedContent(fullContent);
      }

      if (fullContent.trim() && activePersona.documentSnapshots) {
        const version = (activePersona.documentSnapshots.length || 0) + 1;
        const snapshot = await evolutionService.createSnapshot(
          activePersona,
          fullContent,
          previousContent,
          version
        );
        const updatedPersona = {
          ...activePersona,
          documentSnapshots: [...(activePersona.documentSnapshots || []), snapshot],
        };
        setPersonas(personas.map((p) => (p.id === activePersona.id ? updatedPersona : p)));
      }

      setFeedback('');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsRefining(false);
    }
  }, [activePersona, feedback, generatedContent, analyticsService, evolutionService, feedbackService, personas, setPersonas, setGeneratedContent]);

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

      const assessment = parseQualityAssessment(report, activePersona);
      if (assessment) {
        analyticsService.trackQualityAssessment(assessment);

        const qualityMetrics: EditQualityMetrics = {
          clarity: assessment.personaConsistency,
          accuracy: assessment.knowledgeIntegration,
          relevance: assessment.responseRelevance,
          overall: assessment.overallQuality,
        };

        feedbackService.trackQualityCheckFeedback(
          report,
          qualityMetrics,
          activePersona.id,
          activePersona.id
        );
      }

      analyticsService.trackEvent({
        type: 'quality_check',
        timestamp: new Date().toISOString(),
        metadata: { contentLength: generatedContent.length, persona: activePersona.name },
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsCheckingQuality(false);
    }
  }, [generatedContent, activePersona, analyticsService, feedbackService]);

  const parseQualityAssessment = (report: string, persona: any): QualityAssessment | null => {
    try {
      const lines = report.split('\n');
      let personaConsistency = 0;
      let knowledgeIntegration = 0;
      let responseRelevance = 0;
      let overallQuality = 0;

      lines.forEach((line) => {
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
        sessionId: analyticsService.getCurrentSessionId(),
      };
    } catch (error) {
      console.error('Failed to parse quality assessment:', error);
      return null;
    }
  };

  const handleGenerateFromPrompt = useCallback(
    async (prompt: string) => {
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

        if (generatedContent.trim()) {
          const snapshot = await evolutionService.createSnapshot(
            activePersona,
            generatedContent,
            '',
            1
          );
          const updatedPersona = {
            ...activePersona,
            documentSnapshots: [snapshot],
          };
          setPersonas(personas.map((p) => (p.id === activePersona.id ? updatedPersona : p)));
        }

        analyticsService.trackEvent({
          type: 'document_generated',
          timestamp: new Date().toISOString(),
          metadata: { persona: activePersona.name, sourceCount: knowledgeSources.length, prompt },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(errorMessage);
        setChatSession(null);
      } finally {
        setIsLoading(false);
      }
    },
    [activePersona, knowledgeSources, analyticsService, evolutionService, structuredDocumentService, personas, setPersonas, setGeneratedContent]
  );

  const handleAskQuestion = useCallback(
    async (question: string) => {
      if (!activePersona) {
        setError('Please select or create a persona first.');
        return;
      }
      if (knowledgeSources.length === 0) {
        setError('Please add sources to the Knowledge Base before asking questions.');
        return;
      }
      if (!chatSession) {
        try {
          startChatSession(
            activePersona,
            'Start a conversation to answer questions based on the provided knowledge sources.',
            knowledgeSources,
            temperature
          );
          setChatSession({});
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
              sourceCount: knowledgeSources.length,
            },
          });

          await handleStream(responseStream);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(errorMessage);
      } finally {
        setIsAskingQuestion(false);
      }
    },
    [activePersona, knowledgeSources, temperature, chatSession, analyticsService, setGeneratedContent]
  );

  const handleReset = useCallback(() => {
    setGeneratedContent('');
    setFeedback('');
    setChatSession(null);
    setError(null);
    setKnowledgeSources([]);
  }, [setGeneratedContent, setKnowledgeSources]);

  const handleImportData = useCallback(
    (personas, knowledgeSources) => {
      setPersonas(personas);
      setKnowledgeSources(knowledgeSources);
      setActivePersonaId(null);
      handleReset();
    },
    [setPersonas, setKnowledgeSources, setActivePersonaId, handleReset]
  );

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
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
      <MainLayout
        controlPanel={
          <SetupPanel
            activePersona={activePersona}
            onManagePersonas={() => setIsPersonaManagerOpen(true)}
            knowledgeSources={knowledgeSources}
            setKnowledgeSources={setKnowledgeSources}
            isLoading={isLoading || isRefining || isCheckingQuality || isAskingQuestion}
          />
        }
        documentEditor={
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
            snapshots={activePersona?.documentSnapshots || []}
          />
        }
        feedbackPanel={
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
        }
      />
      {isPersonaManagerOpen && (
        <PersonaManager
          personas={personas}
          setPersonas={setPersonas}
          activePersonaId={activePersonaId}
          setActivePersonaId={setActivePersonaId}
          knowledgeSources={knowledgeSources}
          onClose={() => setIsPersonaManagerOpen(false)}
        />
      )}
      {qualityReport && <QualityReport report={qualityReport} onClose={() => setQualityReport(null)} />}
      {isDataManagerOpen && (
        <DataManager
          personas={personas}
          knowledgeSources={knowledgeSources}
          onImport={handleImportData}
          onClose={() => setIsDataManagerOpen(false)}
        />
      )}
      {isSearchOpen && (
        <SearchModal
          personas={personas}
          knowledgeSources={knowledgeSources}
          onSelectPersona={(personaId) => {
            setActivePersonaId(personaId);
            analyticsService.trackEvent({
              type: 'search_performed',
              timestamp: new Date().toISOString(),
              metadata: { personaSelected: personaId },
            });
          }}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
      {isAnalyticsOpen && (
        <AnalyticsDashboard
          personas={personas}
          knowledgeSources={knowledgeSources}
          generatedContent={generatedContent}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}
      {isKnowledgeQualityOpen && <KnowledgeQualityDashboard onClose={() => setIsKnowledgeQualityOpen(false)} />}
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
