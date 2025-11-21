export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  reference: string; // e.g., "Genesis 1:1"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string; // e.g., "Old Testament", "Gospels", "Prophecy"
}

export enum AppMode {
  HOME = 'HOME',
  ADMIN = 'ADMIN',
  USER_START = 'USER_START',
  USER_PLAY = 'USER_PLAY',
  USER_RESULT = 'USER_RESULT',
  USER_STUDY = 'USER_STUDY', // New Feature: Flashcards
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  answers: { questionId: string; selectedIndex: number; isCorrect: boolean }[];
  activeQuestions: Question[];
  streak: number; // New Feature: Streak
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
}