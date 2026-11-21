import { QuizOption, QuizQuestion, QuestionFeedback, QuizResult } from '../types';

/**
 * Parses raw text from Gemini into structured QuizQuestion items.
 */
export function parseQuizText(raw: string): QuizQuestion[] {
  if (!raw || typeof raw !== 'string') return [];

  const questions: QuizQuestion[] = [];
  const lines = raw.split('\n');

  let activeQNum: number | null = null;
  let activeQLines: string[] = [];
  let activeOptions: QuizOption[] = [];
  let activeOptLabel: 'A' | 'B' | 'C' | 'D' | null = null;
  let activeOptLines: string[] = [];

  const flushOption = () => {
    if (activeOptLabel && activeOptLines.length > 0) {
      activeOptions.push({
        label: activeOptLabel,
        text: activeOptLines.join(' ').replace(/\s+/g, ' ').trim(),
      });
      activeOptLabel = null;
      activeOptLines = [];
    }
  };

  const flushQuestion = () => {
    flushOption();
    if (activeQNum !== null && activeOptions.length > 0) {
      questions.push({
        number: activeQNum,
        question: activeQLines.join(' ').replace(/\s+/g, ' ').trim(),
        options: [...activeOptions],
      });
      activeQNum = null;
      activeQLines = [];
      activeOptions = [];
    }
  };

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Check if line indicates reply instructions (end of quiz)
    if (/^(please\s+reply|reply\s+with|end\s+of\s+quiz|submit\s+your)/i.test(line)) {
      flushQuestion();
      break;
    }

    // Check for Question start: 1., 2., 3., 1), Question 1:, **1.**, etc.
    const qMatch = line.match(/^(?:\*\*|\*|#+\s*)?(?:Question\s*)?([1-3])[\.:\)](?:\*\*|\*)?\s*(.*)$/i);
    if (qMatch) {
      flushQuestion();
      activeQNum = parseInt(qMatch[1], 10);
      const rest = qMatch[2].replace(/^(\*\*|\*)/, '').trim();
      if (rest) {
        activeQLines.push(rest);
      }
      continue;
    }

    // Check for Option start: A., A), (A), A:, **A)**, etc.
    const optMatch = line.match(/^(?:\*\*|\*|#+\s*)?[\(]?([A-Da-d])[\)\.:\-\—](?:\*\*|\*)?\s*(.*)$/);
    if (optMatch && activeQNum !== null) {
      flushOption();
      activeOptLabel = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const rest = optMatch[2].trim();
      if (rest) {
        activeOptLines.push(rest);
      }
      continue;
    }

    // Continuation line
    if (activeOptLabel !== null) {
      activeOptLines.push(line);
    } else if (activeQNum !== null) {
      activeQLines.push(line);
    }
  }

  flushQuestion();

  // If questions were parsed successfully and we have 3 questions with 4 options each
  if (questions.length === 3 && questions.every(q => q.options.length >= 2)) {
    return questions.sort((a, b) => a.number - b.number);
  }

  // Fallback regex-based chunk parser in case format was slightly different
  const fallbackQuestions = parseQuizWithRegexFallback(raw);
  if (fallbackQuestions.length > 0) {
    return fallbackQuestions;
  }

  return questions;
}

/**
 * Secondary regex fallback parser for edge cases.
 */
function parseQuizWithRegexFallback(raw: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const qBlocks = raw.split(/(?=(?:^|\n)\s*(?:Question\s*)?[1-3][\.:\)])/i);

  for (const block of qBlocks) {
    const trimmed = block.trim();
    const match = trimmed.match(/^(?:Question\s*)?([1-3])[\.:\)]\s*([\s\S]+)/i);
    if (!match) continue;

    const qNum = parseInt(match[1], 10);
    const content = match[2];

    const lines = content.split('\n');
    let qPrompt = '';
    const options: QuizOption[] = [];

    for (const l of lines) {
      const lineTrim = l.trim();
      const optMatch = lineTrim.match(/^[\(]?([A-D])[\)\.:\-\s]\s*(.*)$/i);
      if (optMatch) {
        options.push({
          label: optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D',
          text: optMatch[2].trim(),
        });
      } else if (options.length === 0) {
        qPrompt = qPrompt ? `${qPrompt} ${lineTrim}` : lineTrim;
      }
    }

    if (options.length > 0) {
      questions.push({
        number: qNum,
        question: qPrompt.trim(),
        options,
      });
    }
  }

  return questions.sort((a, b) => a.number - b.number);
}

/**
 * Parses AI feedback response according to the system instructions:
 * "Score: 2/3"
 * "1. Correct"
 * "2. Incorrect. The correct option is B: [explanation]"
 */
export function parseFeedbackText(
  rawFeedback: string,
  userAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>
): QuizResult {
  const clean = rawFeedback.trim();

  // Extract score e.g. "Score: 2/3" or "Score: 2 out of 3"
  const scoreMatch = clean.match(/Score\s*:\s*([0-3])(?:\s*\/\s*3|\s+out\s+of\s+3)?/i);
  let scoreOutOfThree = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const scoreString = scoreMatch ? `Score: ${scoreOutOfThree}/3` : `Score: ${scoreOutOfThree}/3`;

  const feedbackList: QuestionFeedback[] = [];

  for (let q = 1; q <= 3; q++) {
    const userAnswer = userAnswers[q];
    // Find section for question q
    const qPattern = new RegExp(
      `(?:^|\\n)\\s*(?:Question\\s*)?${q}[\\.:\\)]\\s*([\\s\\S]*?)(?=(?:\\n\\s*(?:Question\\s*)?[1-3][\\.:\\)]|$))`,
      'i'
    );
    const match = clean.match(qPattern);

    if (match) {
      const qFeedbackText = match[1].trim();
      // Check for incorrect vs correct
      const isIncorrect = /incorrect/i.test(qFeedbackText);
      const isCorrect = !isIncorrect && /correct/i.test(qFeedbackText);

      let correctOption: 'A' | 'B' | 'C' | 'D' | string | undefined = undefined;
      let explanation: string | undefined = undefined;

      if (isIncorrect) {
        // Find correct option: e.g. "correct option is B" or "correct answer is (B)"
        const optMatch = qFeedbackText.match(/correct\s*(?:option|answer)(?:\s*is)?\s*[:\-–]?\s*[\(]?([A-D])[\)]?/i);
        if (optMatch) {
          correctOption = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        }

        // Extract explanation sentence(s)
        const parts = qFeedbackText.split(/(?:correct\s*(?:option|answer)[\s\S]*?[\.\:\-\—]\s*)/i);
        if (parts.length > 1 && parts[1].trim()) {
          explanation = parts[1].trim();
        } else {
          // Alternatively strip the initial "Incorrect."
          explanation = qFeedbackText.replace(/^(?:\*\*)?incorrect[\.:\-\—]?(?:\*\*)?\s*/i, '').trim();
        }
      }

      feedbackList.push({
        questionNumber: q,
        userAnswer,
        isCorrect: isCorrect || (!isIncorrect && scoreOutOfThree === 3),
        correctOption,
        explanation: explanation || (isIncorrect ? qFeedbackText : undefined),
        rawLine: qFeedbackText,
      });
    } else {
      // If specific numbered feedback line wasn't parsed, default gracefully
      feedbackList.push({
        questionNumber: q,
        userAnswer,
        isCorrect: false,
        rawLine: '',
      });
    }
  }

  // Recalculate scoreOutOfThree if not extracted directly from header
  const correctCount = feedbackList.filter(f => f.isCorrect).length;
  if (!scoreMatch && correctCount > 0) {
    scoreOutOfThree = correctCount;
  }

  return {
    scoreString: `Score: ${scoreOutOfThree}/3`,
    scoreOutOfThree,
    feedbackList,
    rawFeedbackText: clean,
  };
}
