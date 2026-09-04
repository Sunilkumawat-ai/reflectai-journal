import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder compliant with Gemini API directives & high-demand resilience
const MODEL_FALLBACK_LADDER = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackResult {
  text: string;
  modelUsed: string;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithFallback(
  contents: any,
  systemInstruction?: string
): Promise<FallbackResult> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini] Generating reflection content with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      if (response && response.text) {
        console.log(`[Gemini] Successfully generated response using model: ${model}`);
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const errorStr =
        JSON.stringify(err || {}).toLowerCase() + ' ' + String(err?.message || '').toLowerCase();

      const isCapacityIssue =
        errorStr.includes('503') ||
        errorStr.includes('unavailable') ||
        errorStr.includes('429') ||
        errorStr.includes('demand') ||
        errorStr.includes('quota');

      // If more models remain in the ladder, smoothly step down to the next model
      if (i < MODEL_FALLBACK_LADDER.length - 1) {
        const nextModel = MODEL_FALLBACK_LADDER[i + 1];
        if (isCapacityIssue) {
          console.log(
            `[Gemini] Notice: Model ${model} is experiencing temporary demand spikes. Transitioning immediately to high-availability fallback: ${nextModel}...`
          );
          await delay(250);
        } else {
          console.log(
            `[Gemini] Notice: Model ${model} returned unhandled status. Stepping down to fallback model: ${nextModel}...`
          );
        }
      }
    }
  }

  throw new Error(
    `Failed to generate response across all models in fallback ladder. Last error: ${lastError?.message || JSON.stringify(lastError) || 'Unknown'}`
  );
}

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Gemini Multi-turn Reflection / Summarization Endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const entryContext = body.entryContext && typeof body.entryContext === 'object' ? body.entryContext : {};

    if (!prompt && history.length === 0) {
      res.status(400).json({ error: 'Prompt or conversation history is required.' });
      return;
    }

    // System instruction tailored to the requested mode
    let systemInstruction = `You are ReflectAI, an empathetic, insightful, and constructive personal reflection and journaling companion.
Your mission is to help the user unpack thoughts, gain self-awareness, organize ideas, and discover actionable personal insights.
Always maintain a calm, thoughtful, encouraging, and respectful tone. Avoid generic platitudes. Provide rich, markdown-formatted responses with crisp headers, bullet points, and gentle follow-up questions where helpful.`;

    if (mode === 'summarize') {
      systemInstruction += `\nFOCUS: Deliver an executive summary of the journal entry and thoughts provided. Include:
1. 📌 **Key Themes & Core Takeaways**
2. 💡 **Emotional Tone & Sentiment**
3. 🎯 **Action Items / Next Questions to ponder**`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\nFOCUS: Deliver creative brainstormed angles, perspective shifts, potential solutions, and constructive experiments the user can try. Structure with clear bullet points.`;
    } else if (mode === 'chat') {
      systemInstruction += `\nFOCUS: Engage in a natural, supportive dialogue deepening the discussion on whatever the user brings up.`;
    } else {
      // Default: Deep Reflection
      systemInstruction += `\nFOCUS: Provide deep reflective mirrors, identify underlying patterns, acknowledge emotional nuance, and pose 1-2 thoughtful guiding questions.`;
    }

    // Build context-enriched contents
    const contents: any[] = [];

    // If entry title or initial content is provided, pass as background context
    let contextNote = '';
    if (entryContext.title) {
      contextNote += `[Journal Entry Title: "${entryContext.title}"]\n`;
    }
    if (entryContext.content) {
      contextNote += `[Journal Entry Body:\n${entryContext.content}\n]\n`;
    }
    if (entryContext.mood) {
      contextNote += `[User Stated Mood: ${entryContext.mood}]\n`;
    }

    // Add prior conversation turns if any
    for (const item of history) {
      if (item && item.role && item.content) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    // Current turn with context
    const fullUserPrompt = contextNote ? `${contextNote}\nUser Query / Reflection:\n${prompt}` : prompt;
    contents.push({
      role: 'user',
      parts: [{ text: fullUserPrompt }],
    });

    const result = await generateContentWithFallback(contents, systemInstruction);

    // Optional metadata extraction: suggested title or mood if prompt was new entry
    let suggestedTitle: string | undefined;
    let suggestedMood: string | undefined;

    if (mode === 'summarize' || (!entryContext.title && prompt.length > 20)) {
      try {
        const titlePrompt = `Based on this reflection content, generate a concise, evocative 3 to 6 word title. Return ONLY the title text without quotes or preamble.\n\nContent:\n${prompt}`;
        const titleRes = await generateContentWithFallback([{ role: 'user', parts: [{ text: titlePrompt }] }]);
        suggestedTitle = titleRes.text.trim().replace(/^["']|["']$/g, '');
      } catch (e) {
        // Non-blocking
      }
    }

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      suggestedTitle,
      suggestedMood,
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/reflect:', error);
    res.status(500).json({
      error: error?.message || 'An unexpected error occurred while processing reflection with Gemini API.',
    });
  }
});

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflectAI Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
