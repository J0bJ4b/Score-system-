import { Student, Subject, ScoreItem, Score, Term, Classroom } from '../types';
import { getSubjectSummaryForStudent, getStudentFullReport } from '../utils/gradeCalculator';
import * as XLSX from 'xlsx';
import { storage } from './storage';

export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface GoogleSpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;
}

/**
 * ดึงข้อมูลเบื้องต้นของ Google Spreadsheet
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<GoogleSpreadsheetInfo> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message ||
        `ไม่สามารถเข้าถึง Google Spreadsheet ได้ (รหัสสถานะ: ${res.status})`
    );
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'ไม่มีชื่อ',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    })),
  };
}

export interface AllClassroomsExportDataOptions {
  classrooms?: Classroom[];
  allStudents?: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  schoolName?: string;
  academicYear?: string;
}

export interface PreparedSheet {
  title: string;
  headers: string[];
  rows: any[][];
  frozenColumnCount?: number;
}

export interface AllClassroomsExportData {
  title: string;
  masterSheet: PreparedSheet;
  classroomSheets: PreparedSheet[];
  statsSheet: PreparedSheet;
  gradeDistSheet: PreparedSheet;
  rosterSheet: PreparedSheet;
  curriculumSheet: PreparedSheet;
  allSheets: PreparedSheet[];
  totalStudents: number;
  classroomsCount: number;
  subjectsCount: number;
}

/**
 * รวมและคำนวณโครงสร้างข้อมูลทั้งหมด ทุกชั้นเรียน ทุกห้อง ทุกวิชา ทุกสถิติ
 */
export function prepareAllClassroomsExportData(
  options: AllClassroomsExportDataOptions & { title?: string }
): AllClassroomsExportData {
  const {
    subjects,
    allScoreItems,
    allScores,
    terms,
    schoolName = 'โรงเรียนบ้านป่าส่าน',
    academicYear = '2569',
  } = options;

  const rawClassrooms = (options.classrooms && options.classrooms.length > 0)
    ? options.classrooms
    : storage.getClassrooms();

  const allStudents = (options.allStudents && options.allStudents.length > 0)
    ? options.allStudents
    : storage.getAllStudents();

  // Deduplicate / resolve all classrooms so every student's room is represented
  const classroomMap = new Map<string, Classroom>();
  rawClassrooms.forEach((c) => {
    classroomMap.set(c.id, c);
    classroomMap.set(c.name, c);
  });

  const fullClassrooms = [...rawClassrooms];
  allStudents.forEach((stu) => {
    const key = stu.classroom_id || stu.classroom;
    if (key && !classroomMap.has(key)) {
      const synClassroom: Classroom = {
        id: `auto_${key}`,
        name: stu.classroom,
        level: stu.classroom.split('/')[0] || stu.classroom,
        academic_year: academicYear,
        homeroom_teacher: 'ครูประจำชั้น',
      };
      fullClassrooms.push(synClassroom);
      classroomMap.set(synClassroom.id, synClassroom);
      classroomMap.set(synClassroom.name, synClassroom);
    }
  });

  const title =
    options.title ||
    `สมุดสรุปผลการเรียนทุกชั้นเรียน_ปีการศึกษา${academicYear}_${schoolName}`;

  // 1. Prepare Master Sheet ('ภาพรวมทุกชั้นเรียน')
  const masterHeaders = [
    'ห้องเรียน',
    'ระดับชั้น',
    'เลขที่',
    'เลขประจำตัวประชาชน',
    'ชื่อ - นามสกุล',
    'เพศ',
    ...subjects.flatMap((s) => [
      `${s.name} (T1: 50)`,
      `${s.name} (T2: 50)`,
      `${s.name} (รวม: 100)`,
      `${s.name} (เกรด)`,
    ]),
    'เกรดเฉลี่ย (GPA)',
    'สถานะการประเมิน',
  ];
  const masterRows: any[][] = [];

  // 2. Prepare Per-Classroom Sheets
  const classroomSheets: PreparedSheet[] = [];

  // 3. Prepare Stats Comparison Sheet ('สถิติเปรียบเทียบทุกห้อง')
  const statsHeaders = [
    'ห้องเรียน',
    'ระดับชั้น',
    'ปีการศึกษา',
    'ครูประจำชั้น',
    'จำนวนนักเรียน (คน)',
    'คะแนนเฉลี่ยรวม (/100)',
    'เกรดเฉลี่ย (GPA)',
    'ได้เกรด 4 (คน)',
    'ได้เกรด 4 (%)',
    'ไม่ผ่าน/ร/มส (คน)',
    'อัตราผ่านเกณฑ์ (%)',
  ];
  const statsRows: any[][] = [];

  let schoolScoreSum = 0;
  let schoolScoreCount = 0;
  let schoolGrade4Count = 0;
  let schoolFailingCount = 0;
  const schoolGpas: number[] = [];

  // Track per-subject grade distributions
  const subjectDistMap = new Map<
    string,
    {
      subject: Subject;
      gradeCounts: Record<string, number>;
      totalScoreSum: number;
      scoreCount: number;
      passCount: number;
    }
  >();

  subjects.forEach((s) => {
    subjectDistMap.set(s.id, {
      subject: s,
      gradeCounts: {
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
      },
      totalScoreSum: 0,
      scoreCount: 0,
      passCount: 0,
    });
  });

  fullClassrooms.forEach((c) => {
    const roomStudents = allStudents
      .filter((s) => s.classroom_id === c.id || s.classroom === c.name)
      .sort((a, b) => a.student_no - b.student_no);

    let roomScoreSum = 0;
    let roomScoreCount = 0;
    let roomGrade4Count = 0;
    let roomFailingCount = 0;
    const roomGpas: number[] = [];

    const roomHeaders = [
      'เลขที่',
      'เลขประจำตัวประชาชน',
      'ชื่อ - นามสกุล',
      'เพศ',
      'ห้องเรียน',
      ...subjects.flatMap((s) => [
        `${s.name} (เทอม 1: 50)`,
        `${s.name} (เทอม 2: 50)`,
        `${s.name} (รวม: 100)`,
        `${s.name} (เกรด)`,
      ]),
      'เกรดเฉลี่ย (GPA)',
      'ผลการประเมิน',
    ];

    const roomRows = roomStudents.map((stu) => {
      const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);
      roomGpas.push(report.gpa);
      schoolGpas.push(report.gpa);

      let studentHasFailing = false;
      const subjectCells = report.subjects.flatMap((sub) => {
        roomScoreSum += sub.total_score;
        roomScoreCount += 1;
        schoolScoreSum += sub.total_score;
        schoolScoreCount += 1;

        if (sub.grade === '4') {
          roomGrade4Count += 1;
          schoolGrade4Count += 1;
        }
        if (sub.grade === '0' || sub.status === 'ร' || sub.status === 'มส') {
          studentHasFailing = true;
        }

        // Tally into subject distribution map
        const dist = subjectDistMap.get(sub.subject.id);
        if (dist) {
          dist.totalScoreSum += sub.total_score;
          dist.scoreCount += 1;
          const statusOrGrade = sub.status !== 'ปกติ' ? sub.status : sub.grade;
          if (dist.gradeCounts[statusOrGrade] !== undefined) {
            dist.gradeCounts[statusOrGrade] += 1;
          }
          if (sub.grade !== '0' && sub.status === 'ปกติ') {
            dist.passCount += 1;
          }
        }

        return [
          sub.term1_score,
          sub.term2_score,
          sub.total_score,
          sub.status !== 'ปกติ' ? sub.status : sub.grade,
        ];
      });

      if (studentHasFailing) {
        roomFailingCount += 1;
        schoolFailingCount += 1;
      }

      const passStatus = report.gpa >= 1.0 && !studentHasFailing ? 'ผ่านเกณฑ์' : 'ต้องซ่อมเสริม';

      // Push to master sheet
      masterRows.push([
        c.name,
        c.level,
        stu.student_no,
        stu.student_code,
        stu.name,
        stu.gender || 'ชาย',
        ...subjectCells,
        report.gpa.toFixed(2),
        passStatus,
      ]);

      return [
        stu.student_no,
        stu.student_code,
        stu.name,
        stu.gender || 'ชาย',
        c.name,
        ...subjectCells,
        report.gpa.toFixed(2),
        passStatus,
      ];
    });

    const cleanRoomName = `สรุปผล_ห้อง_${c.name.replace(/[/\\?*:[\]]/g, '-')}`;
    classroomSheets.push({
      title: cleanRoomName.slice(0, 31),
      headers: roomHeaders,
      rows: roomRows,
      frozenColumnCount: 4,
    });

    // Compute stats for comparison sheet
    const avgGpa = roomGpas.length > 0
      ? Math.round((roomGpas.reduce((a, b) => a + b, 0) / roomGpas.length) * 100) / 100
      : 0;
    const avgScore = roomScoreCount > 0
      ? Math.round((roomScoreSum / roomScoreCount) * 10) / 10
      : 0;
    const passRate = roomStudents.length > 0
      ? Math.round(((roomStudents.length - roomFailingCount) / roomStudents.length) * 100)
      : 0;
    const g4Pct = roomScoreCount > 0
      ? Math.round((roomGrade4Count / roomScoreCount) * 100)
      : 0;

    statsRows.push([
      c.name,
      c.level,
      c.academic_year || academicYear,
      c.homeroom_teacher || 'ครูประจำชั้น',
      roomStudents.length,
      avgScore,
      avgGpa.toFixed(2),
      roomGrade4Count,
      `${g4Pct}%`,
      roomFailingCount,
      `${passRate}%`,
    ]);
  });

  // School-wide summary row in stats sheet
  const schoolAvgGpa = schoolGpas.length > 0
    ? Math.round((schoolGpas.reduce((a, b) => a + b, 0) / schoolGpas.length) * 100) / 100
    : 0;
  const schoolAvgScore = schoolScoreCount > 0
    ? Math.round((schoolScoreSum / schoolScoreCount) * 10) / 10
    : 0;
  const schoolPassRate = allStudents.length > 0
    ? Math.round(((allStudents.length - schoolFailingCount) / allStudents.length) * 100)
    : 0;
  const schoolG4Pct = schoolScoreCount > 0
    ? Math.round((schoolGrade4Count / schoolScoreCount) * 100)
    : 0;

  statsRows.push([
    'รวมและเฉลี่ยทั้งโรงเรียน',
    'ทุกระดับชั้น',
    academicYear,
    'คณะครูทุกท่าน',
    allStudents.length,
    schoolAvgScore,
    schoolAvgGpa.toFixed(2),
    schoolGrade4Count,
    `${schoolG4Pct}%`,
    schoolFailingCount,
    `${schoolPassRate}%`,
  ]);

  // 4. Prepare Subject Grade Distribution Sheet ('สรุปการกระจายเกรดรายวิชา')
  const gradeDistHeaders = [
    'ลำดับ',
    'รหัสวิชา',
    'ชื่อรายวิชา',
    'หน่วยกิต',
    'จำนวนนักเรียนทั้งหมด',
    'เกรด 4 (คน)',
    'เกรด 3.5 (คน)',
    'เกรด 3 (คน)',
    'เกรด 2.5 (คน)',
    'เกรด 2 (คน)',
    'เกรด 1.5 (คน)',
    'เกรด 1 (คน)',
    'เกรด 0 (คน)',
    'ติด ร (คน)',
    'ติด มส (คน)',
    'คะแนนเฉลี่ย (/100)',
    'อัตราผ่านเกณฑ์ (%)',
  ];
  const gradeDistRows: any[][] = [];
  subjects.forEach((s, idx) => {
    const dist = subjectDistMap.get(s.id);
    const avgScore = dist && dist.scoreCount > 0
      ? Math.round((dist.totalScoreSum / dist.scoreCount) * 10) / 10
      : 0;
    const passPct = dist && dist.scoreCount > 0
      ? Math.round((dist.passCount / dist.scoreCount) * 100)
      : 0;

    gradeDistRows.push([
      idx + 1,
      s.code,
      s.name,
      s.credit,
      dist?.scoreCount || 0,
      dist?.gradeCounts['4'] || 0,
      dist?.gradeCounts['3.5'] || 0,
      dist?.gradeCounts['3'] || 0,
      dist?.gradeCounts['2.5'] || 0,
      dist?.gradeCounts['2'] || 0,
      dist?.gradeCounts['1.5'] || 0,
      dist?.gradeCounts['1'] || 0,
      dist?.gradeCounts['0'] || 0,
      dist?.gradeCounts['ร'] || 0,
      dist?.gradeCounts['มส'] || 0,
      avgScore,
      `${passPct}%`,
    ]);
  });

  // 5. Prepare Master Roster Sheet ('ทะเบียนนักเรียนทุกห้อง')
  const rosterHeaders = [
    'ลำดับ',
    'ห้องเรียน',
    'ระดับชั้น',
    'เลขที่',
    'เลขประจำตัว 13 หลัก',
    'ชื่อ - นามสกุล',
    'เพศ',
    'ครูประจำชั้น',
  ];
  let seq = 1;
  const rosterRows: any[][] = [];
  fullClassrooms.forEach((c) => {
    const roomStudents = allStudents
      .filter((s) => s.classroom_id === c.id || s.classroom === c.name)
      .sort((a, b) => a.student_no - b.student_no);
    roomStudents.forEach((stu) => {
      rosterRows.push([
        seq++,
        c.name,
        c.level,
        stu.student_no,
        stu.student_code,
        stu.name,
        stu.gender || 'ชาย',
        c.homeroom_teacher || '-',
      ]);
    });
  });

  // 6. Prepare Subjects Sheet ('โครงสร้างรายวิชา')
  const curriculumHeaders = [
    'ลำดับ',
    'รหัสวิชา',
    'ชื่อรายวิชา',
    'น้ำหนัก (หน่วยกิต)',
    'คะแนนเต็มทั้งปี (50+50)',
  ];
  const curriculumRows = subjects.map((sub, idx) => [
    idx + 1,
    sub.code,
    sub.name,
    sub.credit,
    100,
  ]);

  const masterSheet: PreparedSheet = {
    title: 'ภาพรวมทุกชั้นเรียน',
    headers: masterHeaders,
    rows: masterRows,
    frozenColumnCount: 5,
  };

  const statsSheet: PreparedSheet = {
    title: 'สถิติเปรียบเทียบทุกห้อง',
    headers: statsHeaders,
    rows: statsRows,
    frozenColumnCount: 1,
  };

  const gradeDistSheet: PreparedSheet = {
    title: 'สรุปการกระจายเกรดรายวิชา',
    headers: gradeDistHeaders,
    rows: gradeDistRows,
    frozenColumnCount: 3,
  };

  const rosterSheet: PreparedSheet = {
    title: 'ทะเบียนนักเรียนทุกห้อง',
    headers: rosterHeaders,
    rows: rosterRows,
    frozenColumnCount: 4,
  };

  const curriculumSheet: PreparedSheet = {
    title: 'โครงสร้างรายวิชา',
    headers: curriculumHeaders,
    rows: curriculumRows,
  };

  const allSheets: PreparedSheet[] = [
    masterSheet,
    ...classroomSheets,
    statsSheet,
    gradeDistSheet,
    rosterSheet,
    curriculumSheet,
  ];

  return {
    title,
    masterSheet,
    classroomSheets,
    statsSheet,
    gradeDistSheet,
    rosterSheet,
    curriculumSheet,
    allSheets,
    totalStudents: allStudents.length,
    classroomsCount: fullClassrooms.length,
    subjectsCount: subjects.length,
  };
}

export interface CreateAllClassroomsSpreadsheetOptions extends AllClassroomsExportDataOptions {
  accessToken: string;
  title: string;
}

/**
 * สร้าง Google Spreadsheet ใหม่สำหรับส่งออกข้อมูลทั้งหมด ทุกชั้นเรียน (Master + แยกรายห้อง + สถิติ + ทะเบียน + กระจายเกรด)
 */
export async function createAllClassroomsSpreadsheet(
  options: CreateAllClassroomsSpreadsheetOptions
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  totalStudents: number;
  classroomsCount: number;
  sheetsCount: number;
}> {
  const { accessToken } = options;
  const data = prepareAllClassroomsExportData(options);

  // 1. Construct sheet tabs definitions
  const sheetsPayload = data.allSheets.map((s) => ({
    properties: {
      title: s.title,
      gridProperties: {
        frozenRowCount: 1,
        ...(s.frozenColumnCount ? { frozenColumnCount: s.frozenColumnCount } : {}),
      },
    },
  }));

  // 2. Create Google Spreadsheet via API
  const createPayload = {
    properties: {
      title: data.title,
    },
    sheets: sheetsPayload,
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || 'ไม่สามารถสร้าง Google Spreadsheet สำหรับทุกชั้นเรียนได้');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 3. Write data to all sheets via batchUpdate
  const batchUpdateValuesPayload = {
    valueInputOption: 'USER_ENTERED',
    data: data.allSheets.map((s) => ({
      range: `'${s.title}'!A1`,
      values: [s.headers, ...s.rows],
    })),
  };

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchUpdateValuesPayload),
  });

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => ({}));
    console.warn('Batch update values warning:', errorBody);
  }

  // 4. Apply Header row styling (Emerald green background with white bold text)
  try {
    const formatRequests = (created.sheets || []).map((s: any) => ({
      repeatCell: {
        range: {
          sheetId: s.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.03, green: 0.42, blue: 0.31 }, // #086B4F deep emerald
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    }));

    if (formatRequests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      });
    }
  } catch (formatErr) {
    console.warn('Optional header styling warning:', formatErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    totalStudents: data.totalStudents,
    classroomsCount: data.classroomsCount,
    sheetsCount: data.allSheets.length,
  };
}

/**
 * ดาวน์โหลดข้อมูลทั้งหมด ทุกชั้นเรียน เป็นไฟล์ Excel / Google Sheets Compatible Workbook (.xlsx)
 */
export function exportAllClassroomsToExcel(
  options: AllClassroomsExportDataOptions & { fileName?: string }
): void {
  const data = prepareAllClassroomsExportData(options);
  const wb = XLSX.utils.book_new();

  // Append each sheet
  data.allSheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]);
    // Excel sheet name max 31 chars
    const safeSheetTitle = s.title.slice(0, 31).replace(/[/\\?*:[\]]/g, '-');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetTitle);
  });

  const downloadName = options.fileName || `${data.title}.xlsx`;
  XLSX.writeFile(wb, downloadName);
}

/**
 * สร้าง Google Spreadsheet ใหม่สำหรับบันทึกคะแนนทั้งห้อง
 */
export async function createClassroomSpreadsheet(
  accessToken: string,
  title: string,
  students: Student[],
  subjects: Subject[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Prepare Overview Sheet data
  const summaryHeaders = [
    'เลขที่',
    'เลขประจำตัว',
    'ชื่อ - นามสกุล',
    'ห้อง',
    ...subjects.flatMap((s) => [
      `${s.name} (เทอม 1: 50)`,
      `${s.name} (เทอม 2: 50)`,
      `${s.name} (รวม: 100)`,
      `${s.name} (เกรด)`,
    ]),
    'เกรดเฉลี่ย (GPA)',
  ];

  const summaryRows = students.map((stu) => {
    const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);
    const subjectCells = report.subjects.flatMap((sub) => [
      sub.term1_score,
      sub.term2_score,
      sub.total_score,
      sub.grade,
    ]);
    return [
      stu.student_no,
      stu.student_code,
      stu.name,
      stu.classroom,
      ...subjectCells,
      report.gpa.toFixed(2),
    ];
  });

  // 2. Prepare Student Roster Sheet data
  const studentRosterHeaders = ['เลขที่', 'เลขประจำตัวนักเรียน', 'ชื่อ - นามสกุล', 'เพศ', 'ห้องเรียน'];
  const studentRosterRows = students.map((s) => [
    s.student_no,
    s.student_code,
    s.name,
    s.gender || 'ชาย',
    s.classroom,
  ]);

  // Create the spreadsheet container with 2 tabs
  const createPayload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'สรุปผลการเรียนรวม',
          gridProperties: {
            frozenRowCount: 1,
            frozenColumnCount: 3,
          },
        },
      },
      {
        properties: {
          title: 'รายชื่อนักเรียน',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || 'ไม่สามารถสร้าง Google Spreadsheet ได้');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write values into the 2 tabs via batchUpdate
  const batchUpdateValuesPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'สรุปผลการเรียนรวม'!A1",
        values: [summaryHeaders, ...summaryRows],
      },
      {
        range: "'รายชื่อนักเรียน'!A1",
        values: [studentRosterHeaders, ...studentRosterRows],
      },
    ],
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchUpdateValuesPayload),
  });

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * อัปเดตข้อมูลคะแนนไปยัง Google Spreadsheet เดิมที่มีอยู่แล้ว
 */
export async function updateExistingSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  students: Student[],
  subjects: Subject[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[]
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // 1. Prepare Summary Data
  const summaryHeaders = [
    'เลขที่',
    'เลขประจำตัว',
    'ชื่อ - นามสกุล',
    'ห้อง',
    ...subjects.flatMap((s) => [
      `${s.name} (เทอม 1: 50)`,
      `${s.name} (เทอม 2: 50)`,
      `${s.name} (รวม: 100)`,
      `${s.name} (เกรด)`,
    ]),
    'เกรดเฉลี่ย (GPA)',
  ];

  const summaryRows = students.map((stu) => {
    const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);
    const subjectCells = report.subjects.flatMap((sub) => [
      sub.term1_score,
      sub.term2_score,
      sub.total_score,
      sub.grade,
    ]);
    return [
      stu.student_no,
      stu.student_code,
      stu.name,
      stu.classroom,
      ...subjectCells,
      report.gpa.toFixed(2),
    ];
  });

  // Check existing sheet tabs
  const info = await getSpreadsheetDetails(accessToken, cleanId);
  let targetSheetTitle = info.sheets[0]?.title || 'Sheet1';
  const summaryTab = info.sheets.find((s) => s.title.includes('สรุป') || s.title.includes('ผลการเรียน'));
  if (summaryTab) {
    targetSheetTitle = summaryTab.title;
  }

  // Update target sheet range
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${targetSheetTitle}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [summaryHeaders, ...summaryRows],
      }),
    }
  );

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || 'ไม่สามารถอัปเดตข้อมูลไปยัง Google Sheets ได้');
  }
}

/**
 * อัปเดตข้อมูลทุกชั้นเรียนไปยัง Google Spreadsheet ที่เชื่อมไว้
 */
export async function updateExistingSpreadsheetAllClassrooms(
  accessToken: string,
  spreadsheetId: string,
  classrooms: Classroom[],
  allStudents: Student[],
  subjects: Subject[],
  allScoreItems: ScoreItem[],
  allScores: Score[],
  terms: Term[],
  schoolName?: string,
  academicYear?: string
): Promise<{ sheetsUpdated: number; totalStudents: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const info = await getSpreadsheetDetails(accessToken, cleanId);
  const existingSheetTitles = new Set(info.sheets.map((s) => s.title));

  const exportData = prepareAllClassroomsExportData({
    classrooms,
    allStudents,
    subjects,
    allScoreItems,
    allScores,
    terms,
    schoolName,
    academicYear,
  });

  // Check if any sheet needs to be added
  const sheetsToAdd = exportData.allSheets.filter((s) => !existingSheetTitles.has(s.title));
  if (sheetsToAdd.length > 0) {
    const addSheetRequests = sheetsToAdd.map((s) => ({
      addSheet: {
        properties: {
          title: s.title,
          gridProperties: {
            frozenRowCount: 1,
            ...(s.frozenColumnCount ? { frozenColumnCount: s.frozenColumnCount } : {}),
          },
        },
      },
    }));

    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: addSheetRequests }),
      });
    } catch (err) {
      console.warn('Add sheets warning:', err);
    }
  }

  // Update all sheets values
  const batchData = exportData.allSheets.map((s) => ({
    range: `'${s.title}'!A1`,
    values: [s.headers, ...s.rows],
  }));

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message || 'ไม่สามารถอัปเดตข้อมูลทุกชั้นเรียนไปยัง Google Sheets ได้'
    );
  }

  return {
    sheetsUpdated: exportData.allSheets.length,
    totalStudents: exportData.totalStudents,
  };
}

/**
 * นำเข้ารายชื่อนักเรียนจาก Google Spreadsheet
 */
export async function importStudentsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetNameOrRange: string = 'A1:E50',
  defaultClassroom: string = 'ป.5/1'
): Promise<Omit<Student, 'id'>[]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // If user provided just sheet name, append standard range
  let finalRange = sheetNameOrRange.trim();
  if (!finalRange.includes('!')) {
    finalRange = `'${finalRange}'!A1:E60`;
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(finalRange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message ||
        `ไม่สามารถอ่านข้อมูลจาก Sheet ได้ กรุณาตรวจสอบชื่อแผ่นงานและสิทธิ์การเข้าถึง`
    );
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length === 0) {
    throw new Error('ไม่พบข้อมูลในตาราง Google Sheets ดังกล่าว');
  }

  // Check if first row is header
  let startIdx = 0;
  const headerText = rows[0].join(' ').toLowerCase();
  if (
    headerText.includes('เลขที่') ||
    headerText.includes('ชื่อ') ||
    headerText.includes('name') ||
    headerText.includes('ประจำตัว') ||
    headerText.includes('ห้อง')
  ) {
    startIdx = 1;
  }

  const parsedStudents: Omit<Student, 'id'>[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    const col2 = String(row[2] || '').trim();
    const col3 = String(row[3] || '').trim();
    const col4 = String(row[4] || '').trim();

    let studentNo = parseInt(col0, 10);
    let name = '';
    let studentCode = '';
    let gender: 'ชาย' | 'หญิง' = 'ชาย';
    let classroom = defaultClassroom;

    if (!isNaN(studentNo)) {
      // Format 1: [No, Code, Name, Gender, Room] or [No, Name, Code, Room]
      if (col1.match(/^\d+$/) && col2.length > 0) {
        studentCode = col1;
        name = col2;
        gender = col3 === 'หญิง' || col3 === 'ด.ญ.' ? 'หญิง' : 'ชาย';
        classroom = col4 || defaultClassroom;
      } else {
        name = col1;
        studentCode = col2 || `${50100 + studentNo}`;
        gender = col3 === 'หญิง' || name.includes('หญิง') || name.includes('ด.ญ.') ? 'หญิง' : 'ชาย';
        classroom = col3.includes('ป.') ? col3 : col4 || defaultClassroom;
      }
    } else {
      // Format 2: [Name, Code, Room]
      studentNo = parsedStudents.length + 1;
      name = col0;
      studentCode = col1 || `${50100 + studentNo}`;
      gender = name.includes('หญิง') || name.includes('ด.ญ.') ? 'หญิง' : 'ชาย';
      classroom = col2 || defaultClassroom;
    }

    if (name.trim()) {
      parsedStudents.push({
        student_no: studentNo,
        name: name.trim(),
        student_code: studentCode.trim(),
        classroom: classroom.trim() || defaultClassroom,
        gender,
      });
    }
  }

  return parsedStudents.sort((a, b) => a.student_no - b.student_no);
}
