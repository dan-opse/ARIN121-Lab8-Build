import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  FileText,
  Loader2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { QuizQuestion, QuizResult } from './types';
import { parseQuizText, parseFeedbackText } from './utils/quizParser';
import { SAMPLE_NOTES } from './sampleNotes';

export default function App() {
  // Study notes state
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);

  // Quiz state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [rawQuizText, setRawQuizText] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Answers state
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [answerValidationError, setAnswerValidationError] = useState<string | null>(null);

  // Submission / Results state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult | null>(null);

  // Refs for smooth scrolling
  const quizSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Generate Quiz handler
  const handleGenerateQuiz = async () => {
    setNotesError(null);
    setGenerationError(null);
    setAnswerValidationError(null);

    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setNotesError('Please paste your study notes first before generating a quiz.');
      notesTextareaRef.current?.focus();
      return;
    }

    setIsGenerating(true);
    setResults(null);
    setAnswers({});

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmedNotes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz. Please try again.');
      }

      const rawText = data.quizText || '';
      setRawQuizText(rawText);

      const parsed = parseQuizText(rawText);
      if (parsed.length === 0) {
        throw new Error(
          'Could not parse questions from the AI output. Please check your notes and try generating again.'
        );
      }

      setQuestions(parsed);

      // Smooth scroll to quiz
      setTimeout(() => {
        quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Something went wrong while generating the quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Select option for a question
  const handleSelectOption = (questionNumber: number, optionLabel: 'A' | 'B' | 'C' | 'D') => {
    // If results already showing, don't change selection unless user retakes
    if (results) return;

    setAnswers(prev => ({
      ...prev,
      [questionNumber]: optionLabel,
    }));

    if (answerValidationError) {
      setAnswerValidationError(null);
    }
  };

  // 3. Submit Answers handler
  const handleSubmitAnswers = async () => {
    setAnswerValidationError(null);
    setSubmissionError(null);

    // Verify all 3 questions have been answered
    const missing: number[] = [];
    for (const q of questions) {
      if (!answers[q.number]) {
        missing.push(q.number);
      }
    }

    if (missing.length > 0) {
      if (missing.length === 1) {
        setAnswerValidationError(`Please answer Question ${missing[0]} before submitting.`);
      } else {
        setAnswerValidationError(`Please answer questions ${missing.join(', ')} before submitting.`);
      }
      return;
    }

    // Format selections as "1B, 2D, 3A"
    const formattedAnswers = questions
      .map(q => `${q.number}${answers[q.number]}`)
      .join(', ');

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim(),
          quizText: rawQuizText,
          answers: formattedAnswers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate answers. Please try again.');
      }

      const feedback = parseFeedbackText(data.feedbackText || '', answers);
      setResults(feedback);

      // Smooth scroll to results
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: any) {
      console.error(err);
      setSubmissionError(err.message || 'Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retake current quiz
  const handleRetakeQuiz = () => {
    setAnswers({});
    setResults(null);
    setAnswerValidationError(null);
    setSubmissionError(null);
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Reset all to create new quiz
  const handleResetAll = () => {
    setQuestions([]);
    setRawQuizText('');
    setAnswers({});
    setResults(null);
    setNotesError(null);
    setGenerationError(null);
    setAnswerValidationError(null);
    setSubmissionError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load a sample note
  const handleLoadSample = (sampleText: string) => {
    setNotes(sampleText);
    setNotesError(null);
    setQuestions([]);
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased py-8 px-4 sm:px-6 lg:px-8">
      {/* Single centred column layout */}
      <main className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl mb-1 shadow-xs">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Interactive Quiz Generator
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto">
            Test your understanding with a quick 3-question practice quiz generated directly from your lecture notes.
          </p>
        </header>

        {/* Study Notes Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label
              htmlFor="study-notes"
              className="text-lg font-semibold text-slate-900 flex items-center gap-2"
            >
              <FileText className="w-5 h-5 text-indigo-600" />
              Paste your study notes
            </label>

            {/* Quick sample loader helper */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Try sample:</span>
              {SAMPLE_NOTES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample.content)}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors border border-slate-200/60"
                  title={`Load ${sample.title}`}
                >
                  {sample.category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              id="study-notes"
              ref={notesTextareaRef}
              rows={8}
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                if (notesError && e.target.value.trim().length > 0) {
                  setNotesError(null);
                }
              }}
              placeholder="Paste lecture material, textbook notes, or key concepts here..."
              className={`w-full p-4 rounded-xl text-base leading-relaxed border transition-all resize-y outline-none focus:ring-2 placeholder:text-slate-400 ${
                notesError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
              }`}
            />

            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>{notes.trim().split(/\s+/).filter(Boolean).length} words</span>
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="text-slate-400 hover:text-slate-600 underline"
                >
                  Clear notes
                </button>
              )}
            </div>
          </div>

          {/* Validation message if text box is empty when Generate is clicked */}
          {notesError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="font-medium">{notesError}</p>
            </div>
          )}

          {/* General generation error */}
          {generationError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p>{generationError}</p>
            </div>
          )}

          {/* Generate Quiz Button */}
          <div>
            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-base rounded-xl transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Loading Indicator while AI is generating quiz */}
        {isGenerating && (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Crafting your 3 practice questions...</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Analyzing your lecture notes to design plausible options and focused questions.
              </p>
            </div>
          </div>
        )}

        {/* Questions Display Area */}
        {questions.length > 0 && !isGenerating && (
          <section ref={quizSectionRef} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Practice Quiz</h2>
                <p className="text-sm text-slate-600">
                  Select one answer for each question. Correct answers are hidden until you submit.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full shrink-0">
                {questions.length} Questions
              </span>
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {questions.map(q => {
                const selected = answers[q.number];
                const isUnanswered = answerValidationError && !selected;

                return (
                  <div
                    key={q.number}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${
                      isUnanswered
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : 'border-slate-200/80'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-sm shrink-0">
                        {q.number}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 leading-snug pt-0.5">
                        {q.question}
                      </h3>
                    </div>

                    {/* Radio Options: A, B, C, D */}
                    <div className="space-y-2.5 pl-0 sm:pl-10">
                      {q.options.map(opt => {
                        const isChosen = selected === opt.label;
                        const radioId = `q${q.number}-opt-${opt.label}`;

                        return (
                          <label
                            key={opt.label}
                            htmlFor={radioId}
                            className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isChosen
                                ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-300'
                                : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200'
                            }`}
                          >
                            <input
                              type="radio"
                              id={radioId}
                              name={`question-${q.number}`}
                              value={opt.label}
                              checked={isChosen}
                              onChange={() => handleSelectOption(q.number, opt.label)}
                              className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex items-baseline gap-2 text-slate-800 text-base leading-relaxed">
                              <span
                                className={`font-bold inline-block min-w-[1.2rem] ${
                                  isChosen ? 'text-indigo-700' : 'text-slate-700'
                                }`}
                              >
                                {opt.label}.
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Answer Validation Warning (if any question is unselected) */}
            {answerValidationError && (
              <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-base animate-shake">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold">{answerValidationError}</p>
              </div>
            )}

            {/* Submission Error Banner */}
            {submissionError && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl text-base">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p>{submissionError}</p>
              </div>
            )}

            {/* Submit Answers Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitAnswers}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-lg rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Assessing Answers with AI...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submit Answers</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* 6. RESULTS AREA (Under Submit button, ONLY appears after submission) */}
        {results && (
          <section
            ref={resultsSectionRef}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn"
          >
            {/* Top Score Banner */}
            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Quiz Complete
              </div>

              <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {results.scoreString}
              </div>

              <p className="text-slate-600 text-base">
                {results.scoreOutOfThree === 3 ? (
                  <span className="text-emerald-700 font-semibold">
                    Outstanding! You answered all 3 questions correctly.
                  </span>
                ) : results.scoreOutOfThree === 2 ? (
                  <span className="text-indigo-700 font-semibold">
                    Good effort! 2 out of 3 correct. Review the explanation below.
                  </span>
                ) : (
                  <span className="text-amber-800 font-semibold">
                    Keep studying! Review the correct options and explanations below.
                  </span>
                )}
              </p>
            </div>

            {/* Detailed per-question feedback breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Answer Breakdown</h3>

              {questions.map(q => {
                const userChoice = answers[q.number];
                const fb = results.feedbackList.find(f => f.questionNumber === q.number);
                const isCorrect = fb?.isCorrect ?? false;

                return (
                  <div
                    key={q.number}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-red-50/40 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-slate-700 text-sm mt-0.5">
                          Q{q.number}.
                        </span>
                        <p className="font-medium text-slate-900 text-base">
                          {q.question}
                        </p>
                      </div>

                      {/* Status indicator badge */}
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 shrink-0">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Incorrect
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-slate-600 mt-2 space-y-1.5 pl-6 sm:pl-7">
                      <div>
                        <span className="font-semibold text-slate-700">Your selection: </span>
                        <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                          Option {userChoice}
                        </span>
                        {q.options.find(o => o.label === userChoice)?.text && (
                          <span className="text-slate-600">
                            {' '}— {q.options.find(o => o.label === userChoice)?.text}
                          </span>
                        )}
                      </div>

                      {/* If incorrect, show correct option and explanation */}
                      {!isCorrect && (
                        <div className="pt-2 border-t border-red-200/60 mt-2">
                          <div className="font-semibold text-slate-900 flex items-center gap-1 text-sm">
                            <span className="text-red-600 font-bold">Correct option:</span>
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                              {fb?.correctOption || 'Refer to explanation'}
                            </span>
                          </div>

                          {fb?.explanation && (
                            <div className="mt-1 text-slate-700 bg-white/70 p-2.5 rounded-lg border border-red-100 text-sm leading-relaxed">
                              <span className="font-semibold text-slate-900">Explanation: </span>
                              {fb.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Assistant Raw Feedback Card */}
            {results.rawFeedbackText && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI Assistant Feedback
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed font-mono bg-white p-3 rounded-lg border border-slate-200/70">
                  {results.rawFeedbackText}
                </div>
              </div>
            )}

            {/* Actions: Retake or New Quiz */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRetakeQuiz}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                Retake Same Quiz
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Create New Quiz
              </button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
