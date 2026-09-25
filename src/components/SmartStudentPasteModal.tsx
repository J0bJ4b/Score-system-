import React, { useState, useMemo, useEffect } from 'react';
import { Student, Classroom } from '../types';
import { storage } from '../services/storage';
import {
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Copy,
  Trash2,
  Check,
  RefreshCw,
  X,
  ArrowRight,
  Sliders,
  Eye,
  Info,
  UserPlus,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface SmartStudentPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClassroom: Classroom;
  classrooms: Classroom[];
  existingStudents: Student[];
  onStudentsImported: () => void;
}

export interface ParsedExtractedStudent {
  id: string;
  selected: boolean;
  student_no: number;
  name: string;
  student_code: string;
  gender: 'ชาย' | 'หญิง';
  classroom_id: string;
  classroom: string;
  rawLine: string;
  hasConflict?: boolean;
  conflictReason?: string;
}

// Sample messy raw texts that teachers encounter
export const SAMPLE_RAW_TEXTS = [
  {
    title: 'ตัวอย่างจาก DMC/SGS (มีเลข 13 หลักและข้อมูลปน)',
    text: `1	1509901234567	50101	เด็กชายกฤษณะ พงษ์ศิริ	ชาย	ป.5/1	12/04/2557	0812345678	ปกติ
2	1509902345678	50102	เด็กหญิงกัญญาณัฐ สุขใจ	หญิง	ป.5/1	25/08/2557	0898765432	ปกติ
3	1509903456789	50103	เด็กชายชนาธิป รุ่งเรือง	ชาย	ป.5/1	03/01/2558	0865432109	ปกติ
4	1509904567890	50104	เด็กหญิงณิชารีย์ สว่างวงศ์	หญิง	ป.5/1	19/11/2557	0823456789	ปกติ`,
  },
  {
    title: 'ตัวอย่างจาก Excel คัดลอกเฉพาะตารางปนคอลัมน์',
    text: `ลำดับ	เลขประจำตัว	คำนำหน้า	ชื่อ	นามสกุล	ห้อง	หมายเหตุ
1	50105	ด.ช.	ธนภัทร	สิทธิโชค	ป.5/1	ย้ายเข้า
2	50106	ด.ญ.	ปวริศา	แก้วมณี	ป.5/1	หัวหน้าห้อง
3	50107	ด.ช.	ภานุวัฒน์	วงศ์ษา	ป.5/1	-
4	50108	ด.ญ.	รมิดา	ใจงาม	ป.5/1	-`,
  },
  {
    title: 'ตัวอย่างข้อความแชท LINE / ข้อความดิบเรียงแถว',
    text: `1. ด.ช.วรเมธ คงไทย รหัส 50109 ห้อง ป.5/1
2. ด.ญ.ศศิธร พรหมดี 50110
3. เด็กชายอนันต์ ทวีผล 50111
4. เด็กหญิงอมลวรรณ บุญมี รหัส 50112`,
  },
];

export const SmartStudentPasteModal: React.FC<SmartStudentPasteModalProps> = ({
  isOpen,
  onClose,
  activeClassroom,
  classrooms,
  existingStudents,
  onStudentsImported,
}) => {
  const [rawInputText, setRawInputText] = useState('');
  const [targetClassroomId, setTargetClassroomId] = useState(activeClassroom.id);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');

  // Smart Filtering Toggles
  const [autoDetectNo, setAutoDetectNo] = useState(true);
  const [autoDetectCode, setAutoDetectCode] = useState(true);
  const [autoDetectGender, setAutoDetectGender] = useState(true);
  const [removeIdCard13Digits, setRemoveIdCard13Digits] = useState(true);
  const [removeDatesAndPhones, setRemoveDatesAndPhones] = useState(true);
  const [removeNoiseWords, setRemoveNoiseWords] = useState(true);
  const [keepPrefixInName, setKeepPrefixInName] = useState(true);
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);

  // Search filter within preview
  const [previewSearch, setPreviewSearch] = useState('');
  const [parsedList, setParsedList] = useState<ParsedExtractedStudent[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const targetClassroom =
    classrooms.find((c) => c.id === targetClassroomId) || activeClassroom;

  // Existing codes and names set for duplicate checks
  const existingCodes = useMemo(
    () => new Set(existingStudents.map((s) => s.student_code?.trim())),
    [existingStudents]
  );
  const existingNames = useMemo(
    () => new Set(existingStudents.map((s) => s.name?.trim().toLowerCase())),
    [existingStudents]
  );

  // Core smart parsing engine
  const parseRawText = (text: string) => {
    if (!text.trim()) {
      setParsedList([]);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const results: ParsedExtractedStudent[] = [];
    const maxExistingNo =
      importMode === 'append'
        ? existingStudents.reduce((acc, curr) => Math.max(acc, curr.student_no || 0), 0)
        : 0;

    let autoCounter = maxExistingNo + 1;

    // Header keywords to skip if enabled
    const headerKeywords = [
      'ลำดับ',
      'เลขที่',
      'เลขประจำตัว',
      'ชื่อ-สกุล',
      'ชื่อ - สกุล',
      'ชื่อ นามสกุล',
      'รหัสประจำตัว',
      'รหัส',
      'คำนำหน้า',
      'สัญชาติ',
      'ศาสนา',
      'วันเกิด',
      'เบอร์โทร',
      'student_name',
      'student_code',
      'citizen_id',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line looks like a header row
      if (
        skipHeaderRow &&
        i === 0 &&
        headerKeywords.some((kw) => line.toLowerCase().includes(kw))
      ) {
        continue;
      }

      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map((t) => t.trim()).filter((t) => t.length > 0);
      } else if (line.includes(',')) {
        tokens = line.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      } else {
        tokens = line.split(/\s{2,}|\s+/).map((t) => t.trim()).filter((t) => t.length > 0);
      }

      // 1. Clean tokens & filter out 13-digit ID cards, dates, phone numbers, noise
      const cleanedTokens: string[] = [];
      let detectedNo: number | null = null;
      let detectedCode: string | null = null;
      let detectedGender: 'ชาย' | 'หญิง' = 'ชาย';
      let detectedClassroomName: string | null = null;

      for (const t of tokens) {
        // Filter out 13-digit Citizen ID (e.g. 1509901234567 or 1-5099-01234-56-7)
        if (removeIdCard13Digits && (/^\d{13}$/.test(t) || /^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/.test(t))) {
          continue;
        }

        // Filter out phone numbers (e.g. 081-234-5678, 0812345678)
        if (removeDatesAndPhones && (/^0[689]\d{8}$/.test(t) || /^0[689]\d{1}-\d{3}-\d{4}$/.test(t))) {
          continue;
        }

        // Filter out dates (e.g. 12/04/2557, 12-04-2014)
        if (removeDatesAndPhones && (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(t))) {
          continue;
        }

        // Filter out noise status words
        if (
          removeNoiseWords &&
          ['ปกติ', 'ย้ายเข้า', 'ย้ายออก', 'จำหน่าย', 'พักการเรียน', 'ไทย', 'พุทธ', 'คริสต์', 'อิสลาม', '-', '—'].includes(
            t
          )
        ) {
          continue;
        }

        // Detect Classroom (e.g. ป.5/1, ป.6/2, 5/1, room-p5-1)
        if (
          /^ป\.\d\/\d$/i.test(t) ||
          /^ม\.\d\/\d$/i.test(t) ||
          /^\d\/\d$/.test(t) ||
          t.startsWith('ห้อง')
        ) {
          detectedClassroomName = t.replace('ห้อง', '').trim();
          continue;
        }

        // Detect explicit gender column
        if (t === 'ชาย' || t === 'ช' || t === 'boy' || t === 'male') {
          detectedGender = 'ชาย';
          continue;
        }
        if (t === 'หญิง' || t === 'ญ' || t === 'girl' || t === 'female') {
          detectedGender = 'หญิง';
          continue;
        }

        // Detect Sequence No. (1-2 digits at the start)
        if (
          autoDetectNo &&
          detectedNo === null &&
          cleanedTokens.length === 0 &&
          /^\d{1,2}\.?$/.test(t)
        ) {
          detectedNo = parseInt(t.replace('.', ''), 10);
          continue;
        }

        // Detect Student Code (4 to 6 digits, e.g. 50101, 12345)
        if (
          autoDetectCode &&
          detectedCode === null &&
          /^\d{4,6}$/.test(t) &&
          parseInt(t, 10) > 100
        ) {
          detectedCode = t;
          continue;
        }

        cleanedTokens.push(t);
      }

      // Reconstruct student name from remaining tokens
      let rawFullName = cleanedTokens.join(' ').trim();

      // Clean up punctuation prefix if e.g. "1. ด.ช.กฤษณะ"
      rawFullName = rawFullName.replace(/^\d+[\.\)\-]\s*/, '').trim();

      if (!rawFullName) {
        // Fallback check if full line has a Thai name
        const matchThai = line.match(
          /(?:เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|น\.ส\.)?\s*([ก-๙]+)\s+([ก-๙]+)/
        );
        if (matchThai) {
          rawFullName = matchThai[0].trim();
        } else {
          continue;
        }
      }

      // Gender detection from name prefix
      if (autoDetectGender) {
        if (
          rawFullName.startsWith('เด็กหญิง') ||
          rawFullName.startsWith('ด.ญ.') ||
          rawFullName.startsWith('ด.ญ') ||
          rawFullName.startsWith('นางสาว') ||
          rawFullName.startsWith('น.ส.')
        ) {
          detectedGender = 'หญิง';
        } else if (
          rawFullName.startsWith('เด็กชาย') ||
          rawFullName.startsWith('ด.ช.') ||
          rawFullName.startsWith('ด.ช') ||
          rawFullName.startsWith('นาย')
        ) {
          detectedGender = 'ชาย';
        }
      }

      // Format name nicely
      let formattedName = rawFullName;
      if (keepPrefixInName) {
        // Standardize short prefix if desired
        if (formattedName.startsWith('ด.ช.') || formattedName.startsWith('ด.ช ')) {
          formattedName = formattedName.replace(/^ด\.ช\.?\s*/, 'เด็กชาย');
        } else if (formattedName.startsWith('ด.ญ.') || formattedName.startsWith('ด.ญ ')) {
          formattedName = formattedName.replace(/^ด\.ญ\.?\s*/, 'เด็กหญิง');
        } else if (formattedName.startsWith('น.ส.') || formattedName.startsWith('น.ส ')) {
          formattedName = formattedName.replace(/^น\.ส\.?\s*/, 'นางสาว');
        }
      }

      // Determine final student no
      const finalNo = detectedNo !== null && detectedNo > 0 ? detectedNo : autoCounter;
      autoCounter++;

      // Determine final student code
      const finalCode =
        detectedCode ||
        `${parseInt(targetClassroom.academic_year || '2569') % 100}${
          targetClassroom.name.includes('6') ? '6' : '5'
        }${String(finalNo).padStart(2, '0')}`;

      // Check conflict
      let hasConflict = false;
      let conflictReason = '';
      if (existingCodes.has(finalCode)) {
        hasConflict = true;
        conflictReason = `รหัสประจำตัว ${finalCode} ซ้ำกับนักเรียนเดิม`;
      } else if (existingNames.has(formattedName.toLowerCase())) {
        hasConflict = true;
        conflictReason = `ชื่อ ${formattedName} ซ้ำกับนักเรียนที่มีอยู่แล้ว`;
      }

      results.push({
        id: `parsed-${i}-${Date.now()}`,
        selected: true,
        student_no: finalNo,
        name: formattedName,
        student_code: finalCode,
        gender: detectedGender,
        classroom_id: targetClassroom.id,
        classroom: detectedClassroomName || targetClassroom.name,
        rawLine: line,
        hasConflict,
        conflictReason,
      });
    }

    setParsedList(results);
  };

  // Re-run parser when toggles change
  useEffect(() => {
    if (rawInputText) {
      parseRawText(rawInputText);
    }
  }, [
    rawInputText,
    autoDetectNo,
    autoDetectCode,
    autoDetectGender,
    removeIdCard13Digits,
    removeDatesAndPhones,
    removeNoiseWords,
    keepPrefixInName,
    skipHeaderRow,
    targetClassroomId,
    importMode,
  ]);

  // Load sample text
  const handleLoadSample = (sample: { title: string; text: string }) => {
    setRawInputText(sample.text);
  };

  // Toggle single row selection
  const handleToggleSelect = (id: string) => {
    setParsedList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Toggle all rows selection
  const handleToggleSelectAll = (select: boolean) => {
    setParsedList((prev) =>
      prev.map((item) => ({ ...item, selected: select }))
    );
  };

  // Update row field in preview
  const handleUpdateField = (
    id: string,
    field: keyof ParsedExtractedStudent,
    value: any
  ) => {
    setParsedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Delete row from preview
  const handleDeleteRow = (id: string) => {
    setParsedList((prev) => prev.filter((item) => item.id !== id));
  };

  // Filtered preview
  const filteredPreview = useMemo(() => {
    if (!previewSearch.trim()) return parsedList;
    const q = previewSearch.toLowerCase();
    return parsedList.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.student_code.includes(q) ||
        item.student_no.toString().includes(q)
    );
  }, [parsedList, previewSearch]);

  const selectedCount = parsedList.filter((p) => p.selected).length;

  // Apply batch import to storage
  const handleApplyImport = () => {
    const toImport = parsedList.filter((p) => p.selected);
    if (toImport.length === 0) return;

    if (importMode === 'overwrite') {
      if (
        !window.confirm(
          `คุณเลือกโหมด "แทนที่รายชื่อเดิมทั้งหมดในห้อง ${targetClassroom.name}" ต้องการดำเนินการต่อหรือไม่?`
        )
      ) {
        return;
      }
      // Remove students in this classroom first
      const allCurrent = storage.getAllStudents().filter(
        (s) => s.classroom_id !== targetClassroom.id && s.classroom !== targetClassroom.name
      );
      storage.saveStudents(allCurrent);
    }

    toImport.forEach((item) => {
      storage.addStudent({
        student_no: Number(item.student_no),
        name: item.name.trim(),
        student_code: item.student_code.trim(),
        classroom_id: targetClassroom.id,
        classroom: targetClassroom.name,
        gender: item.gender,
      });
    });

    setIsSuccess(true);
    onStudentsImported();

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>ระบบวางข้อมูลนักเรียนอัจฉริยะ (Smart Paste & Filter)</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  AI-Assisted Extractor
                </span>
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                วางข้อมูลดิบที่มีข้อมูลอื่นปนมา (เช่น เลข 13 หลัก, วันเกิด, เบอร์โทร) ระบบจะกรองและคัดเอาเฉพาะข้อมูลที่ต้องการให้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Target Classroom & Import Mode Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>นำเข้าสู่นักเรียนห้องเรียน</span>
              </label>
              <select
                value={targetClassroomId}
                onChange={(e) => setTargetClassroomId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    ห้อง {c.name} ({c.level}) - {c.homeroom_teacher || 'ครูประจำชั้น'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-600" />
                <span>รูปแบบการนำเข้า</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    importMode === 'append'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ➕ เพิ่มต่อท้ายรายชื่อเดิม
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('overwrite')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    importMode === 'overwrite'
                      ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🔄 แทนที่รายชื่อทั้งหมด
                </button>
              </div>
            </div>
          </div>

          {/* Raw Text Input Area with Quick Sample buttons */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>กล่องวางข้อความดิบ (Raw Text / Table from Excel, SGS, DMC, Word)</span>
              </label>

              {/* Sample loader buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  ลองทดสอบ:
                </span>
                {SAMPLE_RAW_TEXTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  >
                    {idx === 0 ? '📊 DMC/SGS' : idx === 1 ? '📗 Excel' : '💬 แชท LINE'}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={5}
              value={rawInputText}
              onChange={(e) => setRawInputText(e.target.value)}
              placeholder="วางข้อมูลนักเรียนที่คัดลอกมาได้ที่นี่ทันที (ไม่จำเป็นต้องจัดระเบียบตารางล่วงหน้า)...&#10;ตัวอย่าง:&#10;1	1509901234567	50101	เด็กชายกฤษณะ พงษ์ศิริ	ป.5/1	12/04/2557	0812345678&#10;2	1509902345678	50102	เด็กหญิงกัญญาณัฐ สุขใจ	ป.5/1	25/08/2557	0898765432"
              className="w-full p-3.5 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Smart Extractors & Cleaning Filters Grid */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>ตัวกรองคัดแยกข้อมูลและล้างข้อมูลส่วนเกิน (Smart Cleaning Filters)</span>
              </span>
              <span className="text-xs text-slate-400">
                เปิด/ปิดตัวกรองตามความต้องการ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Filter 1: 13-digit ID card */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  removeIdCard13Digits
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={removeIdCard13Digits}
                  onChange={(e) => setRemoveIdCard13Digits(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold">ตัดเลข 13 หลัก</div>
                  <div className="text-[11px] opacity-75">
                    ลบเลขบัตรประชาชนที่ไม่ต้องการออก
                  </div>
                </div>
              </label>

              {/* Filter 2: Dates and Phone numbers */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  removeDatesAndPhones
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={removeDatesAndPhones}
                  onChange={(e) => setRemoveDatesAndPhones(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold">ตัดวันเกิดและเบอร์โทร</div>
                  <div className="text-[11px] opacity-75">
                    ลบวันที่เกิดและเบอร์โทรศัพท์
                  </div>
                </div>
              </label>

              {/* Filter 3: Detect Gender */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  autoDetectGender
                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={autoDetectGender}
                  onChange={(e) => setAutoDetectGender(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold">แยกเพศอัตโนมัติ</div>
                  <div className="text-[11px] opacity-75">
                    ตรวจจับ ด.ช./ด.ญ./นาย/น.ส.
                  </div>
                </div>
              </label>

              {/* Filter 4: Skip Header */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  skipHeaderRow
                    ? 'bg-sky-50/70 border-sky-300 text-sky-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={skipHeaderRow}
                  onChange={(e) => setSkipHeaderRow(e.target.checked)}
                  className="mt-0.5 accent-sky-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold">ข้ามบรรทัดหัวตาราง</div>
                  <div className="text-[11px] opacity-75">
                    ตรวจจับคำว่า "ลำดับ/ชื่อ-สกุล"
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Live Extracted Preview Table */}
          {parsedList.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>
                      ผลการคัดกรองข้อมูล (พบ {parsedList.length} คน • เลือกแล้ว {selectedCount} คน)
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    เลือกทั้งหมด
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === parsedList.length}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="accent-indigo-600 rounded"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-14 text-center">เลขที่</th>
                      <th className="py-2.5 px-3">ชื่อ - นามสกุล (คัดกรองแล้ว)</th>
                      <th className="py-2.5 px-3 text-center w-28">เลขประจำตัว</th>
                      <th className="py-2.5 px-3 text-center w-20">เพศ</th>
                      <th className="py-2.5 px-3 text-center w-24">ห้อง</th>
                      <th className="py-2.5 px-3 text-center w-16">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 ${
                          !item.selected ? 'opacity-40 bg-slate-50/50' : ''
                        } ${item.hasConflict ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="accent-indigo-600 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={item.student_no}
                            onChange={(e) =>
                              handleUpdateField(item.id, 'student_no', Number(e.target.value))
                            }
                            className="w-12 text-center py-1 bg-white border border-slate-300 rounded font-bold font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="space-y-0.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateField(item.id, 'name', e.target.value)
                              }
                              className="w-full py-1 px-2 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                            />
                            {item.hasConflict && (
                              <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {item.conflictReason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            value={item.student_code}
                            onChange={(e) =>
                              handleUpdateField(item.id, 'student_code', e.target.value)
                            }
                            className="w-20 text-center py-1 bg-white border border-slate-300 rounded font-mono font-bold text-indigo-700"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={item.gender}
                            onChange={(e) =>
                              handleUpdateField(item.id, 'gender', e.target.value)
                            }
                            className="py-1 px-1.5 bg-white border border-slate-300 rounded font-medium text-[11px]"
                          >
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold text-[11px] border border-indigo-100">
                            {item.classroom}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              ระบบจะสร้างรายชื่อนักเรียนและจัดห้องเรียนให้อัตโนมัติ พร้อมสำหรับการกรอกคะแนนทันที
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleApplyImport}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                นำเข้ารายชื่อที่เลือก ({selectedCount} คน)
              </span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {isSuccess && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-70 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-bold">
              นำเข้ารายชื่อนักเรียน {selectedCount} คน เรียบร้อยแล้ว!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
