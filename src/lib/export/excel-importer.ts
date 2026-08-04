import ExcelJS from 'exceljs';

export interface ParsedQuestion {
  question_text: string;
  type: string; // 'mcq', 'msq', 'nat'
  options?: any;
  correct_answer: string;
  marks?: number;
  negative_marks?: number;
  difficulty?: string;
  topic?: string;
}

export interface ParseExcelResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
}

/**
 * Generate a sample Excel template for Question Bank import
 */
export async function generateQuestionTemplateExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Question Import Template');

  // Define Columns
  worksheet.columns = [
    { header: 'Type (mcq/msq/nat)', key: 'type', width: 20 },
    { header: 'Question Text', key: 'question_text', width: 45 },
    { header: 'Option A', key: 'option_a', width: 25 },
    { header: 'Option B', key: 'option_b', width: 25 },
    { header: 'Option C', key: 'option_c', width: 25 },
    { header: 'Option D', key: 'option_d', width: 25 },
    { header: 'Correct Answer', key: 'correct_answer', width: 25 },
    { header: 'Marks', key: 'marks', width: 10 },
    { header: 'Negative Marks', key: 'negative_marks', width: 15 },
    { header: 'Difficulty (easy/medium/hard)', key: 'difficulty', width: 25 },
    { header: 'Topic', key: 'topic', width: 20 },
  ];

  // Apply Header Style
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2563EB' },
  };

  // Add Sample Data Rows
  worksheet.addRow({
    type: 'mcq',
    question_text: 'What is the speed of light in a vacuum?',
    option_a: '3 x 10^8 m/s',
    option_b: '1.5 x 10^8 m/s',
    option_c: '300,000 km/h',
    option_d: 'None of the above',
    correct_answer: 'A',
    marks: 2,
    negative_marks: 0.66,
    difficulty: 'easy',
    topic: 'Physics',
  });

  worksheet.addRow({
    type: 'mcq',
    question_text: 'Identify the diagram below: <br/><img src="https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400"/>',
    option_a: 'Mitochondria <br/><img src="https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=200"/>',
    option_b: 'Chloroplast',
    option_c: 'Ribosome',
    option_d: 'Nucleus',
    correct_answer: 'A',
    marks: 2,
    negative_marks: 0.5,
    difficulty: 'medium',
    topic: 'Biology',
  });

  worksheet.addRow({
    type: 'msq',
    question_text: 'Which of the following are prime numbers?',
    option_a: '2',
    option_b: '3',
    option_c: '4',
    option_d: '5',
    correct_answer: 'A,B,D',
    marks: 2,
    negative_marks: 0,
    difficulty: 'medium',
    topic: 'Mathematics',
  });

  worksheet.addRow({
    type: 'nat',
    question_text: 'Calculate the area of a circle with radius 7 cm (take pi = 3.14).',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '153.86',
    marks: 2,
    negative_marks: 0,
    difficulty: 'hard',
    topic: 'Geometry',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Parse an uploaded Excel file buffer into structured Question objects
 */
export async function parseQuestionsFromExcel(buffer: Buffer): Promise<ParseExcelResult> {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: false, questions: [], errors: ['Excel file contains no worksheets.'] };
    }

    // Read header mapping
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim().toLowerCase();
      if (val.includes('type')) colMap['type'] = colNumber;
      else if (val.includes('question')) colMap['question_text'] = colNumber;
      else if (val.includes('option a')) colMap['option_a'] = colNumber;
      else if (val.includes('option b')) colMap['option_b'] = colNumber;
      else if (val.includes('option c')) colMap['option_c'] = colNumber;
      else if (val.includes('option d')) colMap['option_d'] = colNumber;
      else if (val.includes('correct')) colMap['correct_answer'] = colNumber;
      else if (val.includes('negative')) colMap['negative_marks'] = colNumber;
      else if (val.includes('mark')) colMap['marks'] = colNumber;
      else if (val.includes('difficulty')) colMap['difficulty'] = colNumber;
      else if (val.includes('topic')) colMap['topic'] = colNumber;
    });

    if (!colMap['question_text'] || !colMap['correct_answer']) {
      return { 
        success: false, 
        questions: [], 
        errors: ['Missing required columns: "Question Text" and "Correct Answer" must be present.'] 
      };
    }

    // Iterate over data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const getCellVal = (colKey: string): string => {
        const colIdx = colMap[colKey];
        if (!colIdx) return '';
        const val = row.getCell(colIdx).value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && 'text' in val) return String(val.text).trim();
        return String(val).trim();
      };

      const questionText = getCellVal('question_text');
      const correctAnswer = getCellVal('correct_answer');
      const rawType = getCellVal('type').toLowerCase();

      if (!questionText) return; // Skip blank rows

      let type = 'mcq';
      if (rawType.includes('msq') || rawType.includes('multiple')) type = 'msq';
      else if (rawType.includes('nat') || rawType.includes('numerical')) type = 'nat';

      const optA = getCellVal('option_a');
      const optB = getCellVal('option_b');
      const optC = getCellVal('option_c');
      const optD = getCellVal('option_d');

      let options: any = null;
      if (type !== 'nat' && (optA || optB || optC || optD)) {
        options = {
          A: optA,
          B: optB,
          C: optC,
          D: optD,
        };
      }

      const marks = parseFloat(getCellVal('marks')) || 1;
      const negativeMarks = parseFloat(getCellVal('negative_marks')) || 0;
      const difficulty = getCellVal('difficulty').toLowerCase() || 'medium';
      const topic = getCellVal('topic') || undefined;

      questions.push({
        question_text: questionText,
        type: type,
        options: options,
        correct_answer: correctAnswer,
        marks: marks,
        negative_marks: negativeMarks,
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        topic: topic,
      });
    });

    return {
      success: questions.length > 0,
      questions,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      questions: [],
      errors: [`Failed to parse Excel file: ${err.message || String(err)}`],
    };
  }
}
