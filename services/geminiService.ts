import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Persona, Source } from '../types';
import { PersonaCalibrationService } from './personaCalibrationService';
import { DocumentEvolutionService } from './documentEvolutionService';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Available models in order of preference (current Gemini models)
const AVAILABLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite'
];

async function getAvailableModelWithFallback(): Promise<string> {
  for (const model of AVAILABLE_MODELS) {
    try {
      const testModel = genAI.getGenerativeModel({ model });
      await testModel.generateContent('test');
      return model;
    } catch (error) {
      console.log(`Model ${model} not available, trying next...`);
    }
  }
  throw new Error('No available Gemini models found');
}

function getAvailableModel(): string {
  // For now, try gemini-pro first as it's most likely to be available
  return 'gemini-2.0-flash';
}

// Helper to build system instruction
function getEnhancedSystemInstruction(persona: Persona, knowledgeSources: Source[], currentContent?: string): string {
  const calibrationService = PersonaCalibrationService.getInstance();
  const evolutionService = DocumentEvolutionService.getInstance();

  let baseInstruction = '';

  // Use calibrated personality profile if available
  if (calibrationService.isPersonaCalibrated(persona)) {
    baseInstruction = calibrationService.generateEnhancedSystemInstruction(persona, knowledgeSources);
  } else {
    // Fallback to basic personality extraction for uncalibrated personas
    const traits = extractPersonalityTraits(persona);
    const worldview = generateWorldviewStatement(persona);
    const decisionFramework = generateDecisionFramework(persona);

    const sourceList = persona.shaperSources.length > 0
      ? `Your expertise is informed by the following documents you have studied:
${persona.shaperSources.map(s => `- ${s.name}: ${s.content.substring(0, 100)}...`).join('\n')}`
      : 'You draw from your innate understanding of your role and background.';

    const knowledgeText = knowledgeSources.length > 0
      ? '\n\nKnowledge Base:\n' + knowledgeSources.map(s => `${s.name}: ${s.content}`).join('\n')
      : '';

    baseInstruction = `You are ${persona.name} ${persona.surname}, embodying the role of ${persona.role}.
${persona.bio ? `BIOGRAPHY & BACKGROUND:
${persona.bio}
` : ''}

CORE TRAITS & PERSPECTIVE:
${traits.map(trait => `- ${trait}`).join('\n')}

WORLDVIEW & VALUES:
${worldview}

DECISION-MAKING FRAMEWORK:
${decisionFramework}

${sourceList}${knowledgeText}

PERSONA SYNTHESIS INSTRUCTIONS:
1. **Think in Character**: Always reason through your persona's lens before responding
2. **Contextual Analysis**: Apply your background and experiences to the given knowledge
3. **Perspective Integration**: Weave your personality traits into your analysis naturally
4. **Evidence-Based Reasoning**: Support your views with references to your background or the provided knowledge
5. **Consistent Voice**: Maintain your persona's tone, vocabulary, and analytical style throughout

When responding to questions or analyzing information:
- Start by acknowledging your perspective: "As a [role] with [background/experience]..."
- Reference relevant experiences: "Based on my experience in [field/domain]..."
- Apply your worldview: "From my perspective as someone who values [core values]..."
- Synthesize knowledge through your lens: "Given my background, I believe [analysis]..."

Remember: You are not just an AI assistant - you ARE this persona. Every response must reflect their unique perspective, experiences, and worldview.`;
  }

  // Add evolution context if available
  const evolutionContext = currentContent ? evolutionService.getEvolutionContext(persona, currentContent) : '';

  return baseInstruction + evolutionContext;
}

const extractPersonalityTraits = (persona: Persona): string[] => {
  const traits: string[] = [];

  // Extract from role
  const roleLower = persona.role.toLowerCase();
  if (roleLower.includes('president') || roleLower.includes('leader')) {
    traits.push('Strategic and security-conscious decision making');
    traits.push('Focus on national interests and international relations');
    traits.push('Experience with high-stakes political negotiations');
  }
  if (roleLower.includes('diplomat')) {
    traits.push('Neutral and balanced perspective on international conflicts');
    traits.push('Emphasis on dialogue and de-escalation');
    traits.push('Understanding of cultural and political nuances');
  }
  if (roleLower.includes('business') || roleLower.includes('entrepreneur')) {
    traits.push('Results-oriented and pragmatic approach');
    traits.push('Understanding of economic implications');
    traits.push('Risk assessment and strategic planning mindset');
  }
  if (roleLower.includes('analyst') || roleLower.includes('researcher')) {
    traits.push('Data-driven and evidence-based analysis');
    traits.push('Methodical and systematic thinking');
    traits.push('Focus on underlying patterns and trends');
  }

  // Extract from bio
  const bioLower = (persona.bio || '').toLowerCase();
  if (bioLower.includes('kgb') || bioLower.includes('intelligence') || bioLower.includes('security')) {
    traits.push('Security-first approach to international relations');
    traits.push('Understanding of covert operations and strategic intelligence');
    traits.push('Suspicion of foreign intentions and hidden agendas');
  }
  if (bioLower.includes('military') || bioLower.includes('defense')) {
    traits.push('Military strategy and defense considerations');
    traits.push('Understanding of power dynamics and deterrence');
    traits.push('Experience with crisis management and conflict resolution');
  }
  if (bioLower.includes('diploma') || bioLower.includes('foreign affairs')) {
    traits.push('Sophisticated understanding of international diplomacy');
    traits.push('Cultural sensitivity and cross-cultural communication');
    traits.push('Long-term strategic thinking in global contexts');
  }

  // Default traits if none extracted
  if (traits.length === 0) {
    traits.push(`Expert-level knowledge in ${persona.role.toLowerCase()}`);
    traits.push('Professional and authoritative communication style');
    traits.push('Evidence-based reasoning and analysis');
  }

  return traits;
};

const generateWorldviewStatement = (persona: Persona): string => {
  const roleLower = persona.role.toLowerCase();
  const bioLower = (persona.bio || '').toLowerCase();

  if (roleLower.includes('president') || roleLower.includes('leader')) {
    return "You prioritize national security, economic stability, and strategic international relationships. You understand that every decision has global implications and must balance competing interests while maintaining sovereignty and national interests.";
  }

  if (roleLower.includes('diplomat')) {
    return "You believe in dialogue, mutual understanding, and peaceful resolution of conflicts. You see international relations as a complex web of relationships where cultural understanding and diplomatic channels are essential for stability.";
  }

  if (bioLower.includes('kgb') || bioLower.includes('intelligence')) {
    return "You view the world through a lens of strategic realism, where security considerations are paramount. You understand that nations act in their self-interest and that trust must be earned through actions, not words.";
  }

  return `You approach analysis with the expertise and perspective of a ${persona.role}, drawing on professional experience and deep knowledge of your domain to provide insightful, well-reasoned perspectives.`;
};

const generateDecisionFramework = (persona: Persona): string => {
  const roleLower = persona.role.toLowerCase();
  const bioLower = (persona.bio || '').toLowerCase();

  if (roleLower.includes('president')) {
    return "You consider: 1) National security implications, 2) Economic impact, 3) International alliances, 4) Public opinion, 5) Long-term strategic consequences. You weigh immediate needs against future stability.";
  }

  if (bioLower.includes('kgb') || bioLower.includes('intelligence')) {
    return "You analyze: 1) Hidden motivations and agendas, 2) Security implications, 3) Power dynamics, 4) Risk assessment, 5) Strategic advantages. You look beyond surface-level information.";
  }

  return "You evaluate situations based on your professional expertise, considering relevant factors, potential consequences, and alignment with your core values and objectives.";
};

// Updated startChatSession
async function* startChatSession(persona: Persona, initialPrompt: string, knowledgeSources: Source[], temperature = 0.7, currentContent?: string) {
  if (knowledgeSources.length === 0) throw new Error('No knowledge sources');

  const model = genAI.getGenerativeModel({
    model: getAvailableModel(),
    generationConfig: { temperature },
    systemInstruction: getEnhancedSystemInstruction(persona, knowledgeSources, currentContent)
  });

  const chat = model.startChat();
  const result = await chat.sendMessageStream(initialPrompt);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export { startChatSession };

export async function* askPersonaQuestion(
  persona: Persona,
  knowledgeSources: Source[],
  userQuery: string
) {
  if (knowledgeSources.length === 0) {
    throw new Error("Knowledge Base sources cannot be empty.");
  }

  const model = genAI.getGenerativeModel({
    model: getAvailableModel(),
    generationConfig: { temperature: 0.7 },
    systemInstruction: getEnhancedSystemInstruction(persona, knowledgeSources)
  });

  const chat = model.startChat();
  const result = await chat.sendMessageStream(userQuery);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export async function* sendMessageStreamToChat(
  feedback: string,
  currentDocument: string
) {
  if (!feedback.trim()) {
    throw new Error("Feedback cannot be empty.");
  }

  const model = genAI.getGenerativeModel({
    model: getAvailableModel(),
    generationConfig: { temperature: 0.7 },
    systemInstruction: 'You are an AI assistant refining documents based on feedback.'
  });

  const chat = model.startChat();
  const result = await chat.sendMessageStream(`Feedback: ${feedback}
Document: ${currentDocument}`);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export async function runQualityCheck(documentContent: string, persona: Persona): Promise<string> {
  if (!documentContent.trim()) {
    throw new Error("Document content cannot be empty.");
  }

  const model = genAI.getGenerativeModel({
    model: getAvailableModel(),
    generationConfig: { temperature: 0.7 },
    systemInstruction: `You are an expert AI quality analyst. Analyze the document written by ${persona.name} ${persona.surname} (${persona.role}) and provide scores (0-100) for: Persona Consistency, Knowledge Integration, Response Relevance, Overall Quality. Format: CATEGORY: [score]/100 - [explanation]. Summary: [2-3 sentences].`
  });

  const result = await model.generateContent(documentContent);
  return result.response.text();
}

export { extractPersonalityTraits, generateWorldviewStatement, generateDecisionFramework };
