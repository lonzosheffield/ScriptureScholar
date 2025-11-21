import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { ArrowLeft, ArrowRight, Eye, EyeOff, BookOpen, Sparkles, RotateCcw } from 'lucide-react';
import { getVerseContext } from '../services/geminiService';

interface StudyViewProps {
  allQuestions: Question[];
  onBack: () => void;
}

export const StudyView: React.FC<StudyViewProps> = ({ allQuestions, onBack }) => {
  // Initialize index from localStorage with bounds checking
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem('scripture_scholar_study_index');
    const index = saved ? parseInt(saved, 10) : 0;
    return (index >= 0 && index < allQuestions.length) ? index : 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [contextText, setContextText] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // Fisher-Yates shuffle for study mode (stable on re-renders due to useState initializer)
  const [shuffledQuestions] = useState(() => {
    const newArray = [...allQuestions];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  });
  
  const currentQ = shuffledQuestions[currentIndex];

  // Save progress whenever index changes
  useEffect(() => {
    localStorage.setItem('scripture_scholar_study_index', currentIndex.toString());
  }, [currentIndex]);
  
  const handleNext = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetCardState();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetCardState();
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Start study session over?")) {
      setCurrentIndex(0);
      resetCardState();
    }
  };

  const resetCardState = () => {
    setIsFlipped(false);
    setContextText(null);
    setIsLoadingContext(false);
  };

  const toggleFlip = () => setIsFlipped(!isFlipped);

  const handleDeepDive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contextText) return; // Already loaded

    setIsLoadingContext(true);
    const text = await getVerseContext(currentQ.reference, currentQ.text);
    setContextText(text);
    setIsLoadingContext(false);
  };

  if (allQuestions.length === 0) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500 mb-4">No questions available to study.</p>
        <Button onClick={onBack}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-20">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="text-gray-500">
           <ArrowLeft className="w-4 h-4 mr-2" /> Home
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">
            Card {currentIndex + 1} / {shuffledQuestions.length}
          </span>
          <button 
            onClick={handleReset} 
            className="p-1 text-gray-400 hover:text-biblical-600 rounded-full hover:bg-biblical-50 transition-colors"
            title="Start Over"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="perspective-1000 h-[450px] w-full cursor-pointer group" onClick={toggleFlip}>
        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front of Card (Question) */}
          <div className="absolute w-full h-full backface-hidden">
            <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-b-4 border-biblical-600">
              <span className="bg-biblical-100 text-biblical-800 px-3 py-1 rounded-full text-xs font-bold mb-6">
                {currentQ.category || 'General Knowledge'}
              </span>
              <h3 className="text-2xl font-serif font-medium text-gray-900">{currentQ.text}</h3>
              <p className="text-gray-400 text-sm mt-8 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Click to reveal answer
              </p>
            </Card>
          </div>

          {/* Back of Card (Answer) */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
             <Card className="h-full flex flex-col items-center text-center p-8 bg-biblical-50 border-b-4 border-biblical-400 overflow-y-auto">
               <div className="flex-1 flex flex-col justify-center items-center w-full">
                <p className="text-gray-500 text-sm mb-2 uppercase tracking-wider font-bold">Answer</p>
                <h3 className="text-3xl font-serif font-bold text-biblical-900 mb-4">
                  {currentQ.options[currentQ.correctOptionIndex]}
                </h3>
                <div className="flex items-center gap-2 text-biblical-700 bg-white px-4 py-2 rounded-lg shadow-sm mb-6">
                  <BookOpen className="w-4 h-4" />
                  <span className="italic font-medium">{currentQ.reference}</span>
                </div>

                {/* AI Deep Dive Section */}
                <div className="w-full">
                  {!contextText && !isLoadingContext && (
                    <Button 
                      onClick={handleDeepDive} 
                      size="sm" 
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Explain Context (AI)
                    </Button>
                  )}
                  
                  {isLoadingContext && (
                    <div className="flex justify-center p-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  )}

                  {contextText && (
                    <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 text-left border border-indigo-100 animate-fadeIn">
                      <div className="flex items-center gap-2 mb-2 font-bold text-indigo-700">
                        <Sparkles className="w-3 h-3" /> Context
                      </div>
                      {contextText}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mt-6 flex items-center gap-2 pt-4 border-t border-biblical-100 w-full justify-center">
                <EyeOff className="w-4 h-4" /> Click to flip back
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-8 mt-8">
        <Button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
          disabled={currentIndex === 0}
          variant="secondary"
          className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Button 
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          variant="outline"
          className="min-w-[120px]"
        >
          {isFlipped ? 'Hide' : 'Show'}
        </Button>

        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          disabled={currentIndex === shuffledQuestions.length - 1}
           variant="secondary"
          className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};