import React, { useState, useEffect } from 'react';
import { INITIAL_QUESTIONS } from './constants';
import { Question, AppMode, LeaderboardEntry } from './types';
import { AdminView } from './views/AdminView';
import { UserView } from './views/UserView';
import { StudyView } from './views/StudyView';
import { Button } from './components/Button';
import { Settings, PlayCircle, Book, GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load questions from localStorage
  useEffect(() => {
    const savedQuestions = localStorage.getItem('scripture_scholar_questions');
    if (savedQuestions) {
      try {
        setQuestions(JSON.parse(savedQuestions));
      } catch (e) {
        setQuestions(INITIAL_QUESTIONS);
      }
    } else {
      setQuestions(INITIAL_QUESTIONS);
    }

    const savedLeaderboard = localStorage.getItem('scripture_scholar_leaderboard');
    if (savedLeaderboard) {
      try {
        setLeaderboard(JSON.parse(savedLeaderboard));
      } catch (e) {
        setLeaderboard([]);
      }
    }
  }, []);

  // Save questions whenever they change
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('scripture_scholar_questions', JSON.stringify(questions));
    }
  }, [questions]);

  // Save leaderboard whenever it changes
  useEffect(() => {
    localStorage.setItem('scripture_scholar_leaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  const handleSaveScore = (name: string, score: number) => {
    const newEntry: LeaderboardEntry = {
      id: crypto.randomUUID(),
      name,
      score,
      date: new Date().toISOString(),
    };
    
    setLeaderboard(prev => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score);
      return updated.slice(0, 10); // Keep top 10
    });
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.ADMIN:
        return (
          <AdminView 
            questions={questions} 
            setQuestions={setQuestions} 
            onBack={() => setMode(AppMode.HOME)} 
          />
        );
      case AppMode.USER_STUDY:
        return (
          <StudyView 
            allQuestions={questions} 
            onBack={() => setMode(AppMode.HOME)} 
          />
        );
      case AppMode.USER_START:
      case AppMode.USER_PLAY:
      case AppMode.USER_RESULT:
        return (
          <UserView 
            allQuestions={questions} 
            mode={mode} 
            setMode={setMode}
            leaderboard={leaderboard}
            onSaveScore={handleSaveScore}
          />
        );
      case AppMode.HOME:
      default:
        return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4">
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-biblical-300 rounded-full blur-3xl opacity-20"></div>
              <Book className="w-24 h-24 text-biblical-800 relative z-10" />
            </div>
            
            <h1 className="text-5xl font-serif font-bold text-biblical-900 mb-6">
              Scripture Scholar
            </h1>
            <p className="text-xl text-biblical-700 max-w-lg mb-12 leading-relaxed">
              Deepen your understanding of the Word through interactive trivia. Challenge yourself or manage the knowledge base.
            </p>

            <div className="grid md:grid-cols-3 gap-6 w-full max-w-4xl">
              <button 
                onClick={() => setMode(AppMode.USER_START)}
                className="group relative bg-white p-6 rounded-2xl shadow-lg border border-biblical-100 hover:shadow-xl hover:border-biblical-300 transition-all text-left flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <PlayCircle className="w-16 h-16 text-biblical-600" />
                </div>
                <div className="mb-4 p-3 bg-biblical-50 rounded-full w-fit text-biblical-600 group-hover:bg-biblical-100 transition-colors">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-biblical-900 mb-2">Start Trivia</h3>
                <p className="text-gray-600 text-sm">Compete for the high score with timers, streaks, and lifelines.</p>
              </button>

              <button 
                onClick={() => setMode(AppMode.USER_STUDY)}
                className="group relative bg-white p-6 rounded-2xl shadow-lg border border-biblical-100 hover:shadow-xl hover:border-biblical-300 transition-all text-left flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <GraduationCap className="w-16 h-16 text-emerald-600" />
                </div>
                 <div className="mb-4 p-3 bg-emerald-50 rounded-full w-fit text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Study Mode</h3>
                <p className="text-gray-600 text-sm">Review questions as flashcards at your own pace without scoring.</p>
              </button>

              <button 
                onClick={() => setMode(AppMode.ADMIN)}
                className="group relative bg-white p-6 rounded-2xl shadow-lg border border-biblical-100 hover:shadow-xl hover:border-biblical-300 transition-all text-left flex flex-col h-full"
              >
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Settings className="w-16 h-16 text-slate-600" />
                </div>
                <div className="mb-4 p-3 bg-slate-50 rounded-full w-fit text-slate-600 group-hover:bg-slate-100 transition-colors">
                  <Settings className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Instructor</h3>
                <p className="text-gray-600 text-sm">Manage the question bank, import data, or generate new content with AI.</p>
              </button>
            </div>

            {/* Mini Leaderboard Preview on Home */}
            {leaderboard.length > 0 && (
              <div className="mt-12 w-full max-w-md">
                <div className="bg-white/50 rounded-xl p-6 border border-biblical-100">
                  <h3 className="text-lg font-bold text-biblical-900 mb-4 flex items-center justify-center gap-2">
                    <span className="text-yellow-600">🏆</span> Top Scholars
                  </h3>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map((entry, idx) => (
                      <div key={entry.id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-500' : 'text-amber-700'}`}>#{idx + 1}</span>
                          <span className="text-gray-800">{entry.name}</span>
                        </div>
                        <span className="font-mono font-bold text-biblical-700">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-biblical-50 text-gray-900 font-sans selection:bg-biblical-200">
      <nav className="bg-white border-b border-biblical-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setMode(AppMode.HOME)}
          >
            <Book className="w-6 h-6 text-biblical-700" />
            <span className="font-serif font-bold text-xl text-biblical-900">Scripture Scholar</span>
          </div>
          <div className="text-sm text-gray-500 hidden md:block">
            {mode === AppMode.ADMIN ? 'Instructor Mode' : mode === AppMode.USER_STUDY ? 'Study Mode' : 'Trivia Mode'}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      
      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Scripture Scholar. Built with Gemini 3.0</p>
      </footer>
    </div>
  );
};

export default App;