export interface QuizOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuizQuestion {
  number: number;
  question: string;
  options: QuizOption[];
}

export interface QuestionFeedback {
  questionNumber: number;
  userAnswer?: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  correctOption?: 'A' | 'B' | 'C' | 'D' | string;
  explanation?: string;
  rawLine?: string;
}

export interface QuizResult {
  scoreString: string; // e.g. "Score: 2/3"
  scoreOutOfThree: number; // e.g. 2
  feedbackList: QuestionFeedback[];
  rawFeedbackText: string;
}
