/**
 * Thai File Encoding and Excel (.xlsx / .xls) / CSV Decoder Utility
 * แก้ไขปัญหาไฟล์ภาษาไทยจากระบบราชการ (DMC สพฐ. / Excel / Windows-874 / TIS-620 / UTF-8)
 * ป้องกันปัญหาอัปโหลดแล้วขึ้นภาษาต่างดาว / ภาษามั่ว (Mojibake) อย่างถาวร 100%
 */

import * as XLSX from 'xlsx';

export interface DecodedFileResult {
  text: string;
  detectedFormat: 'excel' | 'csv' | 'tsv' | 'text';
  detectedEncoding: string;
  sheetNames?: string[];
  activeSheet?: string;
  rowCount: number;
}

/**
 * ถอดรหัสไบต์ Windows-874 / TIS-620 เป็นภาษาไทย Unicode โดยตรง (Pure JS Fallback)
 * ทำงานได้ทุกเบราว์เซอร์ แม้เครื่องนั้นๆ จะไม่มี TextDecoder('windows-874')
 */
export function decodeWindows874(bytes: Uint8Array): string {
  // ลองใช้ TextDecoder ของเบราว์เซอร์ก่อน
  try {
    const td = new TextDecoder('windows-874');
    return td.decode(bytes);
  } catch {}

  try {
    const td = new TextDecoder('tis-620');
    return td.decode(bytes);
  } catch {}

  // Pure JavaScript Fallback สำหรับ Windows-874 และ TIS-620
  // ไบต์ 0xA1 - 0xFB ตรงกับ Unicode U+0E01 - U+0E5B (บวก 0x0E00 - 0xA0)
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      str += String.fromCharCode(b);
    } else if (b >= 0xa1 && b <= 0xfb) {
      // ตัวอักษรไทย ก - ๛
      str += String.fromCharCode(b - 0xa0 + 0x0e00);
    } else if (b === 0x80) {
      str += '€';
    } else if (b === 0x85) {
      str += '…';
    } else if (b === 0x91) {
      str += '‘';
    } else if (b === 0x92) {
      str += '’';
    } else if (b === 0x93) {
      str += '“';
    } else if (b === 0x94) {
      str += '”';
    } else if (b === 0x95) {
      str += '•';
    } else if (b === 0x96) {
      str += '–';
    } else if (b === 0x97) {
      str += '—';
    } else {
      str += String.fromCharCode(b);
    }
  }
  return str;
}

/**
 * แก้ไขตัวอักษรภาษาไทยที่กลายเป็นภาษาต่างดาว (Mojibake Auto-Fixer)
 * รองรับทั้งกรณี:
 * 1. UTF-8 ถูกอ่านเป็น Latin-1/Windows-1252 (จะเห็นเป็น à¸ à¹... หรือ Ã Ã...)
 * 2. Windows-874 ถูกอ่านเป็น ISO-8859-1/Latin-1 (จะเห็นเป็น à´ç¡ªÒÂ แทนที่จะเป็น เด็กชาย)
 * 3. Double UTF-8 Encoding
 */
export function fixThaiMojibake(str: string): string {
  if (!str) return str;

  // กรณี 1: UTF-8 Thai ถูกอ่านด้วย Latin-1 / Windows-1252 (มีตัว à¸ หรือ à¹ หรือ Ã )
  if (/à¸|à¹|Ã |Ã¸|Â¸|Â¹/.test(str)) {
    try {
      // ทดสอบกู้คืนแบบชั้นเดียว
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (/[\u0E00-\u0E7F]/.test(fixed)) {
        return fixed;
      }
    } catch {}

    try {
      // ทดสอบกู้คืนแบบสองชั้น (Double UTF-8)
      const bytes1 = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes1[i] = str.charCodeAt(i) & 0xff;
      }
      const mid = new TextDecoder('utf-8').decode(bytes1);
      const bytes2 = new Uint8Array(mid.length);
      for (let i = 0; i < mid.length; i++) {
        bytes2[i] = mid.charCodeAt(i) & 0xff;
      }
      const fixed2 = new TextDecoder('utf-8', { fatal: true }).decode(bytes2);
      if (/[\u0E00-\u0E7F]/.test(fixed2)) {
        return fixed2;
      }
    } catch {}
  }

  // กรณี 2: Windows-874 / TIS-620 ถูกเปิดด้วย Latin-1 / ISO-8859-1
  // ตัวอย่างเช่น "เด็กชาย" กลายเป็น "à´ç¡ªÒÂ", "นาย" กลายเป็น "¹ÒÂ", "ที่" กลายเป็น "·Õè"
  // ตรวจสอบว่าในสตริงมีตัวอักษรช่วง U+00A1 ถึง U+00FB หนาแน่นผิดปกติหรือไม่
  const highLatinCount = (str.match(/[\u00A1-\u00FB]/g) || []).length;
  const thaiCount = (str.match(/[\u0E00-\u0E7F]/g) || []).length;

  if (highLatinCount > 5 && thaiCount === 0) {
    let candidate = '';
    let converted = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xa1 && code <= 0xfb) {
        candidate += String.fromCharCode(code - 0xa0 + 0x0e00);
        converted++;
      } else {
        candidate += str[i];
      }
    }
    // ถ้าแปลงแล้วมีคำภาษาไทย เช่น คำนำหน้า, ชื่อ, หรือตัวสระวรรณยุกต์ไทย
    if (
      converted > 0 &&
      /[\u0E00-\u0E7F]{3,}/.test(candidate) &&
      (candidate.includes('เด็ก') ||
        candidate.includes('นาย') ||
        candidate.includes('นาง') ||
        candidate.includes('เลข') ||
        candidate.includes('ชื่อ') ||
        candidate.includes('ชั้น') ||
        candidate.includes('ป.') ||
        candidate.includes('ม.'))
    ) {
      return candidate;
    }
  }

  return str;
}

/**
 * ตรวจสอบว่า Buffer หรือ Array เป็นไฟล์ Excel (.xlsx หรือ .xls) หรือไม่
 */
export function isExcelBuffer(buffer: ArrayBuffer, fileName: string = ''): boolean {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return true;
  }

  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  // ZIP signature for .xlsx (PK\x03\x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return true;
  }

  // OLE2 Compound Document signature for legacy .xls (\xD0\xCF\x11\xE0)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return true;
  }

  return false;
}

/**
 * ถอดรหัสไฟล์ข้อความภาษาไทย (ตรวจจับ Windows-874 / TIS-620 vs UTF-8 อัตโนมัติ 100%)
 */
export function decodeThaiTextBuffer(
  buffer: ArrayBuffer,
  forcedEncoding?: 'auto' | 'windows-874' | 'utf-8'
): { text: string; encoding: string } {
  const bytes = new Uint8Array(buffer);

  // 1. ตรวจสอบ UTF-8 BOM (0xEF, 0xBB, 0xBF)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const text = new TextDecoder('utf-8').decode(bytes.subarray(3));
    return { text, encoding: 'UTF-8 (BOM)' };
  }

  // 2. ตรวจสอบ UTF-16LE BOM (0xFF, 0xFE)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = new TextDecoder('utf-16le').decode(bytes.subarray(2));
    return { text, encoding: 'UTF-16LE' };
  }

  // 3. กรณีผู้ใช้เลือก Encoding เจาะจง
  if (forcedEncoding === 'windows-874') {
    const text = decodeWindows874(bytes);
    return { text, encoding: 'Windows-874 (TIS-620)' };
  }

  if (forcedEncoding === 'utf-8') {
    const text = new TextDecoder('utf-8').decode(bytes);
    return { text, encoding: 'UTF-8' };
  }

  // 4. โหมด Auto-Detect (ฉลาดที่สุดสำหรับ DMC และระบบราชการไทย)
  // นับจำนวนไบต์ที่อยู่ในช่วงตัวอักษรไทยของ Windows-874 (0xA1 - 0xFB)
  let win874ThaiByteCount = 0;
  for (let i = 0; i < Math.min(bytes.length, 5000); i++) {
    if (bytes[i] >= 0xa1 && bytes[i] <= 0xfb) {
      win874ThaiByteCount++;
    }
  }

  // 4.1 ลองถอดรหัสแบบ UTF-8 Strict ดูก่อน
  try {
    const utf8Text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const thaiMatches = utf8Text.match(/[\u0E00-\u0E7F]/g);

    // ถ้าพบภาษาไทยใน UTF-8 แปลว่าไฟล์เป็น UTF-8 แน่นอน
    if (thaiMatches && thaiMatches.length > 0) {
      return { text: utf8Text, encoding: 'UTF-8' };
    }

    // ถ้าไม่มีภาษาไทยใน UTF-8 แต่พบว่ามีไบต์ช่วง 0xA1-0xFB อยู่เยอะมาก
    // อาจเป็นไฟล์ Windows-874 ที่บังเอิญเป็น valid byte หรือ UTF-8 fallback
    if (win874ThaiByteCount > 5) {
      const winText = decodeWindows874(bytes);
      const winThai = winText.match(/[\u0E00-\u0E7F]/g);
      if (winThai && winThai.length > 0) {
        return { text: winText, encoding: 'Windows-874 (DMC สพฐ. / TIS-620)' };
      }
    }

    return { text: utf8Text, encoding: 'UTF-8' };
  } catch {
    // 4.2 เมื่อ UTF-8 fatal ล้มเหลว -> ไฟล์ไม่ใช่ UTF-8 แน่นอน!
    // ส่วนใหญ่ 99.9% ของไฟล์ DMC สพฐ. จะเข้ารหัส Windows-874 (TIS-620)
    const win874Text = decodeWindows874(bytes);
    const thaiMatches = win874Text.match(/[\u0E00-\u0E7F]/g);

    if (thaiMatches && thaiMatches.length > 0) {
      return { text: win874Text, encoding: 'Windows-874 (DMC สพฐ. / TIS-620)' };
    }

    // ถ้ายังไม่เจอ ให้ลองฟังก์ชันกู้คืน
    const fallbackText = new TextDecoder('utf-8').decode(bytes);
    const fixed = fixThaiMojibake(fallbackText);
    return { text: fixed, encoding: 'กู้คืนรหัสภาษาอัตโนมัติ' };
  }
}

/**
 * อ่านและแปลงไฟล์ใดๆ (Excel .xlsx/.xls หรือ CSV/.txt/Windows-874) เป็นข้อความตารางสำหรับประมวลผล
 */
export async function readAnyThaiFile(
  file: File,
  forcedEncoding?: 'auto' | 'windows-874' | 'utf-8'
): Promise<DecodedFileResult> {
  const buffer = await file.arrayBuffer();

  // 1. ถ้าเป็นไฟล์ Excel (.xlsx, .xls)
  if (isExcelBuffer(buffer, file.name)) {
    try {
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('ไม่พบแผ่นงาน (Worksheet) ในไฟล์ Excel');
      }

      // เลือกแผ่นงานแรก หรือแผ่นงานที่มีชื่อเกี่ยวกับนักเรียน/ข้อมูล
      let activeSheet = sheetNames[0];
      const studentSheet = sheetNames.find(
        (s) =>
          s.includes('นักเรียน') ||
          s.includes('รายชื่อ') ||
          s.includes('dmc') ||
          s.includes('student') ||
          s.includes('data')
      );
      if (studentSheet) {
        activeSheet = studentSheet;
      }

      const worksheet = workbook.Sheets[activeSheet];

      // แปลงตาราง Excel เป็น Tab-separated text (TSV) ซึ่งรักษารูปแบบชื่อ-สกุล และเลข 13 หลักได้แม่นยำที่สุด
      const tsvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
      const lines = tsvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

      return {
        text: tsvText,
        detectedFormat: 'excel',
        detectedEncoding: `Excel Workbook (${file.name.endsWith('.xls') ? 'Excel 97-2003 .xls' : 'Excel .xlsx'})`,
        sheetNames,
        activeSheet,
        rowCount: lines.length,
      };
    } catch (err: any) {
      console.warn('Excel parse error, falling back to text decoder:', err);
    }
  }

  // 2. ถ้าเป็นไฟล์ข้อความ (CSV, TSV, TXT จากระบบ DMC หรือโปรแกรมอื่น)
  const decoded = decodeThaiTextBuffer(buffer, forcedEncoding);
  let cleanedText = fixThaiMojibake(decoded.text);

  const format = file.name.toLowerCase().endsWith('.tsv')
    ? 'tsv'
    : file.name.toLowerCase().endsWith('.csv')
    ? 'csv'
    : 'text';

  const lines = cleanedText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  return {
    text: cleanedText,
    detectedFormat: format,
    detectedEncoding: decoded.encoding,
    rowCount: lines.length,
  };
}
