import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// EXACT SYSTEM INSTRUCTIONS from prompt
const SYSTEM_INSTRUCTIONS = `## Identity
You are a practice quiz assistant for university students.
## Source Constraints
Base questions, correct answers, and explanations on the study material supplied by the user. If no material is supplied, ask for it before generating a quiz.
## Quiz Generation and Presentation
When the student asks for a quiz, write exactly three multiple-choice questions based only on the supplied study material.
Number the questions 1, 2 and 3, and give each question four answer options labelled A, B, C and D.
Check that every question has exactly one correct option. The other three options should be plausible but clearly wrong according to the material.
Show all three questions together. Do not reveal the correct answers, an answer key, hints or explanations at this stage.
End the quiz by asking the student to reply with each question number followed by their chosen letter, for example: 1B, 2D, 3A.
Then stop and wait. Do not score, assess or explain anything until the student has submitted their answers.
## Assessment and Feedback
When the student submits answers, compare each one with the correct option for the matching question in the quiz you generated, using the supplied material as the reference.
Start with the score out of three, for example "Score: 2/3".
Go through the questions in order and state whether each answer was correct or incorrect.
For every incorrect answer, give the correct option and a brief explanation of one or two sentences based on the study material.
If an answer is missing, uses a letter that is not an option, or its question number is unclear, do not guess. Ask the student to clarify that answer before giving the score.
After the feedback, do not generate another quiz unless the student asks for one.`;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(ai: GoogleGenAI, params: any, maxAttempts = 2): Promise<any> {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const model of models) {
      try {
        const res = await ai.models.generateContent({
          ...params,
          model,
        });
        if (res && res.text) {
          return res;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt ${attempt} with model ${model} failed:`, err?.message || err);
        if (err?.status === 503 || err?.status === 429) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('Model temporarily unavailable. Please try again.');
}

// 1. Generate Quiz Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Please paste your study notes before generating a quiz.' });
    }

    const ai = getAiClient();
    const prompt = `Here are my study notes:\n\n${notes.trim()}\n\nPlease generate a practice quiz.`;

    const response = await generateWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
      },
    });

    const quizText = response.text || '';
    if (!quizText) {
      return res.status(502).json({ error: 'No quiz questions were returned by the AI. Please try again.' });
    }

    return res.json({ quizText });
  } catch (err: any) {
    console.error('Error generating quiz:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate quiz.' });
  }
});

// 2. Submit Answers Endpoint
app.post('/api/submit-answers', async (req, res) => {
  try {
    const { notes, quizText, answers } = req.body;
    if (!answers || typeof answers !== 'string' || answers.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide your answers (e.g. 1B, 2D, 3A).' });
    }
    if (!quizText) {
      return res.status(400).json({ error: 'Missing original quiz text.' });
    }

    const ai = getAiClient();
    const initialPrompt = `Here are my study notes:\n\n${(notes || '').trim()}\n\nPlease generate a practice quiz.`;

    const response = await generateWithRetry(ai, {
      contents: [
        {
          role: 'user',
          parts: [{ text: initialPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: quizText }],
        },
        {
          role: 'user',
          parts: [{ text: answers.trim() }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
      },
    });

    const feedbackText = response.text || '';
    return res.json({ feedbackText });
  } catch (err: any) {
    console.error('Error assessing answers:', err);
    return res.status(500).json({ error: err.message || 'Failed to evaluate answers.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
