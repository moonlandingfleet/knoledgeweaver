const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const extractPersonalityTraits = (persona) => {
  const traits = [];
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
  if (traits.length === 0) {
    traits.push(`Expert-level knowledge in ${persona.role.toLowerCase()}`);
    traits.push('Professional and authoritative communication style');
    traits.push('Evidence-based reasoning and analysis');
  }
  return traits;
};

const generateWorldviewStatement = (persona) => {
  const roleLower = persona.role.toLowerCase();
  const bioLower = (persona.bio || '').toLowerCase();
  if (roleLower.includes('president') || roleLower.includes('leader')) {
    return 'You prioritize national security, economic stability, and strategic international relationships. You understand that every decision has global implications and must balance competing interests while maintaining sovereignty and national interests.';
  }
  if (roleLower.includes('diplomat')) {
    return 'You believe in dialogue, mutual understanding, and peaceful resolution of conflicts. You see international relations as a complex web of relationships where cultural understanding and diplomatic channels are essential for stability.';
  }
  if (bioLower.includes('kgb') || bioLower.includes('intelligence')) {
    return 'You view the world through a lens of strategic realism, where security considerations are paramount. You understand that nations act in their self-interest and that trust must be earned through actions, not words.';
  }
  return `You approach analysis with the expertise and perspective of a ${persona.role}, drawing on professional experience and deep knowledge of your domain to provide insightful, well-reasoned perspectives.`;
};

const generateDecisionFramework = (persona) => {
  const roleLower = persona.role.toLowerCase();
  const bioLower = (persona.bio || '').toLowerCase();
  if (roleLower.includes('president')) {
    return 'You consider: 1) National security implications, 2) Economic impact, 3) International alliances, 4) Public opinion, 5) Long-term strategic consequences. You weigh immediate needs against future stability.';
  }
  if (bioLower.includes('kgb') || bioLower.includes('intelligence')) {
    return 'You analyze: 1) Hidden motivations and agendas, 2) Security implications, 3) Power dynamics, 4) Risk assessment, 5) Strategic advantages. You look beyond surface-level information.';
  }
  return 'You evaluate situations based on your professional expertise, considering relevant factors, potential consequences, and alignment with your core values and objectives.';
};

const getEnhancedSystemInstruction = (persona, knowledgeSources) => {
  const traits = extractPersonalityTraits(persona);
  const worldview = generateWorldviewStatement(persona);
  const decisionFramework = generateDecisionFramework(persona);
  const sourceList =
    persona.shaperSources.length > 0
      ? `Your expertise is informed by the following documents you have studied:\n${persona.shaperSources
          .map((s) => `- ${s.name}: ${s.content.substring(0, 100)}...`)
          .join('\n')}`
      : 'You draw from your innate understanding of your role and background.';
  const knowledgeText =
    knowledgeSources.length > 0
      ? `\n\nKnowledge Base:\n${knowledgeSources.map((s) => `${s.name}: ${s.content}`).join('\n')}`
      : '';
  return `You are ${persona.name} ${persona.surname}, embodying the role of ${persona.role}.
${persona.bio ? `BIOGRAPHY & BACKGROUND:\n${persona.bio}\n` : ''}

CORE TRAITS & PERSPECTIVE:
${traits.map((trait) => `- ${trait}`).join('\n')}

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
};

app.post('/api/gemini', async (req, res) => {
  try {
    const { persona, initialPrompt, knowledgeSources, temperature } = req.body;
    const systemInstruction = getEnhancedSystemInstruction(persona, knowledgeSources);
    const contents = [{
      role: 'user',
      parts: [{ text: initialPrompt }],
    }];
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents,
        generationConfig: { temperature },
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
