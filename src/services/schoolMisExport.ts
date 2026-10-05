/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * บริการจัดเตรียมและส่งออกข้อมูลเชื่อมต่อระบบ SchoolMIS
 * (ระบบสารสนเทศเพื่อการบริหารจัดการศึกษาของ สพฐ. / สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน)
 */

import * as XLSX from 'xlsx';
import { Student, Subject, ScoreItem, Score, Term, Classroom, SchoolSettings } from '../types';
import { getSubjectSummaryForStudent, calculateGrade } from '../utils/gradeCalculator';

/**
 * โครงสร้างแถวข้อมูลผลการเรียนตามแบบฟอร์ม SchoolMIS สพฐ.
 */
export interface SchoolMisStudentRow {
  student_no: number; // เลขที่
  student_code: string; // เลขประจำตัวนักเรียน
  citizen_id: string; // เลขประจำตัวประชาชน 13 หลัก
  prefix: string; // คำนำหน้าชื่อ (ด.ช. / ด.ญ. / นาย / น.ส.)
  firstname: string; // ชื่อ
  lastname: string; // นามสกุล
  fullname: string; // ชื่อ - นามสกุลเต็ม
  gender: 'ชาย' | 'หญิง';
  classroom: string;
  regular_score: number; // คะแนนเก็บระหว่างเรียน
  midterm_score: number; // คะแนนสอบกลางภาค
  final_score: number; // คะแนนสอบปลายภาค
  total_score: number; // คะแนนรวม (100)
  grade: string; // ระดับผลการเรียน (4, 3.5, 3, 2.5, 2, 1.5, 1, 0, ร, มส)
  grade_point: number; // ค่าระดับคะแนน (0.0 - 4.0)
  status: string; // ปกติ / ร / มส
  desirable_characteristics: number; // คุณลักษณะอันพึงประสงค์ (3=ดีเยี่ยม, 2=ดี, 1=ผ่าน, 0=ไม่ผ่าน)
  reading_writing: number; // การอ่าน คิดวิเคราะห์ และเขียน (3=ดีเยี่ยม, 2=ดี, 1=ผ่าน, 0=ไม่ผ่าน)
  activity_evaluation: 'ผ่าน' | 'ไม่ผ่าน'; // กิจกรรมพัฒนาผู้เรียน
  note?: string;
}

/**
 * แยกคำนำหน้า ชื่อ และนามสกุล ภาษาไทย
 */
export function splitThaiName(fullName: string): {
  prefix: string;
  firstname: string;
  lastname: string;
  gender: 'ชาย' | 'หญิง';
} {
  const clean = fullName.trim();
  const prefixes = [
    { text: 'เด็กชาย', short: 'ด.ช.', gender: 'ชาย' as const },
    { text: 'ด.ช.', short: 'ด.ช.', gender: 'ชาย' as const },
    { text: 'เด็กหญิง', short: 'ด.ญ.', gender: 'หญิง' as const },
    { text: 'ด.ญ.', short: 'ด.ญ.', gender: 'หญิง' as const },
    { text: 'นาย', short: 'นาย', gender: 'ชาย' as const },
    { text: 'นางสาว', short: 'น.ส.', gender: 'หญิง' as const },
    { text: 'น.ส.', short: 'น.ส.', gender: 'หญิง' as const },
    { text: 'นาง', short: 'นาง', gender: 'หญิง' as const },
  ];

  let detectedPrefix = '';
  let restName = clean;
  let gender: 'ชาย' | 'หญิง' = 'ชาย';

  for (const p of prefixes) {
    if (clean.startsWith(p.text)) {
      detectedPrefix = p.text;
      restName = clean.substring(p.text.length).trim();
      gender = p.gender;
      break;
    }
  }

  // แยกชื่อและนามสกุลโดยช่องว่าง
  const parts = restName.split(/\s+/).filter(Boolean);
  const firstname = parts[0] || '';
  const lastname = parts.slice(1).join(' ') || '';

  return {
    prefix: detectedPrefix,
    firstname,
    lastname,
    gender,
  };
}

/**
 * ดึงเลข 13 หลักที่ถูกต้อง (ทำความสะอาดขีดหรือช่องว่าง)
 */
export function cleanCitizenId(codeOrId?: string): string {
  if (!codeOrId) return '';
  return codeOrId.replace(/[^0-9]/g, '');
}

/**
 * จัดเตรียมแถวข้อมูลของนักเรียนในวิชาสำหรับ SchoolMIS
 */
export function prepareSchoolMisRows(
  students: Student[],
  subject: Subject,
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): SchoolMisStudentRow[] {
  // เรียงตามเลขที่
  const sortedStudents = [...students].sort((a, b) => a.student_no - b.student_no);

  return sortedStudents.map((st) => {
    const summary = getSubjectSummaryForStudent(st.id, subject.id, allScoreItems, allScores, terms);
    const nameInfo = splitThaiName(st.name);

    // คำนวณคะแนนตาม 3 ส่วนหลัก (คะแนนเก็บ, กลางภาค, ปลายภาค)
    // หาคะแนนย่อย
    const subjItems = allScoreItems.filter((i) => i.subject_id === subject.id);
    let regularScore = 0;
    let midtermScore = 0;
    let finalScore = 0;

    subjItems.forEach((item) => {
      const rec = allScores.find((s) => s.student_id === st.id && s.score_item_id === item.id);
      if (rec && rec.status === 'normal' && typeof rec.score === 'number') {
        const itemName = item.name.toLowerCase();
        if (item.category === 'midterm' || itemName.includes('กลางภาค') || itemName.includes('midterm')) {
          midtermScore += rec.score;
        } else if (item.category === 'final' || itemName.includes('ปลายภาค') || itemName.includes('final')) {
          finalScore += rec.score;
        } else {
          regularScore += rec.score;
        }
      }
    });

    const citizenId = cleanCitizenId(st.citizen_id || st.student_code);

    // ประเมินคุณลักษณะอันพึงประสงค์และการอ่านคิดวิเคราะห์ (มาตรฐาน สพฐ. 0-3)
    let charScore = 3; // ดีเยี่ยม
    let readingScore = 3; // ดีเยี่ยม
    if (summary.grade === '0' || summary.status_flag === 'มส') {
      charScore = 1;
      readingScore = 1;
    } else if (summary.grade === '1' || summary.grade === '1.5') {
      charScore = 2;
      readingScore = 2;
    }

    return {
      student_no: st.student_no,
      student_code: st.student_code.length === 5 ? st.student_code : `${50000 + st.student_no}`,
      citizen_id: citizenId,
      prefix: nameInfo.prefix || (nameInfo.gender === 'หญิง' ? 'เด็กหญิง' : 'เด็กชาย'),
      firstname: nameInfo.firstname,
      lastname: nameInfo.lastname,
      fullname: st.name,
      gender: st.gender || nameInfo.gender,
      classroom: st.classroom,
      regular_score: Math.round(regularScore * 10) / 10,
      midterm_score: Math.round(midtermScore * 10) / 10,
      final_score: Math.round(finalScore * 10) / 10,
      total_score: summary.total_score,
      grade: summary.status_flag && summary.status_flag !== 'ปกติ' ? summary.status_flag : summary.grade,
      grade_point: summary.grade_point,
      status: summary.status_flag || 'ปกติ',
      desirable_characteristics: charScore,
      reading_writing: readingScore,
      activity_evaluation: 'ผ่าน',
    };
  });
}

/**
 * แบบฟอร์ม 1: ส่งออกไฟล์ Excel (.xlsx) ตามรูปแบบนำเข้าของระบบ SchoolMIS สพฐ.
 */
export function exportSchoolMisSubjectExcel(options: {
  subject: Subject;
  classroom: Classroom;
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  schoolSettings?: SchoolSettings;
  termType?: 'yearly' | 'term-1' | 'term-2';
}): void {
  const { subject, classroom, students, allScoreItems, allScores, terms, schoolSettings, termType = 'yearly' } = options;
  const rows = prepareSchoolMisRows(students, subject, allScoreItems, allScores, terms);

  const academicYear = classroom.academic_year || schoolSettings?.academic_year || '2569';
  const schoolName = schoolSettings?.school_name || 'โรงเรียนบ้านป่าส่าน';

  // หัวตารางมาตรฐาน SchoolMIS (สพฐ.)
  const headers = [
    'ลำดับที่',
    'เลขประจำตัวนักเรียน',
    'เลขประจำตัวประชาชน',
    'คำนำหน้า',
    'ชื่อ',
    'นามสกุล',
    'เลขที่',
    'ชั้น/ห้อง',
    'รหัสวิชา',
    'ชื่อรายวิชา',
    'หน่วยกิต',
    'คะแนนเก็บระหว่างเรียน',
    'คะแนนสอบกลางภาค',
    'คะแนนสอบปลายภาค',
    'คะแนนรวม (100)',
    'ระดับผลการเรียน',
    'คุณลักษณะอันพึงประสงค์ (0-3)',
    'การอ่าน คิดวิเคราะห์ เขียน (0-3)',
    'สถานะผลการเรียน',
  ];

  const dataRows = rows.map((r, idx) => [
    idx + 1,
    r.student_code,
    r.citizen_id || '',
    r.prefix,
    r.firstname,
    r.lastname,
    r.student_no,
    classroom.name,
    subject.code,
    subject.name,
    subject.credit.toFixed(1),
    r.regular_score,
    r.midterm_score,
    r.final_score,
    r.total_score,
    r.grade,
    r.desirable_characteristics,
    r.reading_writing,
    r.status === 'ปกติ' ? 'ปกติ' : r.status,
  ]);

  // สร้าง Workbook และ Worksheet
  const wb = XLSX.utils.book_new();

  // สร้าง Metadata Header 4 แถวแรกสำหรับเจ้าหน้าที่ สพฐ. ตรวจสอบ
  const metaRows = [
    ['แบบส่งออกข้อมูลผลการเรียนเพื่อเชื่อมต่อระบบ SchoolMIS สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)'],
    [`สถานศึกษา: ${schoolName}`, `สังกัด: ${schoolSettings?.affiliation || 'สพป./สพม.'}`, `ปีการศึกษา: ${academicYear}`],
    [`ห้องเรียน: ${classroom.name} (${classroom.level})`, `ครูประจำชั้น/ผู้สอน: ${classroom.homeroom_teacher || '-'}`, `รายวิชา: ${subject.name} (${subject.code})`],
    [], // แถวว่าง
  ];

  const fullSheetData = [...metaRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // กำหนดความกว้างคอลัมน์ให้อ่านง่าย
  ws['!cols'] = [
    { wch: 8 }, // ลำดับที่
    { wch: 18 }, // เลขประจำตัว
    { wch: 20 }, // เลขประชาชน 13 หลัก
    { wch: 12 }, // คำนำหน้า
    { wch: 16 }, // ชื่อ
    { wch: 18 }, // นามสกุล
    { wch: 8 }, // เลขที่
    { wch: 10 }, // ชั้น/ห้อง
    { wch: 12 }, // รหัสวิชา
    { wch: 22 }, // ชื่อรายวิชา
    { wch: 10 }, // หน่วยกิต
    { wch: 18 }, // คะแนนเก็บ
    { wch: 16 }, // กลางภาค
    { wch: 16 }, // ปลายภาค
    { wch: 16 }, // คะแนนรวม
    { wch: 14 }, // เกรด
    { wch: 22 }, // คุณลักษณะ
    { wch: 24 }, // อ่านคิดวิเคราะห์
    { wch: 14 }, // สถานะ
  ];

  const sheetName = `${subject.code}_${classroom.name}`.slice(0, 31).replace(/[/\\?*:[\]]/g, '-');
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = `SchoolMIS_${subject.code}_ห้อง${classroom.name}_ปี${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * แบบฟอร์ม 2: ส่งออกไฟล์ CSV (UTF-8 with BOM) ที่พร้อมนำเข้าสู่ระบบ SchoolMIS สพฐ. โดยตรง
 */
export function exportSchoolMisSubjectCsv(options: {
  subject: Subject;
  classroom: Classroom;
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
}): void {
  const { subject, classroom, students, allScoreItems, allScores, terms } = options;
  const rows = prepareSchoolMisRows(students, subject, allScoreItems, allScores, terms);

  // คอลัมน์ที่ SchoolMIS ใช้อ้างอิงตอนกด "นำเข้าคะแนน CSV"
  const headers = [
    'เลขที่',
    'เลขประจำตัวนักเรียน',
    'เลขประจำตัวประชาชน',
    'คำนำหน้า',
    'ชื่อ',
    'นามสกุล',
    'คะแนนเก็บ',
    'คะแนนกลางภาค',
    'คะแนนปลายภาค',
    'คะแนนรวม',
    'เกรด',
    'คุณลักษณะ',
    'การอ่านคิดวิเคราะห์',
  ];

  const processCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = rows.map((r) => [
    r.student_no,
    r.student_code,
    r.citizen_id || '',
    r.prefix,
    r.firstname,
    r.lastname,
    r.regular_score,
    r.midterm_score,
    r.final_score,
    r.total_score,
    r.grade,
    r.desirable_characteristics,
    r.reading_writing,
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM เพื่อให้ Excel และระบบภาษาไทยไม่แสดงสระเพี้ยน
    headers.map(processCell).join(',') +
    '\n' +
    csvRows.map((r) => r.map(processCell).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SchoolMIS_นำเข้า_${subject.code}_ห้อง${classroom.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * แบบฟอร์ม 3: ส่งออก Workbook รวมทุกรายวิชาของห้องเรียน (All Subjects Master Workbook)
 */
export function exportSchoolMisAllSubjectsMaster(options: {
  classroom: Classroom;
  subjects: Subject[];
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  schoolSettings?: SchoolSettings;
}): void {
  const { classroom, subjects, students, allScoreItems, allScores, terms, schoolSettings } = options;
  const academicYear = classroom.academic_year || schoolSettings?.academic_year || '2569';
  const schoolName = schoolSettings?.school_name || 'โรงเรียนบ้านป่าส่าน';

  const wb = XLSX.utils.book_new();

  // 1. หน้าสรุป GPA และผลการเรียนรวมทุกวิชา (SchoolMIS Master Summary)
  const sortedStudents = [...students].sort((a, b) => a.student_no - b.student_no);
  const masterHeaders = [
    'ลำดับที่',
    'เลขที่',
    'เลขประจำตัว',
    'เลขประจำตัวประชาชน (13 หลัก)',
    'คำนำหน้า',
    'ชื่อ',
    'นามสกุล',
    ...subjects.flatMap((sub) => [`${sub.code} (${sub.name}) คะแนน`, `${sub.code} เกรด`]),
    'หน่วยกิตรวม',
    'เกรดเฉลี่ยสะสม (GPA)',
    'ผลการตัดสินเลื่อนชั้น',
  ];

  const masterRows = sortedStudents.map((st, idx) => {
    const nameInfo = splitThaiName(st.name);
    let totalCredits = 0;
    let totalGradePoints = 0;
    let hasFail = false;

    const subjectCells: (number | string)[] = [];
    subjects.forEach((sub) => {
      const summary = getSubjectSummaryForStudent(st.id, sub.id, allScoreItems, allScores, terms);
      subjectCells.push(summary.total_score);
      subjectCells.push(summary.status_flag && summary.status_flag !== 'ปกติ' ? summary.status_flag : summary.grade);

      const cr = sub.credit || 1.0;
      totalCredits += cr;
      if (summary.status_flag === 'ปกติ') {
        totalGradePoints += summary.grade_point * cr;
      }
      if (summary.grade === '0' || summary.status_flag === 'ร' || summary.status_flag === 'มส') {
        hasFail = true;
      }
    });

    const gpa = totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
    const citizenId = cleanCitizenId(st.citizen_id || st.student_code);

    return [
      idx + 1,
      st.student_no,
      st.student_code.length === 5 ? st.student_code : `${50000 + st.student_no}`,
      citizenId,
      nameInfo.prefix || (nameInfo.gender === 'หญิง' ? 'เด็กหญิง' : 'เด็กชาย'),
      nameInfo.firstname,
      nameInfo.lastname,
      ...subjectCells,
      totalCredits.toFixed(1),
      gpa.toFixed(2),
      hasFail ? 'รอการแก้ไข' : 'อนุมัติเลื่อนชั้น',
    ];
  });

  const metaRows = [
    ['สรุปผลการเรียนรวมทุกรายวิชา เชื่อมโยงระบบ SchoolMIS สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)'],
    [`สถานศึกษา: ${schoolName}`, `ชั้นเรียน: ${classroom.level} ห้อง ${classroom.name}`, `ปีการศึกษา: ${academicYear}`],
    [`จำนวนนักเรียน: ${students.length} คน`, `จำนวนรายวิชา: ${subjects.length} วิชา`, `วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}`],
    [],
  ];

  const masterWs = XLSX.utils.aoa_to_sheet([...metaRows, masterHeaders, ...masterRows]);
  XLSX.utils.book_append_sheet(wb, masterWs, 'สรุปผลรวมทุกวิชา_GPA');

  // 2. สร้าง Sheet แยกสำหรับแต่ละรายวิชา
  subjects.forEach((sub) => {
    const rows = prepareSchoolMisRows(students, sub, allScoreItems, allScores, terms);
    const subHeaders = [
      'ลำดับที่',
      'เลขที่',
      'เลขประจำตัว',
      'เลขประชาชน 13 หลัก',
      'คำนำหน้า',
      'ชื่อ',
      'นามสกุล',
      'คะแนนเก็บ (เต็มตามสัดส่วน)',
      'คะแนนสอบกลางภาค',
      'คะแนนสอบปลายภาค',
      'รวมทั้งสิ้น (100)',
      'เกรด',
      'คุณลักษณะอันพึงประสงค์ (0-3)',
      'การอ่านคิดวิเคราะห์ (0-3)',
      'สถานะ',
    ];

    const subDataRows = rows.map((r, i) => [
      i + 1,
      r.student_no,
      r.student_code,
      r.citizen_id,
      r.prefix,
      r.firstname,
      r.lastname,
      r.regular_score,
      r.midterm_score,
      r.final_score,
      r.total_score,
      r.grade,
      r.desirable_characteristics,
      r.reading_writing,
      r.status,
    ]);

    const subWs = XLSX.utils.aoa_to_sheet([
      [`วิชา ${sub.name} (${sub.code}) - ${classroom.name} ปีการศึกษา ${academicYear}`],
      [],
      subHeaders,
      ...subDataRows,
    ]);

    const cleanTitle = `${sub.code}_${sub.name}`.slice(0, 30).replace(/[/\\?*:[\]]/g, '-');
    XLSX.utils.book_append_sheet(wb, subWs, cleanTitle);
  });

  const fileName = `SchoolMIS_ทั้งห้อง_${classroom.name}_ปีการศึกษา${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * คัดลอกข้อมูลเฉพาะคอลัมน์ (เช่น คะแนนเก็บ, สอบกลางภาค, สอบปลายภาค หรือ เกรด)
 * เพื่อให้ครูนำไปกด Paste (Ctrl+V) ลงในตารางกรอกคะแนนของ SchoolMIS ได้ทันทีในคลิกเดียว!
 */
export async function copyColumnToClipboard(
  values: (string | number)[]
): Promise<boolean> {
  try {
    const text = values.join('\r\n');
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
