import ExcelJS from 'exceljs';

interface ExcelOptions {
  tenantName: string;
  examTitle: string;
  examDate: Date | string | null;
  rows: any[];
  totalMarks: number;
}

interface StudentResultExcelOptions {
  tenantName: string;
  examTitle: string;
  examDate: Date | string | null;
  studentName: string;
  rollNumber: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correct: number;
  wrong: number;
  unattempted: number;
  answers: any[];
}

function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return new Date().toLocaleDateString('en-IN');
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
}

export async function generateStudentResultExcel(options: StudentResultExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Result');
  
  // Header information
  worksheet.addRow([options.tenantName]);
  worksheet.addRow(['Student Exam Result Report']);
  worksheet.addRow([]);
  worksheet.addRow(['Exam Details']);
  worksheet.addRow(['Title:', options.examTitle]);
  worksheet.addRow(['Date:', formatDate(options.examDate)]);
  worksheet.addRow([]);
  worksheet.addRow(['Student Details']);
  worksheet.addRow(['Name:', options.studentName]);
  worksheet.addRow(['Roll Number:', options.rollNumber]);
  worksheet.addRow([]);
  worksheet.addRow(['Performance Summary']);
  worksheet.addRow(['Total Score:', `${options.score} / ${options.totalMarks}`]);
  worksheet.addRow(['Percentage:', `${options.percentage}%`]);
  worksheet.addRow(['Result:', options.passed ? 'PASSED' : 'FAILED']);
  worksheet.addRow(['Correct Answers:', options.correct]);
  worksheet.addRow(['Wrong Answers:', options.wrong]);
  worksheet.addRow(['Unattempted:', options.unattempted]);
  worksheet.addRow([]);
  worksheet.addRow(['Question Level Analysis']);
  
  // Question columns
  const headerRow = worksheet.addRow([
    'Q.No',
    'Type',
    'Question ID',
    'Marks Available',
    'Marks Awarded',
    'Is Correct',
    'Time Spent (s)'
  ]);
  
  headerRow.font = { bold: true };
  
  (options.answers || []).forEach((ans, index) => {
    worksheet.addRow([
      index + 1,
      ans.question?.type || 'Unknown',
      ans.question_id,
      ans.question?.marks || 0,
      ans.marks_awarded,
      ans.is_correct === true ? 'Yes' : (ans.is_correct === false ? 'No' : 'Unattempted'),
      ans.time_spent || 0
    ]);
  });
  
  worksheet.columns = [
    { width: 10 }, // Q.No
    { width: 15 }, // Type
    { width: 35 }, // Question ID
    { width: 15 }, // Marks Available
    { width: 15 }, // Marks Awarded
    { width: 12 }, // Is Correct
    { width: 15 }, // Time Spent
  ];
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function generateResultsExcel(options: ExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Results Sheet
  const worksheet = workbook.addWorksheet('Results');
  
  worksheet.addRow([options.tenantName]);
  worksheet.addRow([options.examTitle]);
  worksheet.addRow([`Date: ${formatDate(options.examDate)}`]);
  worksheet.addRow([]);
  
  const headerRow = worksheet.addRow([
    'Name', 'Roll No', 'Email', 'Branch', 'Section',
    'Total Que', 'Correct', 'Wrong', 'Unattempt',
    'Percentage', 'Score', 'Rank'
  ]);
  headerRow.font = { bold: true };
  
  (options.rows || []).forEach(row => {
    worksheet.addRow([
      row.name, row.rollNo, row.email, row.branch, row.section,
      row.totalQue, row.correct, row.wrong, row.unattempt,
      `${Number(row.percentage || 0).toFixed(1)}%`, row.score, row.rank,
    ]);
  });
  
  worksheet.columns = [
    { width: 25 }, { width: 12 }, { width: 30 }, { width: 20 }, { width: 12 },
    { width: 12 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 8 },
  ];
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const sumHeader = summarySheet.addRow(['Metric', 'Value']);
  sumHeader.font = { bold: true };
  
  summarySheet.addRow(['Total Students', options.rows ? options.rows.length : 0]);
  summarySheet.addRow(['Total Marks', options.totalMarks]);
  summarySheet.addRow(['Exam Date', formatDate(options.examDate)]);
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
