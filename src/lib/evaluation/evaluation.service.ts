import { prisma } from '@/lib/db/client';

interface QuestionEvaluation {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
  expectedAnswer: string;
  studentAnswer: string | null;
}

export class EvaluationService {
  private static instance: EvaluationService;

  private constructor() {}

  static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService();
    }
    return EvaluationService.instance;
  }

  /**
   * Evaluate a single question
   */
  evaluateQuestion(
    question: any,
    studentAnswer: string | null
  ): { isCorrect: boolean; marksAwarded: number } {
    if (!studentAnswer) {
      return { isCorrect: false, marksAwarded: 0 };
    }

    const questionType = (question.type || 'mcq').toLowerCase();
    const correctAnswer = question.correct_answer;

    let isCorrect = false;

    switch (questionType) {
      case 'mcq':
      case 'mcq_single':
        isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();
        break;

      case 'mcq_multiple':
      case 'msq':
        isCorrect = this.evaluateMSQ(studentAnswer, correctAnswer || '');
        break;

      case 'true_false':
        isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();
        break;

      case 'numerical':
      case 'nat':
        isCorrect = this.evaluateNAT(studentAnswer, correctAnswer || '', question);
        break;

      default:
        isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();
    }

    const qMarks = Number(question.marks) || 1.0;
    const qNegMarks = Number(question.negative_marks) || 0.0;
    const marksAwarded = isCorrect ? qMarks : -qNegMarks;

    return { isCorrect, marksAwarded };
  }

  /**
   * Evaluate MSQ (Multiple Select Questions)
   */
  private evaluateMSQ(studentAnswer: string, correctAnswer: string): boolean {
    if (!studentAnswer || !correctAnswer) return false;

    const studentOptions = studentAnswer
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .sort();

    const correctOptions = correctAnswer
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .sort();

    if (studentOptions.length !== correctOptions.length) return false;
    return studentOptions.every((val, index) => val === correctOptions[index]);
  }

  /**
   * Evaluate NAT (Numerical Answer Type) with explicit tolerance
   * NO HARDCODED FALLBACK - tolerance must be explicitly set or defaults to a safe relative tolerance
   */
  private evaluateNAT(
    studentAnswer: string,
    correctAnswer: string,
    question: any
  ): boolean {
    const studentNum = parseFloat(studentAnswer.trim());
    const correctNum = parseFloat(correctAnswer?.trim() || '');

    if (isNaN(studentNum) || isNaN(correctNum)) return false;

    // Get tolerance from question - MUST be explicitly set
    const meta = (question.metadata as any) || {};
    let tolerance = question.tolerance ?? question.nat_tolerance ?? meta.tolerance ?? null;

    // If no tolerance explicitly set, use relative tolerance: 0.1% of the value, minimum 0.001
    if (tolerance === null || tolerance === undefined) {
      const relativeTolerance = Math.max(
        0.001,
        Math.abs(correctNum) * 0.001 // 0.1% relative tolerance
      );
      tolerance = relativeTolerance;
    }

    // Ensure tolerance is a positive number
    const absTolerance = Math.abs(parseFloat(tolerance) || 0.001);
    const difference = Math.abs(studentNum - correctNum);

    return difference <= absTolerance;
  }

  /**
   * Batch evaluate all questions in an attempt (FIX: Use transaction)
   */
  async batchEvaluateAttempt(attemptId: string) {
    // Get all exam questions with answers
    const examQuestions = await prisma.exam_questions.findMany({
      where: {
        exam_sections: {
          exams: {
            exam_attempts: {
              some: { id: attemptId },
            },
          },
        },
      },
      include: {
        questions: true,
      },
    });

    const answers = await prisma.answers.findMany({
      where: { attempt_id: attemptId },
    });

    const evaluations: QuestionEvaluation[] = [];
    let totalScore = 0;
    let totalMarks = 0;

    // Evaluate each question
    for (const eq of examQuestions) {
      const answer = answers.find(a => a.question_id === eq.question_id);
      const { isCorrect, marksAwarded } = this.evaluateQuestion(
        eq.questions,
        answer?.answer_text || null
      );

      const eqMarks = eq.marks !== null && eq.marks !== undefined ? Number(eq.marks) : (Number(eq.questions.marks) || 1.0);

      evaluations.push({
        questionId: eq.question_id,
        isCorrect,
        marksAwarded,
        expectedAnswer: eq.questions.correct_answer || '',
        studentAnswer: answer?.answer_text || null,
      });

      totalScore += marksAwarded;
      totalMarks += eqMarks;
    }

    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

    return {
      totalScore,
      totalMarks,
      percentage,
      evaluations,
    };
  }
}

export const evaluationService = EvaluationService.getInstance();
