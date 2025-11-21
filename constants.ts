import { Question } from './types';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Who was swallowed by a great fish?',
    options: ['Jonah', 'Peter', 'Paul', 'Noah'],
    correctOptionIndex: 0,
    reference: 'Jonah 1:17',
    difficulty: 'Easy',
    category: 'Old Testament'
  },
  {
    id: 'q2',
    text: 'What is the shortest verse in the Bible?',
    options: ['God is love', 'Jesus wept', 'Rejoice always', 'Pray continually'],
    correctOptionIndex: 1,
    reference: 'John 11:35',
    difficulty: 'Medium',
    category: 'New Testament'
  },
  {
    id: 'q3',
    text: 'Who was the first king of Israel?',
    options: ['David', 'Solomon', 'Saul', 'Samuel'],
    correctOptionIndex: 2,
    reference: '1 Samuel 10:1',
    difficulty: 'Medium',
    category: 'Old Testament'
  },
  {
    id: 'q4',
    text: 'Where was Jesus born?',
    options: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Galilee'],
    correctOptionIndex: 2,
    reference: 'Matthew 2:1',
    difficulty: 'Easy',
    category: 'Gospels'
  },
  {
    id: 'q5',
    text: 'How many days did it rain during the flood?',
    options: ['7 days', '40 days', '100 days', '150 days'],
    correctOptionIndex: 1,
    reference: 'Genesis 7:12',
    difficulty: 'Easy',
    category: 'Old Testament'
  }
];

export const GAME_LENGTH = 10;
export const POINTS_CORRECT = 100;
export const POINTS_INCORRECT = 25; // Deduction amount
export const TIMER_SECONDS = 30; // New Feature: 30s per question
export const STREAK_THRESHOLD_1 = 3; // 3 in a row
export const STREAK_THRESHOLD_2 = 5; // 5 in a row
export const MULTIPLIER_1 = 1.5;
export const MULTIPLIER_2 = 2;
export const COST_50_50 = 50;
export const COST_HINT = 25;
export const COST_SWAP = 40; // New Feature: Swap Question cost