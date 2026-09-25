import { Score, ScoreItem, Student, Subject, Term, SubjectTermSummary, StudentFullReport } from '../types';

export interface GradeResult {
  grade: string;
  gradePoint: number;
  description: string;
  badgeColor: string;
}

/**
 * แปลงคะแนนดิบรวมต่อปี (0-100) เป็นเกรดตามเกณฑ์ สพฐ.
 */
export function calculateGrade(totalScore: number): GradeResult {
  const rounded = Math.round(totalScore * 10) / 10;
  if (rounded >= 80) return { grade: '4', gradePoint: 4.0, description: 'ดีเยี่ยม', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (rounded >= 75) return { grade: '3.5', gradePoint: 3.5, description: 'ดีมาก', badgeColor: 'bg-teal-100 text-teal-800 border-teal-300' };
  if (rounded >= 70) return { grade: '3', gradePoint: 3.0, description: 'ดี', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
  if (rounded >= 65) return { grade: '2.5', gradePoint: 2.5, description: 'ค่อนข้างดี', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (rounded >= 60) return { grade: '2', gradePoint: 2.0, description: 'ปานกลาง', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (rounded >= 55) return { grade: '1.5', gradePoint: 1.5, description: 'พอใช้', badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' };
  if (rounded >= 50) return { grade: '1', gradePoint: 1.0, description: 'ผ่านเกณฑ์', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  return { grade: '0', gradePoint: 0.0, description: 'ไม่ผ่านเกณฑ์', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' };
}

/**
 * คำนวณคะแนนสะสมของนักเรียนในเทอมนั้นๆ สำหรับ 1 วิชา
 */
export function getStudentTermScore(
  studentId: string,
  subjectId: string,
  termId: string,
  allScoreItems: ScoreItem[],
  allScores: Score[]
): { score: number; maxScore: number; hasAbsent: boolean; hasMissing: boolean; isExceeded: boolean } {
  const termItems = allScoreItems.filter(i => i.subject_id === subjectId && i.term_id === termId);
  const itemIds = new Set(termItems.map(i => i.id));
  const maxScore = termItems.reduce((acc, curr) => acc + (curr.max_score || 0), 0);

  const studentScores = allScores.filter(s => s.student_id === studentId && itemIds.has(s.score_item_id));

  let total = 0;
  let hasAbsent = false;
  let hasMissing = false;

  for (const s of studentScores) {
    if (s.status === 'absent') hasAbsent = true;
    if (s.status === 'missing') hasMissing = true;
    if (typeof s.score === 'number' && !isNaN(s.score)) {
      total += s.score;
    }
  }

  return {
    score: Math.round(total * 10) / 10,
    maxScore: maxScore > 0 ? maxScore : 50,
    hasAbsent,
    hasMissing,
    isExceeded: total > 50,
  };
}

/**
 * สรุปคะแนนวิชาของนักเรียน (เทอม 1, เทอม 2, รวม 100, เกรด)
 */
export function getSubjectSummaryForStudent(
  studentId: string,
  subjectId: string,
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): SubjectTermSummary {
  const term1 = terms.find(t => t.id === 'term-1') || terms[0];
  const term2 = terms.find(t => t.id === 'term-2') || terms[1] || terms[0];

  const t1Res = getStudentTermScore(studentId, subjectId, term1?.id || 'term-1', allScoreItems, allScores);
  const t2Res = getStudentTermScore(studentId, subjectId, term2?.id || 'term-2', allScoreItems, allScores);

  const totalScore = Math.min(100, Math.round((t1Res.score + t2Res.score) * 10) / 10);
  const gradeRes = calculateGrade(totalScore);

  let statusFlag: 'ร' | 'มส' | 'ปกติ' = 'ปกติ';
  if (t1Res.hasAbsent || t2Res.hasAbsent) {
    statusFlag = 'ร';
  } else if (t1Res.hasMissing || t2Res.hasMissing) {
    statusFlag = 'มส';
  }

  return {
    term1_score: t1Res.score,
    term2_score: t2Res.score,
    total_score: totalScore,
    grade: statusFlag !== 'ปกติ' ? statusFlag : gradeRes.grade,
    grade_point: gradeRes.gradePoint,
    status_flag: statusFlag,
  };
}

/**
 * สรุปผลการเรียนรวมทุกวิชาของนักเรียน 1 คน
 */
export function getStudentFullReport(
  student: Student,
  subjects: Subject[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): StudentFullReport {
  let totalGradePoints = 0;
  let totalCredits = 0;

  const subjectReports = subjects.map(sub => {
    const summary = getSubjectSummaryForStudent(student.id, sub.id, allScoreItems, allScores, terms);
    const credit = sub.credit || 1.0;
    
    // เกรด 0 หรือ ร หรือ มส มีเกรดพอยต์ตามจริง
    if (summary.status_flag === 'ปกติ') {
      totalGradePoints += summary.grade_point * credit;
      totalCredits += credit;
    } else {
      totalCredits += credit; // ยังนับหน่วยกิต
    }

    return {
      subject: sub,
      term1_score: summary.term1_score,
      term2_score: summary.term2_score,
      total_score: summary.total_score,
      grade: summary.grade,
      grade_point: summary.grade_point,
      status: summary.status_flag || 'ปกติ',
    };
  });

  const gpa = totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;

  return {
    student,
    subjects: subjectReports,
    total_credits: totalCredits,
    gpa,
  };
}

export interface ClassroomRankingItem extends StudentFullReport {
  rank: number;
  totalRawScore: number;
  maxPossibleRawScore: number;
  honorTitle?: string;
  medal?: 'gold' | 'silver' | 'bronze' | null;
}

/**
 * คำนวณอันดับที่ (Ranking) และรายงานผลการเรียนของนักเรียนทุกคนในห้อง
 */
export function getClassroomRankings(
  students: Student[],
  subjects: Subject[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): ClassroomRankingItem[] {
  const reports = students.map((stu) => {
    const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);
    const totalRawScore = report.subjects.reduce((sum, s) => sum + s.total_score, 0);
    const maxPossibleRawScore = subjects.length * 100;
    return {
      ...report,
      rank: 1,
      totalRawScore: Math.round(totalRawScore * 10) / 10,
      maxPossibleRawScore,
    };
  });

  // Sort by GPA desc, then by totalRawScore desc, then by student_no asc
  reports.sort((a, b) => {
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    if (b.totalRawScore !== a.totalRawScore) return b.totalRawScore - a.totalRawScore;
    return a.student.student_no - b.student.student_no;
  });

  // Assign dense / standard ranks
  let currentRank = 1;
  const rankedReports: ClassroomRankingItem[] = reports.map((item, idx) => {
    if (idx > 0) {
      const prev = reports[idx - 1];
      if (item.gpa === prev.gpa && item.totalRawScore === prev.totalRawScore) {
        // Same rank as previous
      } else {
        currentRank = idx + 1;
      }
    } else {
      currentRank = 1;
    }

    let medal: 'gold' | 'silver' | 'bronze' | null = null;
    if (currentRank === 1) medal = 'gold';
    else if (currentRank === 2) medal = 'silver';
    else if (currentRank === 3) medal = 'bronze';

    let honorTitle: string | undefined = undefined;
    if (item.gpa >= 3.8) honorTitle = 'เกียรตินิยมอันดับ 1 (ดีเยี่ยมยอด)';
    else if (item.gpa >= 3.5) honorTitle = 'เกียรตินิยมอันดับ 2 (ดีเด่น)';
    else if (item.gpa >= 3.0) honorTitle = 'ผลการเรียนดี (Good)';

    return {
      ...item,
      rank: currentRank,
      medal,
      honorTitle,
    };
  });

  return rankedReports;
}

/**
 * คำนวณสถิติการกระจายเกรด (Grade Distribution Statistics)
 */
export function calculateSubjectGradeStats(
  students: Student[],
  subject: Subject,
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
) {
  const countByGrade: Record<string, number> = {
    '4': 0,
    '3.5': 0,
    '3': 0,
    '2.5': 0,
    '2': 0,
    '1.5': 0,
    '1': 0,
    '0': 0,
    'ร': 0,
    'มส': 0,
  };

  let totalScoreSum = 0;
  const totalStudents = students.length;

  students.forEach((stu) => {
    const summary = getSubjectSummaryForStudent(stu.id, subject.id, allScoreItems, allScores, terms);
    totalScoreSum += summary.total_score;
    if (summary.status_flag === 'ร') {
      countByGrade['ร'] = (countByGrade['ร'] || 0) + 1;
    } else if (summary.status_flag === 'มส') {
      countByGrade['มส'] = (countByGrade['มส'] || 0) + 1;
    } else if (countByGrade[summary.grade] !== undefined) {
      countByGrade[summary.grade]++;
    } else {
      countByGrade['0']++;
    }
  });

  const avgScore = totalStudents > 0 ? Math.round((totalScoreSum / totalStudents) * 10) / 10 : 0;
  const passedStudents = totalStudents - (countByGrade['0'] + countByGrade['ร'] + countByGrade['มส']);
  const passPercentage = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;
  const goodGradeStudents = (countByGrade['4'] || 0) + (countByGrade['3.5'] || 0) + (countByGrade['3'] || 0);
  const goodGradePercentage = totalStudents > 0 ? Math.round((goodGradeStudents / totalStudents) * 100) : 0;

  return {
    subject,
    totalStudents,
    avgScore,
    countByGrade,
    passPercentage,
    goodGradePercentage,
  };
}

/**
 * ส่งออกไฟล์ CSV ด้วย UTF-8 BOM เพื่อให้ Excel ภาษาไทยเปิดได้ถูกต้อง 100%
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (cell: any) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' +
    headers.map(processCell).join(',') +
    '\n' +
    rows.map(row => row.map(processCell).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * แยกวิเคราะห์ข้อความ CSV สำหรับนำเข้ารายชื่อนักเรียน
 */
export function parseStudentsCSV(csvText: string, defaultClassroom: string = 'ป.5/1'): Omit<Student, 'id'>[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // ตรวจสอบหัวตารางหรือแถวแรก
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes('เลขที่') ||
    firstLine.includes('ชื่อ') ||
    firstLine.includes('no') ||
    firstLine.includes('name') ||
    firstLine.includes('ประจำตัว')
  ) {
    startIndex = 1;
  }

  const results: Omit<Student, 'id'>[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    // แยกตาม comma หรือ tab
    const separator = lines[i].includes('\t') ? '\t' : ',';
    const parts = lines[i].split(separator).map(p => p.replace(/^"|"$/g, '').trim());

    if (parts.length >= 2) {
      let studentNo = parseInt(parts[0], 10);
      let name = '';
      let studentCode = '';
      let classroom = defaultClassroom;
      let gender: 'ชาย' | 'หญิง' = 'ชาย';

      if (!isNaN(studentNo)) {
        name = parts[1] || '';
        studentCode = parts[2] || `${50100 + studentNo}`;
        classroom = parts[3] || defaultClassroom;
      } else {
        // อาจไม่มีคอลัมน์เลขที่ เช่น ชื่อ, เลขประจำตัว
        studentNo = results.length + 1;
        name = parts[0] || '';
        studentCode = parts[1] || `${50100 + studentNo}`;
        classroom = parts[2] || defaultClassroom;
      }

      if (name.includes('หญิง') || name.includes('ด.ญ.')) {
        gender = 'หญิง';
      }

      if (name.trim()) {
        results.push({
          student_no: studentNo,
          name: name.trim(),
          student_code: studentCode.trim(),
          classroom: classroom.trim() || defaultClassroom,
          gender,
        });
      }
    }
  }

  return results.sort((a, b) => a.student_no - b.student_no);
}
