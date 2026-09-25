import { Student, Subject, ScoreItem, Score, Term } from '../types';
import { getSubjectSummaryForStudent, getStudentFullReport } from '../utils/gradeCalculator';

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
