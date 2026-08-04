'use client';

import { useState } from 'react';
import { Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

interface ExamInstructionsProps {
  examId: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string;
  instructionsHtml: string;
  sections?: Array<{
    id: string;
    name: string;
    questionCount: number;
    marks: number;
    instructions?: string;
    instructionsHtml?: string;
  }>;
  requireAcknowledgement: boolean;
  onStart: () => void;
  isStarting: boolean;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({
  examId,
  title,
  durationMinutes,
  totalMarks,
  instructions,
  instructionsHtml,
  sections = [],
  requireAcknowledgement,
  onStart,
  isStarting,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const startCountdown = () => {
    if (!requireAcknowledgement || acknowledged) {
      onStart();
      return;
    }
    
    // Countdown timer
    let count = 30;
    const interval = setInterval(() => {
      count--;
      setTimeLeft(count);
      if (count <= 0) {
        clearInterval(interval);
        onStart();
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-gray-500 mt-1">Please read the instructions carefully before starting</p>
        </div>

        {/* Exam Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-sm text-gray-500">Duration</div>
            <div className="font-medium">{durationMinutes} minutes</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <div className="text-sm text-gray-500">Total Marks</div>
            <div className="font-medium">{totalMarks}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium text-green-600">Ready</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Instructions</h3>
          <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
            {instructionsHtml ? (
              <div dangerouslySetInnerHTML={{ __html: instructionsHtml }} />
            ) : instructions ? (
              <div className="whitespace-pre-wrap">{instructions}</div>
            ) : (
              <p className="text-gray-400 italic">No instructions provided</p>
            )}
          </div>
        </div>

        {/* Section Instructions */}
        {sections.length > 1 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Sections</h3>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div key={section.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-700">
                      Section {index + 1}: {section.name}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {section.questionCount} Q • {section.marks} marks
                    </span>
                  </div>
                  {section.instructionsHtml && (
                    <div 
                      className="text-sm text-gray-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.instructionsHtml }}
                    />
                  )}
                  {!section.instructionsHtml && section.instructions && (
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {section.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acknowledgement */}
        {requireAcknowledgement && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Please acknowledge before starting
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-700">
                    I have read and understood the instructions
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={startCountdown}
          disabled={(requireAcknowledgement && !acknowledged) || isStarting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Starting...
            </>
          ) : requireAcknowledgement && !acknowledged ? (
            'Please acknowledge to start'
          ) : timeLeft < 30 ? (
            `Starting in ${timeLeft}s...`
          ) : (
            <>
              Start Exam
              <Clock className="h-5 w-5" />
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          By starting this exam, you agree to follow all exam rules and proctoring policies
        </p>
      </div>
    </div>
  );
};
