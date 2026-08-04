import { z } from 'zod';
import { ImportError } from '../queue/progress-tracker';

// MCQ Schema
const mcqSchema = z.object({
  type: z.literal('mcq_single'),
  questionText: z.string().min(1),
  options: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length === 4, {
    message: 'MCQ must have exactly 4 options (A, B, C, D)',
  }),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  marks: z.number().positive(),
  negativeMarks: z.number().min(0).default(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().default('General'),
});

// MSQ Schema
const msqSchema = z.object({
  type: z.literal('mcq_multiple'),
  questionText: z.string().min(1),
  options: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length === 4, {
    message: 'MSQ must have exactly 4 options (A, B, C, D)',
  }),
  correctAnswers: z.array(z.enum(['A', 'B', 'C', 'D'])).min(2),
  marks: z.number().positive(),
  negativeMarks: z.number().min(0).default(0),
  partialMarking: z.boolean().default(true),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().default('General'),
});

// NAT Schema
const natSchema = z.object({
  type: z.literal('nat'),
  questionText: z.string().min(1),
  correctAnswer: z.number(),
  tolerance: z.number().default(0.01),
  marks: z.number().positive(),
  negativeMarks: z.number().min(0).default(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().default('General'),
});

export function validateQuestionRows(rows: any[]): {
  valid: any[];
  errors: ImportError[];
} {
  const valid: any[] = [];
  const errors: ImportError[] = [];
  
  rows.forEach((row, index) => {
    try {
      let schema;
      switch (row.type) {
        case 'mcq_single':
          schema = mcqSchema;
          break;
        case 'mcq_multiple':
          schema = msqSchema;
          break;
        case 'nat':
          schema = natSchema;
          break;
        default:
          throw new Error('Invalid question type. Expected: mcq_single, mcq_multiple, or nat');
      }
      
      const parsed = schema.parse(row);
      valid.push(parsed);
    } catch (error: any) {
      const firstError = error.errors?.[0];
      errors.push({
        row: index + 1,
        field: firstError?.path?.[0] || 'unknown',
        message: firstError?.message || error.message,
        value: JSON.stringify(row),
      });
    }
  });
  
  return { valid, errors };
}
