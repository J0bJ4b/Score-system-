import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
  ScoreStatus,
} from '../types';
import { storage } from '../services/storage';
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  RotateCcw,
  Zap,
  Keyboard,
  HelpCircle,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface QuickScoreTextEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  term: Term;
  students: Student[];
  scoreItems: ScoreItem[];
  currentScores: Score[];
  defaultItemId?: string;
  classroomName?: string;
  onScoresSaved: () => void;
  onAutoSaveStatusChange?: (status: 'saving' | 'saved', timeStr?: string) => void;
}

interface ParsedScoreRow {
  studentId: string;
  studentNo: number;
  studentCode: string;
  studentName: string;
  itemValues: Record<
    string,
    {
      score: number | null;
      status: ScoreStatus;
      rawText: string;
      isValid: boolean;
      errorMessage?: string;
    }
  >;
  matched: boolean;
  unmatchedIdentifier?: string;
}

export const QuickScoreTextEntryModal: React.FC<QuickScoreTextEntryModalProps> = ({
  isOpen,
  onClose,
  subject,
  term,
  students,
  scoreItems,
  currentScores,
  defaultItemId,
  classroomName = 'ป.5',
  onScoresSaved,
  onAutoSaveStatusChange,
}) => {
  // Mode: 'single' (one specific column/item) or 'matrix' (all items in subject)
  const [entryMode, setEntryMode] = useState<'single' | 'matrix'>('single');
  const [selectedItemId, setSelectedItemId] = useState<string>(
    defaultItemId && scoreItems.some((i) => i.id === defaultItemId)
      ? defaultItemId
      : scoreItems[0]?.id || ''
  );

  const [textInput, setTextInput] = useState('');
  const [overwriteMode, setOverwriteMode] = useState<'all' | 'merge'>('all');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync selected item when modal opens or defaultItemId changes
  useEffect(() => {
    if (defaultItemId && scoreItems.some((i) => i.id === defaultItemId)) {
      setSelectedItemId(defaultItemId);
    } else if (scoreItems.length > 0 && (!selectedItemId || !scoreItems.some((i) => i.id === selectedItemId))) {
      setSelectedItemId(scoreItems[0].id);
    }
  }, [defaultItemId, scoreItems, isOpen]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const activeItem = scoreItems.find((i) => i.id === selectedItemId) || scoreItems[0];

  // Helper to parse a single text token into score + status
  const parseTokenValue = (
    rawToken: string,
    maxScore: number
  ): { score: number | null; status: ScoreStatus; isValid: boolean; errorMessage?: string } => {
    const clean = rawToken.trim().toLowerCase();

    if (clean === '' || clean === '-' || clean === 'null') {
      return { score: null, status: 'normal', isValid: true };
    }

    if (clean === 'ร' || clean === 'ขาด' || clean === 'ขาดสอบ' || clean === 'absent' || clean === 'a') {
      return { score: null, status: 'absent', isValid: true };
    }

    if (clean === 'มส' || clean === 'ไม่ส่ง' || clean === 'ไม่ส่งงาน' || clean === 'missing' || clean === 'm') {
      return { score: null, status: 'missing', isValid: true };
    }

    const num = parseFloat(clean);
    if (isNaN(num)) {
      return {
        score: null,
        status: 'normal',
        isValid: false,
        errorMessage: `ไม่ใช่ตัวเลขคะแนนที่ถูกต้อง ("${rawToken}")`,
      };
    }

    if (num < 0) {
      return {
        score: null,
        status: 'normal',
        isValid: false,
        errorMessage: 'คะแนนต้องไม่ติดลบ',
      };
    }

    if (num > maxScore) {
      return {
        score: num,
        status: 'normal',
        isValid: false,
        errorMessage: `คะแนน (${num}) เกินคะแนนเต็ม (${maxScore})`,
      };
    }

    return { score: num, status: 'normal', isValid: true };
  };

  // Map students by student_no, student_code, and order index for flexible matching
  const studentMapByNo = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.student_no, s));
    return map;
  }, [students]);

  const studentMapByCode = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.student_code.toLowerCase(), s));
    return map;
  }, [students]);

  // Live Parsing of Text Input
  const parsedResult = useMemo(() => {
    if (!textInput.trim()) {
      return { rows: [], validCount: 0, errorCount: 0, absentCount: 0, missingCount: 0 };
    }

    const lines = textInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    if (lines.length === 0) {
      return { rows: [], validCount: 0, errorCount: 0, absentCount: 0, missingCount: 0 };
    }

    let rows: ParsedScoreRow[] = [];
    let validCount = 0;
    let errorCount = 0;
    let absentCount = 0;
    let missingCount = 0;

    if (entryMode === 'single') {
      if (!activeItem) return { rows: [], validCount: 0, errorCount: 0, absentCount: 0, missingCount: 0 };

      // Check if format contains delimiter (comma, tab, semicolon, colon)
      const hasDelimiter = lines.some((l) => /[,;\t:]/.test(l));

      if (hasDelimiter) {
        // Format: [student_no or code], [score]
        lines.forEach((line) => {
          // Ignore header line if detected
          if (line.includes('เลขที่') || line.includes('คะแนน') || line.includes('รหัส')) {
            return;
          }

          const parts = line.split(/[,;\t:]/).map((p) => p.trim());
          if (parts.length === 0) return;

          const identifier = parts[0];
          const rawScoreStr = parts[1] !== undefined ? parts[1] : '';

          let matchedStudent: Student | undefined;
          const parsedNo = parseInt(identifier, 10);
          if (!isNaN(parsedNo) && studentMapByNo.has(parsedNo)) {
            matchedStudent = studentMapByNo.get(parsedNo);
          } else if (studentMapByCode.has(identifier.toLowerCase())) {
            matchedStudent = studentMapByCode.get(identifier.toLowerCase());
          }

          if (matchedStudent) {
            const parsedVal = parseTokenValue(rawScoreStr, activeItem.max_score);
            if (!parsedVal.isValid) errorCount++;
            else validCount++;

            if (parsedVal.status === 'absent') absentCount++;
            if (parsedVal.status === 'missing') missingCount++;

            rows.push({
              studentId: matchedStudent.id,
              studentNo: matchedStudent.student_no,
              studentCode: matchedStudent.student_code,
              studentName: matchedStudent.name,
              matched: true,
              itemValues: {
                [activeItem.id]: {
                  ...parsedVal,
                  rawText: rawScoreStr,
                },
              },
            });
          } else {
            errorCount++;
            rows.push({
              studentId: `unmatched-${identifier}`,
              studentNo: !isNaN(parsedNo) ? parsedNo : 0,
              studentCode: identifier,
              studentName: 'ไม่พบนักเรียนในห้องนี้',
              matched: false,
              unmatchedIdentifier: identifier,
              itemValues: {
                [activeItem.id]: {
                  score: null,
                  status: 'normal',
                  rawText: rawScoreStr,
                  isValid: false,
                  errorMessage: `ไม่พบเลขที่หรือรหัส "${identifier}" ในห้อง ${classroomName}`,
                },
              },
            });
          }
        });
      } else {
        // Sequential line-by-line format: Line 1 = Student 1, Line 2 = Student 2...
        lines.forEach((line, idx) => {
          if (line.includes('เลขที่') || line.includes('คะแนน')) return;

          const targetStudent = students[idx];
          if (targetStudent) {
            const parsedVal = parseTokenValue(line, activeItem.max_score);
            if (!parsedVal.isValid) errorCount++;
            else validCount++;

            if (parsedVal.status === 'absent') absentCount++;
            if (parsedVal.status === 'missing') missingCount++;

            rows.push({
              studentId: targetStudent.id,
              studentNo: targetStudent.student_no,
              studentCode: targetStudent.student_code,
              studentName: targetStudent.name,
              matched: true,
              itemValues: {
                [activeItem.id]: {
                  ...parsedVal,
                  rawText: line,
                },
              },
            });
          }
        });
      }
    } else {
      // Matrix Mode (All Items)
      let headerItemMap: ScoreItem[] = [...scoreItems];
      let startIndex = 0;

      // Check if first row is a header
      const firstLineParts = lines[0].split(/[,;\t]/).map((p) => p.trim());
      const isHeader =
        firstLineParts.some((p) => p.includes('เลขที่') || p.includes('รหัส') || p.includes('ชื่อ')) ||
        scoreItems.some((it) => firstLineParts.some((p) => p.includes(it.name)));

      if (isHeader) {
        startIndex = 1;
        // Try to match headers to scoreItems
        const customMap: ScoreItem[] = [];
        firstLineParts.slice(1).forEach((headerCol) => {
          const matchedItem = scoreItems.find(
            (it) => it.name.toLowerCase() === headerCol.toLowerCase() || headerCol.includes(it.name)
          );
          if (matchedItem) customMap.push(matchedItem);
        });
        if (customMap.length > 0) {
          headerItemMap = customMap;
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length === 0) continue;

        const identifier = parts[0];
        let matchedStudent: Student | undefined;
        const parsedNo = parseInt(identifier, 10);

        if (!isNaN(parsedNo) && studentMapByNo.has(parsedNo)) {
          matchedStudent = studentMapByNo.get(parsedNo);
        } else if (studentMapByCode.has(identifier.toLowerCase())) {
          matchedStudent = studentMapByCode.get(identifier.toLowerCase());
        } else if (students[i - startIndex]) {
          // Fallback to sequential index
          matchedStudent = students[i - startIndex];
        }

        if (matchedStudent) {
          const itemValues: ParsedScoreRow['itemValues'] = {};
          let rowHasError = false;

          headerItemMap.forEach((it, colIdx) => {
            const rawCol = parts[colIdx + 1] !== undefined ? parts[colIdx + 1] : '';
            const parsedVal = parseTokenValue(rawCol, it.max_score);
            itemValues[it.id] = {
              ...parsedVal,
              rawText: rawCol,
            };
            if (!parsedVal.isValid) rowHasError = true;
            if (parsedVal.status === 'absent') absentCount++;
            if (parsedVal.status === 'missing') missingCount++;
          });

          if (rowHasError) errorCount++;
          else validCount++;

          rows.push({
            studentId: matchedStudent.id,
            studentNo: matchedStudent.student_no,
            studentCode: matchedStudent.student_code,
            studentName: matchedStudent.name,
            matched: true,
            itemValues,
          });
        }
      }
    }

    return {
      rows,
      validCount,
      errorCount,
      absentCount,
      missingCount,
    };
  }, [
    textInput,
    entryMode,
    activeItem,
    students,
    scoreItems,
    studentMapByNo,
    studentMapByCode,
    classroomName,
  ]);

  // Load Current Scores into textarea
  const handleLoadCurrentScores = () => {
    if (entryMode === 'single') {
      if (!activeItem) return;
      const lines = students.map((stu) => {
        const found = currentScores.find(
          (s) => s.student_id === stu.id && s.score_item_id === activeItem.id
        );
        let valStr = '';
        if (found) {
          if (found.status === 'absent') valStr = 'ร';
          else if (found.status === 'missing') valStr = 'มส';
          else if (found.score !== null) valStr = found.score.toString();
        }
        return `${stu.student_no}, ${valStr}`;
      });
      setTextInput(`# รูปแบบ: เลขที่, คะแนน (${activeItem.name} เต็ม ${activeItem.max_score} คะแนน)\n` + lines.join('\n'));
    } else {
      const header = ['เลขที่', ...scoreItems.map((it) => it.name)].join(', ');
      const rows = students.map((stu) => {
        const rowVals = scoreItems.map((it) => {
          const found = currentScores.find(
            (s) => s.student_id === stu.id && s.score_item_id === it.id
          );
          if (found) {
            if (found.status === 'absent') return 'ร';
            if (found.status === 'missing') return 'มส';
            if (found.score !== null) return found.score.toString();
          }
          return '';
        });
        return [stu.student_no, ...rowVals].join(', ');
      });
      setTextInput(`# ตารางคะแนนรวมวิชา ${subject.name} (${term.name})\n` + [header, ...rows].join('\n'));
    }
  };

  // Copy empty CSV template
  const handleCopyTemplate = () => {
    let tpl = '';
    if (entryMode === 'single') {
      if (!activeItem) return;
      const lines = students.map((s) => `${s.student_no}, `);
      tpl = `# เลขที่, คะแนน (${activeItem.name} เต็ม ${activeItem.max_score})\n` + lines.join('\n');
    } else {
      const header = ['เลขที่', ...scoreItems.map((it) => it.name)].join(', ');
      const lines = students.map((s) => [s.student_no, ...scoreItems.map(() => '')].join(', '));
      tpl = [header, ...lines].join('\n');
    }

    navigator.clipboard.writeText(tpl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Batch Update Records to Storage
  const handleBatchUpdate = () => {
    if (parsedResult.rows.length === 0) {
      alert('กรุณากรอกข้อมูลคะแนนก่อนกดบันทึก');
      return;
    }

    if (parsedResult.errorCount > 0) {
      const confirmProceed = window.confirm(
        `พบข้อผิดพลาดในข้อมูล ${parsedResult.errorCount} รายการ (เช่น คะแนนเกินเต็มหรือไม่พบนักเรียน)\nต้องการบันทึกเฉพาะรายการที่ถูกต้องและข้ามรายการที่มีปัญหาหรือไม่?`
      );
      if (!confirmProceed) return;
    }

    const updates: Array<Omit<Score, 'id'>> = [];

    parsedResult.rows.forEach((row) => {
      if (!row.matched) return;

      Object.entries(row.itemValues).forEach(([itemId, val]) => {
        if (!val.isValid) return;

        // In merge mode, skip blank inputs
        if (overwriteMode === 'merge' && val.rawText === '') return;

        updates.push({
          student_id: row.studentId,
          score_item_id: itemId,
          score: val.score,
          status: val.status,
          note: '',
        });
      });
    });

    if (updates.length === 0) {
      alert('ไม่มีข้อมูลคะแนนที่ถูกต้องสำหรับบันทึก');
      return;
    }

    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores(updates);

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    onAutoSaveStatusChange?.('saved', timeStr);
    onScoresSaved();

    setSuccessToast(`บันทึกคะแนนเรียบร้อยแล้ว ${updates.length} รายการ (${parsedResult.validCount} คน)`);
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 1200);
  };

  // Handle Ctrl+Enter shortcut in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleBatchUpdate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  กรอกคะแนนแบบข้อความรวดเร็ว (Fast CSV/Text Entry)
                </h2>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-2xs">
                  แปะครั้งเดียวได้ทั้งห้อง
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                วิชา{subject.name} ({subject.code}) • {term.name} • ห้อง {classroomName} • {students.length} คน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Mode Selector */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">รูปแบบการกรอก:</span>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEntryMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  entryMode === 'single'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>เฉพาะรายการ (Single Item)</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  entryMode === 'matrix'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>รวมทุกรายการ (All Items Matrix)</span>
              </button>
            </div>
          </div>

          {/* If Single Item Mode: Select Item Dropdown */}
          {entryMode === 'single' && (
            <div className="flex items-center gap-2">
              <label htmlFor="quick-item-select" className="text-xs font-bold text-slate-600">
                เลือกคอลัมน์คะแนน:
              </label>
              <select
                id="quick-item-select"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-indigo-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                {scoreItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (เต็ม {item.max_score} คะแนน)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Action Helpers */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadCurrentScores}
              className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="ดึงคะแนนของนักเรียนทุกคนปัจจุบันมาใส่ในช่องพิมพ์ เพื่อแก้ไขได้อย่างรวดเร็ว"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              <span>ดึงคะแนนปัจจุบัน</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTemplate}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="คัดลอกรูปแบบแม่แบบข้อความสำหรับนำไปวางใน Excel หรือแก้ไข"
            >
              {copyFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>คัดลอกแม่แบบ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTextInput('')}
              className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="ล้างข้อความทั้งหมด"
            >
              ล้างช่องพิมพ์
            </button>
          </div>
        </div>

        {/* Modal Body: Split 2 columns (Textarea + Live Validation Preview) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Textarea input */}
          <div className="lg:col-span-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="quick-score-textarea" className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-indigo-600" />
                <span>วางหรือพิมพ์คะแนนที่นี่ (Text Area)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                กด <strong>Ctrl + Enter</strong> เพื่อบันทึกทันที
              </span>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                id="quick-score-textarea"
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={14}
                placeholder={
                  entryMode === 'single'
                    ? `# รูปแบบที่ 1: ใส่คะแนนเรียงตามเลขที่ 1 บรรทัดต่อ 1 คน (คัดลอกจาก Excel มาแปะได้เลย)\n10\n9.5\n8\nร\nมส\n\n# หรือรูปแบบที่ 2: เลขที่, คะแนน\n1, 10\n2, 9.5\n3, 8\n4, ร`
                    : `# รูปแบบรวมทุกรายการ (คัดลอกจาก Excel วางได้ทันที):\nเลขที่, ใบงานที่ 1, ใบงานที่ 2, สอบกลางภาค, สอบปลายภาค\n1, 10, 9, 8, 10\n2, 8.5, 9, 7, 9`
                }
                className="w-full flex-1 p-3.5 font-mono text-xs sm:text-sm bg-slate-900 text-emerald-400 placeholder:text-slate-500 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner leading-relaxed resize-none selection:bg-indigo-600 selection:text-white"
              />
            </div>

            {/* Quick Helper Tips */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>คำแนะนำสัญลักษณ์สถานะพิเศษ:</span>
              </div>
              <div className="flex flex-wrap gap-2 text-slate-500 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <strong className="text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-mono">ร</strong> = ติด ร (ขาดสอบ)
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <strong className="text-rose-700 bg-rose-100 px-1 py-0.2 rounded font-mono">มส</strong> = ติด มส (ไม่ส่งงาน)
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <strong className="text-slate-700 bg-slate-200 px-1 py-0.2 rounded font-mono">-</strong> = ยังไม่ระบุ
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Validation & Preview Table */}
          <div className="lg:col-span-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  ตัวอย่างผลการตรวจสอบแบบเรียลไทม์ (Live Preview)
                </span>
                {parsedResult.rows.length > 0 && (
                  <span className="text-[11px] px-2 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-800">
                    พบ {parsedResult.rows.length} คน
                  </span>
                )}
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-1.5 text-[11px]">
                {parsedResult.validCount > 0 && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    พร้อมบันทึก: {parsedResult.validCount}
                  </span>
                )}
                {parsedResult.errorCount > 0 && (
                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 animate-pulse">
                    มีข้อผิดพลาด: {parsedResult.errorCount}
                  </span>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white shadow-2xs">
              <div className="overflow-x-auto overflow-y-auto max-h-[380px] flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 shadow-2xs z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">เลขที่</th>
                      <th className="py-2.5 px-3">ชื่อ - นามสกุล</th>
                      {entryMode === 'single' ? (
                        <th className="py-2.5 px-3 text-center">
                          คะแนนที่ได้ (เต็ม {activeItem?.max_score})
                        </th>
                      ) : (
                        scoreItems.map((it) => (
                          <th key={it.id} className="py-2.5 px-2 text-center whitespace-nowrap">
                            {it.name} ({it.max_score})
                          </th>
                        ))
                      )}
                      <th className="py-2.5 px-3 text-center w-28">สถานะการตรวจ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {parsedResult.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={entryMode === 'single' ? 4 : scoreItems.length + 3}
                          className="py-12 text-center text-slate-400"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Sparkles className="w-7 h-7 text-indigo-300" />
                            <p className="font-semibold text-xs">ยังไม่มีข้อมูลในช่องพิมพ์</p>
                            <p className="text-[11px] text-slate-400">
                              วางข้อความคะแนนทางฝั่งซ้ายเพื่อดูผลการแปลงและตรวจสอบความถูกต้องที่นี่
                            </p>
                            <button
                              type="button"
                              onClick={handleLoadCurrentScores}
                              className="mt-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                            >
                              ดึงคะแนนปัจจุบันมาลองดู
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      parsedResult.rows.map((row, idx) => {
                        const singleVal = entryMode === 'single' && activeItem ? row.itemValues[activeItem.id] : null;
                        const hasRowError = !row.matched || Object.values(row.itemValues).some((v) => !v.isValid);

                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              hasRowError
                                ? 'bg-rose-50/60 text-rose-900'
                                : idx % 2 === 0
                                ? 'bg-white hover:bg-indigo-50/30'
                                : 'bg-slate-50/50 hover:bg-indigo-50/30'
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-bold text-slate-600">
                              {row.studentNo > 0 ? row.studentNo : '-'}
                            </td>
                            <td className="py-2 px-3 font-semibold">
                              <div className="truncate max-w-[140px] sm:max-w-[180px]">{row.studentName}</div>
                              {row.matched && (
                                <div className="text-[10px] text-slate-400 font-mono">{row.studentCode}</div>
                              )}
                            </td>

                            {/* Single mode value */}
                            {entryMode === 'single' && singleVal && (
                              <td className="py-2 px-3 text-center">
                                {singleVal.status === 'absent' ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    ร (ขาดสอบ)
                                  </span>
                                ) : singleVal.status === 'missing' ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    มส (ไม่ส่งงาน)
                                  </span>
                                ) : singleVal.score !== null ? (
                                  <span
                                    className={`font-mono text-sm font-bold ${
                                      !singleVal.isValid ? 'text-rose-600 font-extrabold' : 'text-indigo-900'
                                    }`}
                                  >
                                    {singleVal.score}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            )}

                            {/* Matrix mode values */}
                            {entryMode === 'matrix' &&
                              scoreItems.map((it) => {
                                const itVal = row.itemValues[it.id];
                                if (!itVal) return <td key={it.id} className="text-center text-slate-300">-</td>;

                                return (
                                  <td key={it.id} className="py-2 px-2 text-center font-mono">
                                    {itVal.status === 'absent' ? (
                                      <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 text-[10px]">
                                        ร
                                      </span>
                                    ) : itVal.status === 'missing' ? (
                                      <span className="px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-800 text-[10px]">
                                        มส
                                      </span>
                                    ) : itVal.score !== null ? (
                                      <span className={`font-bold ${!itVal.isValid ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {itVal.score}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                );
                              })}

                            {/* Status label */}
                            <td className="py-2 px-3 text-center">
                              {!row.matched ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                  <AlertCircle className="w-3.5 h-3.5" /> ไม่พบรหัส
                                </span>
                              ) : hasRowError ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600"
                                  title={
                                    singleVal?.errorMessage ||
                                    Object.values(row.itemValues).find((v) => !v.isValid)?.errorMessage
                                  }
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> คะแนนผิด
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> พร้อมบันทึก
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom live stats banner */}
              <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  นักเรียนทั้งหมดในห้อง: <strong>{students.length} คน</strong>
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>ขาดสอบ: <strong className="text-amber-700 font-mono">{parsedResult.absentCount}</strong></span>
                  <span>ไม่ส่งงาน: <strong className="text-rose-700 font-mono">{parsedResult.missingCount}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-6 mb-2 p-3 bg-emerald-600 text-white rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-lg animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="overwriteMode"
                checked={overwriteMode === 'all'}
                onChange={() => setOverwriteMode('all')}
                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>บันทึกทับทั้งหมด (Overwrite)</span>
            </label>

            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="overwriteMode"
                checked={overwriteMode === 'merge'}
                onChange={() => setOverwriteMode('merge')}
                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>บันทึกทับเฉพาะช่องที่มีคะแนน (Merge/Skip blank)</span>
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleBatchUpdate}
              disabled={parsedResult.validCount === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                บันทึกคะแนนทั้งห้อง ({parsedResult.validCount} รายการ)
              </span>
              <span className="hidden sm:inline-block text-[10px] bg-indigo-500/80 px-1.5 py-0.5 rounded text-indigo-100 font-mono">
                Ctrl + Enter
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
