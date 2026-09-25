import { Student, Subject, Term, ScoreItem, Score, ScoreStatus } from '../types';
import { exportToCSV } from './gradeCalculator';

export interface ParsedScoreRow {
  studentId: string;
  studentNo: number;
  studentCode: string;
  studentName: string;
  matched: boolean;
  itemScores: Record<
    string, // score_item_id
    {
      score: number | null;
      status: ScoreStatus;
      rawInput: string;
      isValid: boolean;
      errorMessage?: string;
    }
  >;
  errors: string[];
}

export interface ScoreImportResult {
  rows: ParsedScoreRow[];
  totalStudents: number;
  matchedStudents: number;
  validScoresCount: number;
  invalidScoresCount: number;
  warnings: string[];
}

/**
 * ส่งออกคะแนนของ 1 รายวิชาและ 1 ภาคเรียน เป็นไฟล์ CSV สำหรับเปิดใน Excel
 */
export function exportSubjectScoresToCSV(
  students: Student[],
  subject: Subject,
  term: Term,
  scoreItems: ScoreItem[],
  scoresMap: Record<string, { score: number | null; status: ScoreStatus; note?: string }>,
  classroomName: string = ''
) {
  const currentItems = scoreItems.filter(
    (i) => i.subject_id === subject.id && i.term_id === term.id
  );

  const headers = [
    'เลขที่',
    'เลขประจำตัว',
    'ชื่อ-นามสกุล',
    'ห้อง',
    ...currentItems.map((it) => `${it.name} (เต็ม ${it.max_score})`),
    `คะแนนรวม (${term.name})`,
    'หมายเหตุ/สถานะ',
  ];

  const rows = students.map((stu) => {
    let rowSum = 0;
    let hasAbsent = false;
    let hasMissing = false;

    const itemCells = currentItems.map((it) => {
      const d = scoresMap[`${stu.id}_${it.id}`];
      if (!d) return '';
      if (d.status === 'absent') {
        hasAbsent = true;
        return 'ร';
      }
      if (d.status === 'missing') {
        hasMissing = true;
        return 'มส';
      }
      if (typeof d.score === 'number' && !isNaN(d.score)) {
        rowSum += d.score;
        return d.score;
      }
      return '';
    });

    let statusNote = 'ปกติ';
    if (hasAbsent) statusNote = 'ขาดสอบ (ร)';
    else if (hasMissing) statusNote = 'ค้างส่งงาน (มส)';

    return [
      stu.student_no,
      stu.student_code,
      stu.name,
      stu.classroom || classroomName,
      ...itemCells,
      Math.round(rowSum * 10) / 10,
      statusNote,
    ];
  });

  const filename = `คะแนน_${subject.name}_${term.name}_ห้อง${classroomName || 'ป.5'}`;
  exportToCSV(filename, headers, rows);
}

/**
 * ดาวน์โหลดแบบฟอร์มเปล่า CSV สำหรับกรอกคะแนน (Score Template)
 */
export function downloadScoreTemplateCSV(
  students: Student[],
  subject: Subject,
  term: Term,
  scoreItems: ScoreItem[],
  classroomName: string = ''
) {
  const currentItems = scoreItems.filter(
    (i) => i.subject_id === subject.id && i.term_id === term.id
  );

  const headers = [
    'เลขที่',
    'เลขประจำตัว',
    'ชื่อ-นามสกุล',
    'ห้อง',
    ...currentItems.map((it) => `${it.name} (เต็ม ${it.max_score})`),
  ];

  const rows = students.map((stu) => [
    stu.student_no,
    stu.student_code,
    stu.name,
    stu.classroom || classroomName,
    ...currentItems.map(() => ''),
  ]);

  const filename = `แบบฟอร์มกรอกคะแนน_${subject.name}_${term.name}_ห้อง${classroomName || 'ป.5'}`;
  exportToCSV(filename, headers, rows);
}

/**
 * ส่งออกคะแนนสะสมทุกวิชาของทั้งห้องเรียนเป็น CSV (Full Backup CSV)
 */
export function exportAllScoresMatrixToCSV(
  students: Student[],
  subjects: Subject[],
  terms: Term[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  classroomName: string = ''
) {
  const scoreLookup: Record<string, number | string> = {};
  allScores.forEach((s) => {
    if (s.status === 'absent') scoreLookup[`${s.student_id}_${s.score_item_id}`] = 'ร';
    else if (s.status === 'missing') scoreLookup[`${s.student_id}_${s.score_item_id}`] = 'มส';
    else if (typeof s.score === 'number') scoreLookup[`${s.student_id}_${s.score_item_id}`] = s.score;
  });

  const headers: string[] = ['เลขที่', 'เลขประจำตัว', 'ชื่อ-นามสกุล', 'ห้อง'];

  // Collect all items per subject per term
  const itemColumns: Array<{ item: ScoreItem; headerName: string }> = [];
  subjects.forEach((subj) => {
    terms.forEach((term) => {
      const items = allScoreItems.filter((i) => i.subject_id === subj.id && i.term_id === term.id);
      items.forEach((it) => {
        itemColumns.push({
          item: it,
          headerName: `${subj.name} [${term.name}] - ${it.name} (${it.max_score})`,
        });
        headers.push(`${subj.name} [${term.name}] - ${it.name} (${it.max_score})`);
      });
    });
  });

  const rows = students.map((stu) => {
    const rowValues = [stu.student_no, stu.student_code, stu.name, stu.classroom || classroomName];
    itemColumns.forEach(({ item }) => {
      const val = scoreLookup[`${stu.id}_${item.id}`];
      rowValues.push(val !== undefined ? val : '');
    });
    return rowValues;
  });

  const filename = `สำรองคะแนนรวมทุกวิชา_ห้อง${classroomName || 'ป.5'}`;
  exportToCSV(filename, headers, rows);
}

/**
 * แยกวิเคราะห์ไฟล์ CSV สำหรับนำเข้าคะแนนนักเรียน
 */
export function parseScoreCSVText(
  csvText: string,
  targetScoreItems: ScoreItem[],
  students: Student[],
  specificItemId?: string
): ScoreImportResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const warnings: string[] = [];

  if (lines.length === 0) {
    return {
      rows: [],
      totalStudents: 0,
      matchedStudents: 0,
      validScoresCount: 0,
      invalidScoresCount: 0,
      warnings: ['ไม่พบข้อมูลในไฟล์ CSV'],
    };
  }

  // Find column separator (comma or tab)
  const separator = lines[0].includes('\t') ? '\t' : ',';
  const headerParts = lines[0]
    .split(separator)
    .map((p) => p.replace(/^"|"$/g, '').trim().toLowerCase());

  // Determine column indexes
  let noIdx = -1;
  let codeIdx = -1;
  let nameIdx = -1;

  headerParts.forEach((h, idx) => {
    if (h.includes('เลขที่') || h === 'no' || h === '#' || h === 'ลำดับ') noIdx = idx;
    else if (h.includes('ประจำตัว') || h.includes('code') || h.includes('รหัส')) codeIdx = idx;
    else if (h.includes('ชื่อ') || h.includes('name')) nameIdx = idx;
  });

  // Map remaining columns to target score items
  const itemColumnMap: Array<{ colIdx: number; scoreItem: ScoreItem }> = [];

  if (specificItemId) {
    // If user is importing specifically for ONE score item
    const targetItem = targetScoreItems.find((i) => i.id === specificItemId) || targetScoreItems[0];
    // Find first column with score or last column
    let scoreColIdx = headerParts.findIndex(
      (h, idx) =>
        idx !== noIdx &&
        idx !== codeIdx &&
        idx !== nameIdx &&
        (h.includes('คะแนน') || h.includes('score') || h.includes(targetItem.name.toLowerCase()))
    );
    if (scoreColIdx === -1) {
      scoreColIdx = headerParts.length > 3 ? 3 : headerParts.length - 1;
    }
    itemColumnMap.push({ colIdx: scoreColIdx, scoreItem: targetItem });
  } else {
    // Map all target score items by matching column headers
    targetScoreItems.forEach((it, idx) => {
      const matchedCol = headerParts.findIndex(
        (h) => h.includes(it.name.toLowerCase()) || h.includes(`รายการที่ ${idx + 1}`)
      );
      if (matchedCol !== -1) {
        itemColumnMap.push({ colIdx: matchedCol, scoreItem: it });
      } else {
        // Fallback sequentially if columns exist after student details
        const fallbackCol = 4 + idx;
        if (fallbackCol < headerParts.length) {
          itemColumnMap.push({ colIdx: fallbackCol, scoreItem: it });
        }
      }
    });

    // If no specific match, assign first available score column to first item
    if (itemColumnMap.length === 0 && targetScoreItems.length > 0) {
      const firstScoreCol = headerParts.length > 3 ? 3 : headerParts.length - 1;
      itemColumnMap.push({ colIdx: firstScoreCol, scoreItem: targetScoreItems[0] });
    }
  }

  // Parse student rows
  const parsedRows: ParsedScoreRow[] = [];
  let validScoresCount = 0;
  let invalidScoresCount = 0;
  let matchedStudents = 0;

  // Process data lines (start from line index 1 if line 0 is header)
  const isFirstLineHeader =
    noIdx !== -1 || codeIdx !== -1 || nameIdx !== -1 || isNaN(Number(lines[0].split(separator)[0]));
  const startIndex = isFirstLineHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(separator).map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length === 0 || !parts.some((p) => p.length > 0)) continue;

    const rowErrors: string[] = [];

    // Extract student identifiers
    const studentNo = noIdx !== -1 ? parseInt(parts[noIdx], 10) : parseInt(parts[0], 10);
    const studentCode = codeIdx !== -1 ? parts[codeIdx] : parts[1] || '';
    const studentName = nameIdx !== -1 ? parts[nameIdx] : parts[2] || '';

    // Match student from classroom roster
    const matchedStudent = students.find((s) => {
      if (studentCode && s.student_code === studentCode) return true;
      if (!isNaN(studentNo) && s.student_no === studentNo) return true;
      if (studentName && (s.name.includes(studentName) || studentName.includes(s.name))) return true;
      return false;
    });

    if (matchedStudent) {
      matchedStudents++;
    } else {
      rowErrors.push(`ไม่พบลำดับหรือรหัสนักเรียน "${studentCode || studentNo || studentName}" ในห้องเรียน`);
    }

    const rowItemScores: ParsedScoreRow['itemScores'] = {};

    // Parse each item score in this row
    itemColumnMap.forEach(({ colIdx, scoreItem }) => {
      const rawVal = parts[colIdx] !== undefined ? parts[colIdx].trim() : '';
      let scoreNum: number | null = null;
      let status: ScoreStatus = 'normal';
      let isValid = true;
      let errorMsg: string | undefined = undefined;

      if (rawVal === '' || rawVal === '-') {
        scoreNum = null;
        status = 'normal';
      } else if (rawVal === 'ร' || rawVal.toLowerCase() === 'absent' || rawVal.toLowerCase() === 'ขาด') {
        scoreNum = null;
        status = 'absent';
        validScoresCount++;
      } else if (rawVal === 'มส' || rawVal.toLowerCase() === 'missing' || rawVal.toLowerCase() === 'ค้าง') {
        scoreNum = null;
        status = 'missing';
        validScoresCount++;
      } else {
        const parsedNum = parseFloat(rawVal);
        if (isNaN(parsedNum)) {
          isValid = false;
          errorMsg = `รูปแบบคะแนน "${rawVal}" ไม่ถูกต้อง`;
          invalidScoresCount++;
        } else if (parsedNum < 0) {
          isValid = false;
          errorMsg = `คะแนนติดลบ (${parsedNum})`;
          invalidScoresCount++;
        } else if (parsedNum > scoreItem.max_score) {
          isValid = false;
          errorMsg = `คะแนน (${parsedNum}) เกินคะแนนเต็ม (${scoreItem.max_score})`;
          invalidScoresCount++;
        } else {
          scoreNum = Math.round(parsedNum * 10) / 10;
          status = 'normal';
          validScoresCount++;
        }
      }

      rowItemScores[scoreItem.id] = {
        score: scoreNum,
        status,
        rawInput: rawVal,
        isValid,
        errorMessage: errorMsg,
      };
    });

    parsedRows.push({
      studentId: matchedStudent?.id || `unmatched-${i}`,
      studentNo: matchedStudent?.student_no || studentNo || i + 1,
      studentCode: matchedStudent?.student_code || studentCode || '-',
      studentName: matchedStudent?.name || studentName || `นักเรียนคนที่ ${i + 1}`,
      matched: !!matchedStudent,
      itemScores: rowItemScores,
      errors: rowErrors,
    });
  }

  if (matchedStudents < students.length) {
    warnings.push(`จับคู่นักเรียนได้ ${matchedStudents} จากทั้งหมด ${students.length} คนในห้อง`);
  }

  return {
    rows: parsedRows,
    totalStudents: students.length,
    matchedStudents,
    validScoresCount,
    invalidScoresCount,
    warnings,
  };
}
