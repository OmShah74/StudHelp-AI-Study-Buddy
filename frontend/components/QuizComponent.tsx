// frontend/components/QuizComponent.tsx (Complete, Updated File)

'use client';
import { useState } from 'react';
import { generateQuiz, QuizQuestion } from '@/lib/api';
import { LoaderCircle, CheckCircle, XCircle, Award, Target } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizComponent({ documentId }: { documentId: string }) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setQuizFinished(false);
    setQuestions([]);
    const quizToast = toast.loading(`Generating a ${numQuestions}-question quiz...`);
    try {
      const quizQuestions = await generateQuiz(documentId, numQuestions);
      if (quizQuestions.length === 0) throw new Error("No questions generated");
      setQuestions(quizQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      toast.success('Quiz is ready!', { id: quizToast });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate a quiz.", { id: quizToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    if (option === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
      toast.success("Correct!");
    } else {
      toast.error("Incorrect!");
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };
  
  const handleReset = () => {
    setQuestions([]);
    setQuizFinished(false);
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numberValue = value === '' ? 1 : parseInt(value, 10);
    setNumQuestions(Math.max(1, Math.min(10, numberValue)));
  };

  const getButtonClass = (option: string) => {
    if (!isAnswered) return 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-indigo-500';
    const isCorrect = option === questions[currentQuestionIndex].correctAnswer;
    const isSelected = option === selectedAnswer;
    if (isCorrect) return 'bg-green-500/30 border-green-500';
    if (isSelected && !isCorrect) return 'bg-red-500/30 border-red-500';
    return 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed';
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center p-8 text-center"><LoaderCircle className="w-12 h-12 animate-spin text-indigo-400 mb-4" /><p className="text-lg text-slate-400">Brewing up some questions...</p></div>;
  if (quizFinished) return <div className="text-center p-8 bg-slate-800 rounded-xl shadow-2xl max-w-lg mx-auto border border-slate-700"><Award size={60} className="mx-auto text-yellow-400 mb-4" /><h2 className="text-4xl font-bold text-white mb-4">Quiz Complete!</h2><p className="text-2xl text-slate-300 mb-8">You scored <span className="font-bold text-indigo-400 text-3xl">{score} / {questions.length}</span></p><button onClick={handleReset} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Take a New Quiz</button></div>;
  
  if (questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
    return (
      <div className="max-w-3xl mx-auto p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2 text-sm text-slate-400">
                <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
                <p>Score: {score}</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          <h2 className="text-3xl font-bold text-slate-100 mt-6">{currentQuestion.question}</h2>
        </div>
        <div className="space-y-4">
          {currentQuestion.options.map((option, index) => (
            <button key={index} onClick={() => handleAnswerSelect(option)} disabled={isAnswered} className={`w-full text-left p-4 border rounded-lg transition-all duration-200 flex items-center justify-between text-lg ${getButtonClass(option)}`}>
              <span>{option}</span>
              {isAnswered && option === currentQuestion.correctAnswer && <CheckCircle className="text-green-400" />}
              {isAnswered && selectedAnswer === option && option !== currentQuestion.correctAnswer && <XCircle className="text-red-400" />}
            </button>
          ))}
        </div>
        {isAnswered && (
          <button onClick={handleNextQuestion} className="w-full mt-8 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-lg">
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center max-w-md mx-auto p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        <Target size={40} className="mx-auto text-indigo-400 mb-4"/>
      <h2 className="text-3xl font-bold mb-4">Ready to Test Your Knowledge?</h2>
      <div className="flex items-center justify-center space-x-4 my-8">
        <label htmlFor="num-questions" className="font-medium text-lg text-slate-300">Questions:</label>
        <input type="number" id="num-questions" value={numQuestions} onChange={handleNumQuestionsChange} className="w-24 p-3 bg-slate-700 border border-slate-600 rounded-lg text-center text-lg" min="1" max="10" />
      </div>
      <button onClick={handleGenerateQuiz} className="w-full px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 text-lg">
        Generate Quiz
      </button>
    </div>
  );
}