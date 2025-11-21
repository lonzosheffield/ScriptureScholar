import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { generateBibleQuestions } from '../services/geminiService';
import { Button } from '../components/Button';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Plus, Sparkles, Trash2, Save, X, BookOpen, Check, Filter, Upload, FileText, Tag } from 'lucide-react';

interface AdminViewProps {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onBack: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ questions, setQuestions, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for manual entry
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    difficulty: 'Medium',
    category: 'General'
  });

  // Extract unique categories for filter
  const categories = Array.from(new Set(questions.map(q => q.category || 'General'))).sort();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateBibleQuestions(5, topic || "General Bible Knowledge");
      setQuestions(prev => [...prev, ...generated]);
      setTopic(''); // Clear topic after generation
    } catch (error) {
      alert("Failed to generate questions. Please check your API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.text || !newQuestion.reference || !newQuestion.options?.every(o => o.trim() !== '')) {
      alert("Please fill in all fields.");
      return;
    }

    const q: Question = {
      id: crypto.randomUUID(),
      text: newQuestion.text!,
      options: newQuestion.options as string[],
      correctOptionIndex: newQuestion.correctOptionIndex || 0,
      reference: newQuestion.reference!,
      difficulty: newQuestion.difficulty as 'Easy' | 'Medium' | 'Hard' || 'Medium',
      category: newQuestion.category || 'General'
    };

    setQuestions(prev => [...prev, q]);
    setNewQuestion({
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      difficulty: 'Medium',
      category: 'General'
    });
    setShowAddForm(false);
  };

  const updateNewOption = (index: number, value: string) => {
    const updatedOptions = [...(newQuestion.options || [])];
    updatedOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  // --- Import/Export Logic ---

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        text: "Who led the Israelites out of Egypt?",
        options: ["Moses", "Aaron", "Joshua", "Joseph"],
        correctOptionIndex: 0,
        reference: "Exodus 3:10",
        difficulty: "Easy",
        category: "Old Testament"
      },
      {
        text: "What is the last book of the Bible?",
        options: ["Genesis", "Malachi", "Acts", "Revelation"],
        correctOptionIndex: 3,
        reference: "Revelation 1:1",
        difficulty: "Easy",
        category: "New Testament"
      }
    ];

    const jsonString = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "bible_trivia_template.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedQuestions: Partial<Question>[] = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          importedQuestions = parsed;
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const lines = text.split('\n');
        // Expect header: text, opt1, opt2, opt3, opt4, correctIndex, reference, difficulty, category
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = parseCSVRow(lines[i]);
          if (cols.length >= 8) {
            importedQuestions.push({
              text: cols[0],
              options: [cols[1], cols[2], cols[3], cols[4]],
              correctOptionIndex: parseInt(cols[5]) || 0,
              reference: cols[6],
              difficulty: (cols[7] as any) || 'Medium',
              category: cols[8] || 'General'
            });
          }
        }
      } else {
        alert("Unsupported file type. Please use JSON or CSV.");
        return;
      }

      // Validate and sanitize
      const validQuestions: Question[] = importedQuestions
        .filter(q => {
          const hasText = !!q.text;
          const hasOptions = Array.isArray(q.options) && q.options.length === 4 && q.options.every(o => !!o);
          const hasIndex = q.correctOptionIndex !== undefined && !isNaN(Number(q.correctOptionIndex));
          const hasRef = !!q.reference;
          return hasText && hasOptions && hasIndex && hasRef;
        })
        .map(q => ({
          id: crypto.randomUUID(),
          text: q.text!,
          options: q.options!,
          correctOptionIndex: Math.max(0, Math.min(3, Number(q.correctOptionIndex))),
          reference: q.reference!,
          difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty as string) 
            ? (q.difficulty as 'Easy' | 'Medium' | 'Hard') 
            : 'Medium',
          category: q.category || 'General'
        }));

      if (validQuestions.length === 0) {
        alert("No valid questions found. Please check your file against the template.");
      } else {
        setQuestions(prev => [...prev, ...validQuestions]);
        alert(`Successfully imported ${validQuestions.length} questions.`);
      }

    } catch (error) {
      console.error(error);
      alert("Error parsing file. Please ensure it is valid JSON or CSV.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- Render Helpers ---

  const filteredQuestions = questions.filter(q => {
    const difficultyMatch = filterDifficulty === 'All' || q.difficulty === filterDifficulty;
    const categoryMatch = filterCategory === 'All' || (q.category || 'General') === filterCategory;
    return difficultyMatch && categoryMatch;
  });

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-biblical-600 hover:underline mb-2 flex items-center">
            ← Back to Home
          </button>
          <h2 className="text-3xl font-serif font-bold text-biblical-900">Instructor Dashboard</h2>
          <p className="text-biblical-700">Manage question bank and generate new content.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json,.csv" 
            onChange={handleFileUpload}
          />
          <Button onClick={handleDownloadTemplate} variant="outline" size="sm" title="Download JSON Template">
            <FileText className="w-4 h-4 mr-2" /> Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Manual
          </Button>
        </div>
      </div>

      {/* AI Generator Section */}
      <Card className="mb-8 border-indigo-100">
        <div className="bg-indigo-50/50 p-6 border-b border-indigo-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-indigo-900">AI Question Generator (Gemini 3.0)</h3>
              <p className="text-indigo-700 mb-4 text-sm">Automatically create new trivia based on a specific topic, book, or character.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., The Life of David, Miracles of Jesus, Book of Esther..."
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <Button 
                  onClick={handleGenerate} 
                  isLoading={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Generate 5 Questions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Manual Add Form Modal/Overlay */}
      {showAddForm && (
        <Card className="mb-8 border-l-4 border-l-biblical-500 animate-fadeIn">
          <CardHeader className="flex justify-between items-center">
            <h3 className="font-bold text-biblical-800">New Question</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <input 
                  className="w-full p-2 border rounded focus:ring-biblical-500 focus:border-biblical-500"
                  value={newQuestion.text || ''}
                  onChange={e => setNewQuestion({...newQuestion, text: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newQuestion.options?.map((opt, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Option {idx + 1}</label>
                    <div className="flex items-center gap-2">
                      <input 
                        className="w-full p-2 border rounded focus:ring-biblical-500 focus:border-biblical-500"
                        value={opt}
                        onChange={e => updateNewOption(idx, e.target.value)}
                        required
                      />
                      <input 
                        type="radio"
                        name="correctOption"
                        checked={newQuestion.correctOptionIndex === idx}
                        onChange={() => setNewQuestion({...newQuestion, correctOptionIndex: idx})}
                        className="h-5 w-5 text-biblical-600 focus:ring-biblical-500"
                        title="Mark as correct answer"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scripture Reference</label>
                  <input 
                    className="w-full p-2 border rounded focus:ring-biblical-500 focus:border-biblical-500"
                    value={newQuestion.reference || ''}
                    onChange={e => setNewQuestion({...newQuestion, reference: e.target.value})}
                    placeholder="e.g. John 3:16"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select 
                    className="w-full p-2 border rounded focus:ring-biblical-500 focus:border-biblical-500"
                    value={newQuestion.difficulty}
                    onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value as any})}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    className="w-full p-2 border rounded focus:ring-biblical-500 focus:border-biblical-500"
                    value={newQuestion.category || ''}
                    onChange={e => setNewQuestion({...newQuestion, category: e.target.value})}
                    placeholder="e.g. OT, Gospels"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-2" /> Save Question</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Question List Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-8">
        <h3 className="text-xl font-serif font-bold text-biblical-900">
          Question Bank <span className="text-gray-500 text-base font-sans font-normal">({filteredQuestions.length}{filterDifficulty !== 'All' && ` / ${questions.length}`})</span>
        </h3>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as any)}
              className="pl-9 pr-4 py-2 bg-white border border-biblical-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-biblical-500 focus:border-transparent outline-none appearance-none shadow-sm cursor-pointer"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          
          <div className="relative">
            <Tag className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-biblical-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-biblical-500 focus:border-transparent outline-none appearance-none shadow-sm cursor-pointer max-w-[150px]"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid gap-4">
        {filteredQuestions.map((q) => (
          <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border border-biblical-100 hover:shadow-md transition-shadow flex justify-between items-start group">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium
                  ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : 
                    q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'}`}>
                  {q.difficulty}
                </span>
                 <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                  {q.category || 'General'}
                </span>
                <span className="text-gray-400 text-xs">Ref: {q.reference}</span>
              </div>
              <p className="font-medium text-gray-900">{q.text}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                {q.options.map((opt, idx) => (
                  <span key={idx} className={`flex items-center ${idx === q.correctOptionIndex ? 'text-green-600 font-medium' : ''}`}>
                    {idx === q.correctOptionIndex && <Check className="w-3 h-3 mr-1" />}
                    {opt}
                  </span>
                ))}
              </div>
            </div>
            <button 
              onClick={() => handleDelete(q.id)}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        
        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>
              {questions.length === 0 
                ? "No questions found. Add some manually, import a file, or use AI!" 
                : `No questions match your filter.`}
            </p>
            {questions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => {setFilterDifficulty('All'); setFilterCategory('All');}} className="mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};