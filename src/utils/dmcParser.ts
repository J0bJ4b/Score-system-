/**
 * DMC (Data Management Center - สพฐ.) Parser and Filter Utility
 * คัดกรองและสกัดเฉพาะข้อมูลที่จำเป็นจากไฟล์ DMC ของกระทรวงศึกษาธิการ
 * (เลขที่, เลขประจำตัวประชาชน 13 หลัก, คำนำหน้า+ชื่อ+นามสกุล, เพศ, ชั้น/ห้อง)
 * พร้อมตัดข้อมูลส่วนเกินอื่นๆ ทิ้งอัตโนมัติ (วันเกิด, ที่อยู่, เบอร์โทร, ชื่อผู้ปกครอง ฯลฯ)
 */

export interface DmcExtractedStudent {
  id: string;
  student_no: number;
  name: string;
  student_code: string; // เลขประจำตัวประชาชน 13 หลัก
  formatted_id: string; // รูปแบบ X-XXXX-XXXXX-XX-X
  gender: 'ชาย' | 'หญิง';
  classroom: string;
  classroom_id?: string;
  is_valid_id: boolean;
  ignored_columns_count?: number;
  raw_line?: string;
}

/**
 * จัดรูปแบบเลขประจำตัวประชาชน 13 หลักให้อ่านง่าย: X-XXXX-XXXXX-XX-X
 */
export function formatCitizenId(id: string | undefined | null): string {
  if (!id) return '';
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 13) return id;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

/**
 * ล้างขีดและช่องว่างออกจากเลขประจำตัวประชาชน
 */
export function cleanCitizenId(id: string | undefined | null): string {
  if (!id) return '';
  return id.replace(/\D/g, '');
}

/**
 * ตรวจสอบความถูกต้องของเลขประจำตัวประชาชน 13 หลักตามหลักการคำนวณ Checksum ของไทย
 */
export function validateThaiCitizenId(id: string | undefined | null): boolean {
  if (!id) return false;
  const digits = cleanCitizenId(id);
  if (digits.length !== 13) return false;

  // ตรวจสอบกรณีเลขซ้ำ 13 หลัก เช่น 0000000000000 หรือ 1111111111111
  if (/^(\d)\1{12}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(digits[12], 10);
}

/**
 * ค้นหาตำแหน่งคอลัมน์จากแถวหัวตาราง (Header row) ของไฟล์ DMC
 */
interface DmcColumnMapping {
  noIdx: number;
  citizenIdIdx: number;
  studentCodeIdx: number;
  prefixIdx: number;
  firstNameIdx: number;
  middleNameIdx: number;
  lastNameIdx: number;
  fullNameIdx: number;
  genderIdx: number;
  classroomIdx: number;
}

function detectDmcHeaders(headers: string[]): DmcColumnMapping {
  const mapping: DmcColumnMapping = {
    noIdx: -1,
    citizenIdIdx: -1,
    studentCodeIdx: -1,
    prefixIdx: -1,
    firstNameIdx: -1,
    middleNameIdx: -1,
    lastNameIdx: -1,
    fullNameIdx: -1,
    genderIdx: -1,
    classroomIdx: -1,
  };

  headers.forEach((h, idx) => {
    const col = h.trim().toLowerCase();

    // ลำดับ / เลขที่
    if (
      mapping.noIdx === -1 &&
      (col === 'ที่' || col === 'ลำดับ' || col === 'เลขที่' || col === 'no' || col === 'no.' || col === 'ลำดับที่')
    ) {
      mapping.noIdx = idx;
    }

    // เลขประจำตัวประชาชน (13 หลัก)
    if (
      mapping.citizenIdIdx === -1 &&
      (col.includes('ประชาชน') ||
        col.includes('บัตร') ||
        col.includes('13 หลัก') ||
        col.includes('citizen') ||
        col.includes('id card') ||
        col.includes('pid') ||
        col.includes('cid'))
    ) {
      mapping.citizenIdIdx = idx;
    }

    // เลขประจำตัวนักเรียน
    if (
      mapping.studentCodeIdx === -1 &&
      (col.includes('เลขประจำตัวนักเรียน') ||
        col.includes('รหัสนักเรียน') ||
        col.includes('student_code') ||
        col === 'เลขประจำตัว')
    ) {
      mapping.studentCodeIdx = idx;
    }

    // คำนำหน้า
    if (
      mapping.prefixIdx === -1 &&
      (col.includes('คำนำหน้า') || col.includes('คำนำ') || col.includes('prefix') || col === 'title')
    ) {
      mapping.prefixIdx = idx;
    }

    // ชื่อ-สกุล (รวมในช่องเดียว)
    if (
      mapping.fullNameIdx === -1 &&
      (col === 'ชื่อ-สกุล' ||
        col === 'ชื่อ-นามสกุล' ||
        col === 'ชื่อ สกุล' ||
        col === 'ชื่อนักเรียน' ||
        col === 'fullname' ||
        col === 'full name')
    ) {
      mapping.fullNameIdx = idx;
    }

    // ชื่อ
    if (
      mapping.firstNameIdx === -1 &&
      (col === 'ชื่อ' || col === 'firstname' || col === 'first name' || col === 'fname')
    ) {
      mapping.firstNameIdx = idx;
    }

    // ชื่อกลาง
    if (
      mapping.middleNameIdx === -1 &&
      (col.includes('ชื่อกลาง') || col === 'middlename' || col === 'middle name')
    ) {
      mapping.middleNameIdx = idx;
    }

    // นามสกุล
    if (
      mapping.lastNameIdx === -1 &&
      (col === 'นามสกุล' || col === 'สกุล' || col === 'lastname' || col === 'last name' || col === 'lname')
    ) {
      mapping.lastNameIdx = idx;
    }

    // เพศ
    if (
      mapping.genderIdx === -1 &&
      (col.includes('เพศ') || col === 'gender' || col === 'sex')
    ) {
      mapping.genderIdx = idx;
    }

    // ชั้น / ห้อง
    if (
      mapping.classroomIdx === -1 &&
      (col.includes('ชั้น') ||
        col.includes('ห้อง') ||
        col.includes('ชั้นเรียน') ||
        col.includes('ระดับชั้น') ||
        col === 'class' ||
        col === 'room')
    ) {
      mapping.classroomIdx = idx;
    }
  });

  return mapping;
}

/**
 * แยกเพศจากคำนำหน้าหรือค่าในคอลัมน์เพศ
 */
function resolveGender(genderText: string, nameText: string): 'ชาย' | 'หญิง' {
  const g = genderText.trim().toLowerCase();
  const n = nameText.trim();

  if (g === 'หญิง' || g === 'ญ' || g === '2' || g === 'female' || g === 'f') {
    return 'หญิง';
  }
  if (g === 'ชาย' || g === 'ช' || g === '1' || g === 'male' || g === 'm') {
    return 'ชาย';
  }

  // ดูจากคำนำหน้าในชื่อ
  if (
    n.startsWith('ด.ญ.') ||
    n.startsWith('ด.ญ') ||
    n.startsWith('เด็กหญิง') ||
    n.startsWith('น.ส.') ||
    n.startsWith('นางสาว') ||
    n.startsWith('นาง')
  ) {
    return 'หญิง';
  }

  return 'ชาย';
}

/**
 * ทำความสะอาดชื่อ ไม่ให้มีตัวเลขหรือเครื่องหมายหลุดเข้ามา
 */
function cleanStudentName(rawName: string): string {
  let name = rawName
    .replace(/[0-9\-_+=*/\\|(){}\[\]<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // จัดระเบียบคำนำหน้าทั่วไป
  if (name.startsWith('ด.ช. ') || name.startsWith('ด.ช.')) {
    name = name.replace(/^ด\.ช\.?\s*/, 'เด็กชาย');
  } else if (name.startsWith('ด.ญ. ') || name.startsWith('ด.ญ.')) {
    name = name.replace(/^ด\.ญ\.?\s*/, 'เด็กหญิง');
  } else if (name.startsWith('น.ส. ') || name.startsWith('น.ส.')) {
    name = name.replace(/^น\.ส\.?\s*/, 'นางสาว');
  }

  return name;
}

/**
 * ฟังก์ชันหลักในการแยกวิเคราะห์ไฟล์ DMC หรือข้อความตารางที่คัดลอกมาจากระบบ DMC
 */
export function parseDmcContent(
  rawContent: string,
  defaultClassroom: string = 'ป.5/1'
): {
  students: DmcExtractedStudent[];
  totalRows: number;
  filteredCount: number;
  headerDetected: boolean;
  ignoredColumnsNotice: string;
} {
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      students: [],
      totalRows: 0,
      filteredCount: 0,
      headerDetected: false,
      ignoredColumnsNotice: '',
    };
  }

  // ตรวจสอบตัวคั่น (Tab จากการก๊อปปี้ Excel หรือ Comma จาก CSV หรือ Semicolon)
  const firstFew = lines.slice(0, 5).join('\n');
  let delimiter = '\t';
  if (firstFew.includes('\t')) {
    delimiter = '\t';
  } else if (firstFew.includes(',')) {
    delimiter = ',';
  } else if (firstFew.includes(';')) {
    delimiter = ';';
  }

  // ตรวจจับว่าแถวแรกเป็น Header หรือไม่
  const firstRowCols = lines[0].split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
  const headerMapping = detectDmcHeaders(firstRowCols);

  const hasHeaderKeywords =
    headerMapping.citizenIdIdx !== -1 ||
    headerMapping.noIdx !== -1 ||
    headerMapping.firstNameIdx !== -1 ||
    headerMapping.fullNameIdx !== -1 ||
    lines[0].includes('เลข') ||
    lines[0].includes('ชื่อ');

  let startIndex = 0;
  if (hasHeaderKeywords) {
    startIndex = 1;
  }

  const results: DmcExtractedStudent[] = [];
  let detectedColumnCount = firstRowCols.length;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    let studentNo = results.length + 1;
    let citizenId = '';
    let studentCodeShort = '';
    let fullName = '';
    let gender: 'ชาย' | 'หญิง' = 'ชาย';
    let classroom = defaultClassroom;

    // 1. ถ้ามี Header Mapping ที่ตรวจจับได้แม่นยำ
    if (hasHeaderKeywords && (headerMapping.citizenIdIdx !== -1 || headerMapping.fullNameIdx !== -1 || headerMapping.firstNameIdx !== -1)) {
      // เลขที่
      if (headerMapping.noIdx !== -1 && cols[headerMapping.noIdx]) {
        const parsedNo = parseInt(cols[headerMapping.noIdx], 10);
        if (!isNaN(parsedNo) && parsedNo > 0) studentNo = parsedNo;
      }

      // เลขประจำตัวประชาชน 13 หลัก
      if (headerMapping.citizenIdIdx !== -1 && cols[headerMapping.citizenIdIdx]) {
        citizenId = cleanCitizenId(cols[headerMapping.citizenIdIdx]);
      }

      // ชื่อ-สกุล
      if (headerMapping.fullNameIdx !== -1 && cols[headerMapping.fullNameIdx]) {
        fullName = cols[headerMapping.fullNameIdx];
      } else {
        const prefix = (headerMapping.prefixIdx !== -1 ? cols[headerMapping.prefixIdx] : '') || '';
        const fname = (headerMapping.firstNameIdx !== -1 ? cols[headerMapping.firstNameIdx] : '') || '';
        const mname = (headerMapping.middleNameIdx !== -1 ? cols[headerMapping.middleNameIdx] : '') || '';
        const lname = (headerMapping.lastNameIdx !== -1 ? cols[headerMapping.lastNameIdx] : '') || '';
        fullName = [prefix, fname, mname, lname].filter(Boolean).join(' ');
      }

      // เพศ
      const genderRaw = headerMapping.genderIdx !== -1 ? cols[headerMapping.genderIdx] || '' : '';
      gender = resolveGender(genderRaw, fullName);

      // ห้องเรียน
      if (headerMapping.classroomIdx !== -1 && cols[headerMapping.classroomIdx]) {
        classroom = cols[headerMapping.classroomIdx];
      }
    } else {
      // 2. ถ้าไม่มี Header หรือเป็นข้อความดิบ: ใช้ AI Smart Pattern Matching ตรวจจับคอลัมน์อัตโนมัติ
      cols.forEach((col, cIdx) => {
        const cleanCol = col.replace(/\D/g, '');

        // ตรวจจับเลข 13 หลัก (เลขประจำตัวประชาชน)
        if (!citizenId && cleanCol.length === 13) {
          citizenId = cleanCol;
          return;
        }

        // ตรวจจับรหัสนักเรียนสั้น (4-6 หลัก)
        if (!studentCodeShort && cleanCol.length >= 4 && cleanCol.length <= 6) {
          studentCodeShort = cleanCol;
          return;
        }

        // ตรวจจับลำดับเลขที่ (ตัวเลข 1-99 อยู่ช่วงต้นๆ ของคอลัมน์)
        if (cIdx <= 1) {
          const parsed = parseInt(col, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 200) {
            studentNo = parsed;
            return;
          }
        }

        // ตรวจจับชื่อ-สกุล (มีตัวอักษรภาษาไทยและมีช่องว่าง หรือมีคำนำหน้า)
        if (!fullName && /[ก-๙]/.test(col)) {
          if (
            col.includes('ด.ช.') ||
            col.includes('ด.ญ.') ||
            col.includes('เด็กชาย') ||
            col.includes('เด็กหญิง') ||
            col.includes('นาย') ||
            col.includes('นางสาว') ||
            col.includes(' ')
          ) {
            fullName = col;
            return;
          }
        }

        // ตรวจจับห้องเรียน
        if (col.includes('ป.') || col.includes('ม.') || col.includes('/')) {
          classroom = col;
        }
      });

      // ถ้ายังหาชื่อไม่เจอ แต่พบคอลัมน์ภาษาไทยที่ยาวพอ
      if (!fullName) {
        const thaiCols = cols.filter((c) => /[ก-๙]{3,}/.test(c) && !c.includes('ปกติ') && !c.includes('กำลัง'));
        if (thaiCols.length > 0) {
          fullName = thaiCols.join(' ');
        }
      }

      gender = resolveGender('', fullName);
    }

    // ถ้าไม่มีเลข 13 หลักในแถว ให้สแกนข้อความทั้งแถวหาเลข 13 หลัก
    if (!citizenId) {
      const match13 = line.match(/\b\d{13}\b/) || line.match(/\d{1}-\d{4}-\d{5}-\d{2}-\d{1}/);
      if (match13) {
        citizenId = cleanCitizenId(match13[0]);
      }
    }

    // กรณีไม่มีเลข 13 หลักจริงๆ ให้สร้างเลขจำลองที่มีโครงสร้างถูกต้อง
    if (!citizenId) {
      citizenId = `15099${String(studentNo).padStart(3, '0')}${String(Date.now()).slice(-5)}`;
    }

    fullName = cleanStudentName(fullName);

    // ถ้าชื่อว่าง ให้ข้ามแถวนี้
    if (!fullName || fullName.length < 2) continue;

    results.push({
      id: `stu-dmc-${Date.now()}-${i}-${studentNo}`,
      student_no: studentNo,
      name: fullName,
      student_code: citizenId,
      formatted_id: formatCitizenId(citizenId),
      gender,
      classroom: classroom || defaultClassroom,
      is_valid_id: validateThaiCitizenId(citizenId),
      ignored_columns_count: Math.max(0, detectedColumnCount - 4),
      raw_line: line,
    });
  }

  // จัดเรียงตามเลขที่
  results.sort((a, b) => a.student_no - b.student_no);

  return {
    students: results,
    totalRows: lines.length - startIndex,
    filteredCount: results.length,
    headerDetected: hasHeaderKeywords,
    ignoredColumnsNotice: `คัดกรองข้อมูลสำคัญ 4 คอลัมน์ (เลขที่, เลขบัตร ปชช., ชื่อ-สกุล, เพศ) และข้ามคอลัมน์ที่ไม่จำเป็นแล้ว ${Math.max(0, detectedColumnCount - 4)} คอลัมน์`,
  };
}
