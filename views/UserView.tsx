import React, { useState, useEffect, useRef } from 'react';
import { Question, AppMode, LeaderboardEntry } from '../types';
import { GAME_LENGTH, POINTS_CORRECT, POINTS_INCORRECT, TIMER_SECONDS, STREAK_THRESHOLD_1, STREAK_THRESHOLD_2, MULTIPLIER_1, MULTIPLIER_2, COST_50_50, COST_HINT, COST_SWAP } from '../constants';
import { Button } from '../components/Button';
import { Card, CardBody, CardHeader } from '../components/Card';
import { BookOpen, CheckCircle, XCircle, Trophy, ArrowRight, RotateCcw, Home, Award, Save, Timer, Flame, Zap, HelpCircle, Shuffle } from 'lucide-react';

interface UserViewProps {
  allQuestions: Question[];
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  leaderboard: LeaderboardEntry[];
  onSaveScore: (name: string, score: number) => void;
}

export const UserView: React.FC<UserViewProps> = ({ allQuestions, mode, setMode, leaderboard, onSaveScore }) => {
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number; isCorrect: boolean }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  
  // New Feature States
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [streak, setStreak] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]); // For 50/50
  const [hintUsed, setHintUsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Result screen state
  const [playerName, setPlayerName] = useState('');
  const [isScoreSaved, setIsScoreSaved] = useState(false);

  // Fisher-Yates Shuffle Algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Timer Logic
  useEffect(() => {
    if (mode !== AppMode.USER_PLAY || isRevealed) return;

    if (timeLeft <= 0) {
      // Time ran out
      handleAnswer(-1); // -1 indicates time out/incorrect
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, mode, isRevealed]);

  // Initialize game
  const startGame = () => {
    let pool = allQuestions;
    if (selectedCategory !== 'All') {
      pool = allQuestions.filter(q => (q.category || 'General') === selectedCategory);
    }

    if (pool.length === 0) {
      alert("No questions available in this category.");
      return;
    }
    
    // Use proper Fisher-Yates shuffle
    const shuffled = shuffleArray(pool);
    
    setActiveQuestions(shuffled.slice(0, GAME_LENGTH));
    setCurrentIndex(0);
    setAnswers([]);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsRevealed(false);
    setIsScoreSaved(false);
    setPlayerName('');
    setTimeLeft(TIMER_SECONDS);
    setHiddenOptions([]);
    setHintUsed(false);
    setMode(AppMode.USER_PLAY);
  };

  const handleAnswer = (index: number) => {
    if (isRevealed) return;
    
    setSelectedOption(index);
    setIsRevealed(true);

    const currentQ = activeQuestions[currentIndex];
    const isCorrect = index === currentQ.correctOptionIndex;
    let pointsChange = 0;

    if (isCorrect) {
      // Streak Logic
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      let multiplier = 1;
      if (newStreak >= STREAK_THRESHOLD_2) multiplier = MULTIPLIER_2;
      else if (newStreak >= STREAK_THRESHOLD_1) multiplier = MULTIPLIER_1;

      pointsChange = Math.round(POINTS_CORRECT * multiplier);
      setScore(s => s + pointsChange);
    } else {
      setStreak(0);
      pointsChange = -POINTS_INCORRECT;
      setScore(s => s - POINTS_INCORRECT);
    }
  };

  const nextQuestion = () => {
    const currentQ = activeQuestions[currentIndex];
    const isCorrect = selectedOption === currentQ.correctOptionIndex;
    
    const newAnswers = [...answers, { 
      questionId: currentQ.id, 
      selectedIndex: selectedOption !== null ? selectedOption : -1, 
      isCorrect 
    }];
    setAnswers(newAnswers);

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsRevealed(false);
      setTimeLeft(TIMER_SECONDS);
      setHiddenOptions([]);
      setHintUsed(false);
    } else {
      setMode(AppMode.USER_RESULT);
    }
  };

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    onSaveScore(playerName, score);
    setIsScoreSaved(true);
  };

  // Lifelines
  const use5050 = () => {
    if (score < COST_50_50) {
      alert(`Not enough points! Need ${COST_50_50} pts.`);
      return;
    }
    const currentQ = activeQuestions[currentIndex];
    const incorrectIndices = currentQ.options
      .map((_, idx) => idx)
      .filter(idx => idx !== currentQ.correctOptionIndex);
    
    // Shuffle incorrect indices and take 2 to hide
    const shuffled = shuffleArray(incorrectIndices);
    const toHide = shuffled.slice(0, 2);
    
    setHiddenOptions(toHide);
    setScore(s => s - COST_50_50);
  };

  const useHint = () => {
     if (score < COST_HINT) {
      alert(`Not enough points! Need ${COST_HINT} pts.`);
      return;
    }
    setHintUsed(true);
    setScore(s => s - COST_HINT);
  };

  const useSwap = () => {
    if (score < COST_SWAP) {
      alert(`Not enough points! Need ${COST_SWAP} pts.`);
      return;
    }

    // Find unused questions (questions not currently in activeQuestions)
    const activeIds = activeQuestions.map(q => q.id);
    const availablePool = allQuestions.filter(q => {
      // Must not be in current game AND match category filter if active
      const matchesCategory = selectedCategory === 'All' || (q.category || 'General') === selectedCategory;
      return !activeIds.includes(q.id) && matchesCategory;
    });

    if (availablePool.length === 0) {
      alert("No other questions available to swap in!");
      return;
    }

    // Pick random new question
    const newQuestion = availablePool[Math.floor(Math.random() * availablePool.length)];

    // Update State
    const newActiveQuestions = [...activeQuestions];
    newActiveQuestions[currentIndex] = newQuestion;
    
    setActiveQuestions(newActiveQuestions);
    setScore(s => s - COST_SWAP);
    
    // Reset current question state
    setTimeLeft(TIMER_SECONDS);
    setHiddenOptions([]);
    setHintUsed(false);
  };

  // Render START Screen with Category Filter
  if (mode === AppMode.USER_START) {
    const categories = ['All', ...Array.from(new Set(allQuestions.map(q => q.category || 'General'))).sort()];
    
    return (
      <div className="max-w-2xl mx-auto text-center pt-10">
        <div className="bg-white rounded-2xl shadow-xl p-10 border-t-4 border-biblical-600">
          <div className="w-20 h-20 bg-biblical-100 rounded-full flex items-center justify-center mx-auto mb-6 text-biblical-700">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-biblical-900 mb-4">Scripture Scholar</h1>
          <p className="text-lg text-gray-600 mb-6">
            Test your knowledge of the Bible. You will face up to {GAME_LENGTH} questions.
          </p>
          
          <div className="bg-biblical-50 p-4 rounded-lg mb-8 text-sm text-biblical-800 space-y-1">
             <p className="font-bold">Rules:</p>
             <p>• Correct: +{POINTS_CORRECT} pts</p>
             <p>• 3 Streak: {MULTIPLIER_1}x | 5 Streak: {MULTIPLIER_2}x</p>
             <p>• Time Limit: {TIMER_SECONDS}s per question</p>
          </div>

          <div className="mb-8 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biblical-500 outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} ({cat === 'All' ? allQuestions.length : allQuestions.filter(q => (q.category || 'General') === cat).length})</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-center gap-4">
            <Button onClick={() => setMode(AppMode.HOME)} variant="outline">Back</Button>
            <Button onClick={startGame} size="lg">Start Quiz</Button>
          </div>
        </div>
      </div>
    );
  }

  // Render RESULTS Screen
  if (mode === AppMode.USER_RESULT) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Score & Leaderboard Input */}
          <div className="space-y-6">
            <Card className="text-center">
              <CardBody className="py-10">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-1">Quiz Complete</h2>
                <div className="text-5xl font-bold text-biblical-700 mb-2">{score} <span className="text-lg text-gray-400 font-normal">pts</span></div>
                <div className="text-gray-500 mb-8">{correctCount}/{answers.length} Correct</div>

                {!isScoreSaved ? (
                  <form onSubmit={handleScoreSubmit} className="max-w-xs mx-auto space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Join the Leaderboard</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Your Name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biblical-500 focus:border-transparent"
                        required
                        maxLength={15}
                      />
                      <Button type="submit" disabled={!playerName.trim()}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Score Saved!
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-8">
                  <Button onClick={() => setMode(AppMode.HOME)} variant="outline"><Home className="w-4 h-4 mr-2"/> Home</Button>
                  <Button onClick={() => setMode(AppMode.USER_START)}><RotateCcw className="w-4 h-4 mr-2"/> Play Again</Button>
                </div>
              </CardBody>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Award className="w-5 h-5 text-biblical-600" />
                <h3 className="font-bold text-gray-900">Top Scholars</h3>
              </CardHeader>
              <div className="divide-y divide-gray-100">
                {leaderboard.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No scores recorded yet. Be the first!</div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.id} className={`p-4 flex justify-between items-center ${entry.name === playerName && isScoreSaved ? 'bg-yellow-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`
                          w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                            index === 1 ? 'bg-gray-100 text-gray-700' : 
                            index === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}
                        `}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{entry.name}</span>
                      </div>
                      <span className="font-mono font-bold text-biblical-600">{entry.score}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 px-2">Review Answers</h3>
            {activeQuestions.map((q, i) => {
              const ans = answers.find(a => a.questionId === q.id);
              if (!ans) return null;
              return (
                <Card key={q.id} className={`border-l-4 ${ans.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardBody className="flex items-start gap-4 py-4">
                    <div className={`mt-1 ${ans.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {ans.isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900 mb-1 text-sm">{i + 1}. {q.text}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Your answer: <span className={ans.isCorrect ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                          {ans.selectedIndex === -1 ? "Time Expired" : q.options[ans.selectedIndex]}
                        </span>
                      </p>
                      {!ans.isCorrect && (
                        <p className="text-xs text-green-700 bg-green-50 p-2 rounded mb-1">
                          Correct: <span className="font-medium">{q.options[q.correctOptionIndex]}</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 italic">{q.reference}</p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render PLAY Screen
  const currentQuestion = activeQuestions[currentIndex];
  if (!currentQuestion) return <div>Loading...</div>;

  const streakMultiplier = streak >= STREAK_THRESHOLD_2 ? MULTIPLIER_2 : streak >= STREAK_THRESHOLD_1 ? MULTIPLIER_1 : 1;

  return (
    <div className="max-w-2xl mx-auto pt-4">
      {/* Game Header: Progress, Score, Timer */}
      <div className="grid grid-cols-3 gap-4 mb-6">
         {/* Timer */}
         <div className={`flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border ${timeLeft < 10 ? 'border-red-300 text-red-600 animate-pulse' : 'border-gray-200 text-gray-700'}`}>
            <Timer className="w-5 h-5" />
            <span className="font-mono font-bold text-lg">{timeLeft}s</span>
         </div>

         {/* Score */}
         <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-biblical-100 flex flex-col items-center">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Score</span>
            <span className={`text-xl font-bold ${score < 0 ? 'text-red-600' : 'text-biblical-700'}`}>{score}</span>
         </div>

         {/* Streak */}
         <div className={`flex items-center justify-center gap-1 px-4 py-2 rounded-lg shadow-sm border 
            ${streak >= STREAK_THRESHOLD_1 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-400'}`}>
            <Flame className={`w-5 h-5 ${streak >= STREAK_THRESHOLD_1 ? 'fill-orange-500 animate-bounce' : ''}`} />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg">{streak}</span>
              <span className="text-[10px] uppercase font-bold">Streak</span>
            </div>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-biblical-600 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
          ></div>
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          Question {currentIndex + 1} of {activeQuestions.length}
        </div>
      </div>

      <Card className="mb-6 relative overflow-hidden">
        <CardBody className="py-8 px-6 md:px-10 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                  currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-red-100 text-red-700'}`}>
                {currentQuestion.difficulty}
              </span>
              {streakMultiplier > 1 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-orange-100 text-orange-700 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-orange-700" /> {streakMultiplier}x Bonus
                </span>
              )}
            </div>
            {isRevealed && (
              <span className={`text-sm font-bold ${selectedOption === currentQuestion.correctOptionIndex ? 'text-green-600' : 'text-red-500'}`}>
                {selectedOption === currentQuestion.correctOptionIndex ? `+${Math.round(POINTS_CORRECT * streakMultiplier)}` : `-${POINTS_INCORRECT}`}
              </span>
            )}
          </div>
          
          <h2 className="text-2xl font-serif font-medium text-gray-900 leading-relaxed mb-6">
            {currentQuestion.text}
          </h2>

          {/* Hint Display */}
          {hintUsed && (
            <div className="mb-4 p-2 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-center gap-2 animate-fadeIn">
              <BookOpen className="w-4 h-4" />
              Ref Hint: <strong>{currentQuestion.reference}</strong>
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              // Skip hidden options from 50/50
              if (hiddenOptions.includes(idx)) return null;

              let stateClass = "border-gray-200 hover:border-biblical-400 hover:bg-biblical-50";
              
              if (isRevealed) {
                if (idx === currentQuestion.correctOptionIndex) {
                  stateClass = "border-green-500 bg-green-50 text-green-800";
                } else if (idx === selectedOption) {
                  stateClass = "border-red-500 bg-red-50 text-red-800";
                } else {
                  stateClass = "border-gray-200 opacity-50";
                }
              } else if (selectedOption === idx) {
                 stateClass = "border-biblical-600 bg-biblical-100";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isRevealed}
                  className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-200 flex items-center justify-between ${stateClass}`}
                >
                  <span className="font-medium">{option}</span>
                  {isRevealed && idx === currentQuestion.correctOptionIndex && <CheckCircle className="w-5 h-5 text-green-600"/>}
                  {isRevealed && idx === selectedOption && idx !== currentQuestion.correctOptionIndex && <XCircle className="w-5 h-5 text-red-600"/>}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Lifelines & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isRevealed && (
            <>
              <Button 
                onClick={use5050} 
                disabled={hiddenOptions.length > 0 || score < COST_50_50}
                size="sm" 
                variant="secondary"
                className="text-xs"
                title={`Remove 2 wrong answers (-${COST_50_50} pts)`}
              >
                50/50 <span className="opacity-60 ml-1">(-{COST_50_50})</span>
              </Button>
              <Button 
                onClick={useHint} 
                disabled={hintUsed || score < COST_HINT}
                size="sm" 
                variant="secondary"
                className="text-xs"
                title={`Show Reference (-${COST_HINT} pts)`}
              >
                <HelpCircle className="w-3 h-3 mr-1" /> Hint <span className="opacity-60 ml-1">(-{COST_HINT})</span>
              </Button>
              <Button 
                onClick={useSwap} 
                disabled={score < COST_SWAP}
                size="sm" 
                variant="secondary"
                className="text-xs"
                title={`Grace Pass: Swap for new question (-${COST_SWAP} pts)`}
              >
                <Shuffle className="w-3 h-3 mr-1" /> Grace Pass <span className="opacity-60 ml-1">(-{COST_SWAP})</span>
              </Button>
            </>
          )}
        </div>

        <div className={`transition-all duration-300 ease-in-out ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <Button onClick={nextQuestion} size="lg">
            {currentIndex === activeQuestions.length - 1 ? 'Finish Quiz' : 'Next'} <ArrowRight className="w-5 h-5 ml-2"/>
          </Button>
        </div>
      </div>
    </div>
  );
};