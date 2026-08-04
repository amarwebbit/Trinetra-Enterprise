'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { MathText } from '@/components/ui/MathText';

interface QuestionPreviewProps {
  question: {
    id: string;
    question_text: string;
    type: string;
    options?: any | null;
    correct_answer?: string | string[] | null;
    marks?: number | null | any;
    negative_marks?: number | null | any;
    difficulty?: string | null;
    topic?: string | null;
  };
  showAnswer?: boolean;
  showMetadata?: boolean;
}

export const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  question,
  showAnswer = false,
  showMetadata = true,
}) => {
  const renderOptions = () => {
    if (!question.options) return null;
    
    let options = question.options;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = {};
      }
    }

    if (Array.isArray(options)) {
      return (
        <div className="mt-2 space-y-1">
          {options.map((option: any, index: number) => {
            const isCorrect = showAnswer && 
              (Array.isArray(question.correct_answer) 
                ? question.correct_answer.includes(option) 
                : option === question.correct_answer);
            
            return (
              <div key={index} className={`flex items-start gap-2 p-2 rounded ${
                isCorrect ? 'bg-green-50 border border-green-200' : ''
              }`}>
                <span className="font-medium text-gray-700">
                  {String.fromCharCode(65 + index)}.
                </span>
                <div className="flex-1 overflow-x-auto">
                  <MathText text={option} />
                </div>
                {isCorrect && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      );
    } else if (typeof options === 'object') {
      // Object based options { "A": "Value", "B": "Value" }
      return (
        <div className="mt-2 space-y-1">
          {Object.entries(options).map(([key, value], index) => {
            const isCorrect = showAnswer && 
              (Array.isArray(question.correct_answer) 
                ? question.correct_answer.includes(key) 
                : key === question.correct_answer);
            
            return (
              <div key={key} className={`flex items-start gap-2 p-2 rounded ${
                isCorrect ? 'bg-green-50 border border-green-200' : ''
              }`}>
                <span className="font-medium text-gray-700">
                  {key}.
                </span>
                <div className="flex-1 overflow-x-auto">
                  <MathText text={value as string} />
                </div>
                {isCorrect && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              {question.type?.replace('_', ' ').toUpperCase()}
            </span>
            {(question.topic || (question as any).topics?.name) && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                Topic: {question.topic || (question as any).topics?.name}
              </span>
            )}
            {question.difficulty && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {question.difficulty}
              </span>
            )}
          </div>
          
          {/* Question Text with KaTeX */}
          <div>
            <MathText text={question.question_text} className="text-gray-900 leading-relaxed overflow-x-auto block" />
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <span className="text-sm font-medium text-gray-500">
            {question.marks || 1} marks
          </span>
          {question.negative_marks && question.negative_marks > 0 && (
            <span className="text-xs text-red-500 block">
              -{question.negative_marks} negative
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      {renderOptions()}

      {/* Metadata */}
      {showMetadata && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex gap-4">
          <span>ID: {question.id?.slice(0, 8)}</span>
          {question.correct_answer && showAnswer && (
            <span className="text-green-600 font-medium">
              Correct: {Array.isArray(question.correct_answer) 
                ? question.correct_answer.join(', ') 
                : question.correct_answer}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
