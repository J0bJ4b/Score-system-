import React, { useState, useMemo } from 'react';
import { Student, Subject, Term, ScoreItem, Score, ScoreStatus } from '../types';
import {
  exportSubjectScoresToCSV,
  downloadScoreTemplateCSV,
  exportAllScoresMatrixToCSV,
  parseScoreCSVText,
  ScoreImportResult,
} from '../utils/csvScoreHandler';
import { storage } from '../services/storage';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  HelpCircle,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';

interface ScoreCsvImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  terms: Term[];
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  currentSubject?: Subject;
  currentTerm?: Term;
  classroomName?: string;
  onScoresImported: () => void;
  defaultTab?: 'export' | 'import';
}

export const ScoreCsvImportExportModal: React.FC<ScoreCsvImportExportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  terms,
  students,
  allScoreItems,
  allScores,
  currentSubject,
  currentTerm,
  classroomName = 'ป.5',
  onScoresImported,
  defaultTab = 'export',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(defaultTab);

  // Selected filters for export & import
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    currentSubject?.id || subjects[0]?.id || ''
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(
    currentTerm?.id || terms[0]?.id || ''
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('all'); // 'all' or specific item ID

  // Import states
  const [csvRawText, setCsvRawText] = useState('');
  const [importResult, setImportResult] = useState<ScoreImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [overwriteOption, setOverwriteOption] = useState<'overwrite' | 'merge'>('overwrite');

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTerm = terms.find((t) => t.id === selectedTermId) || terms[0];

  const targetScoreItems = useMemo(() => {
    return allScoreItems.filter(
      (i) => i.subject_id === selectedSubjectId && i.term_id === selectedTermId
    );
  }, [allScoreItems, selectedSubjectId, selectedTermId]);

  if (!isOpen) return null;

  // Build draft score lookup for export
  const draftScoresMap = useMemo(() => {
    const map: Record<string, { score: number | null; status: ScoreStatus; note?: string }> = {};
    for (const s of allScores) {
      map[`${s.student_id}_${s.score_item_id}`] = {
        score: s.score,
        status: s.status,
        note: s.note,
      };
    }
    return map;
  }, [allScores]);

  // Handle Export Single Subject
  const handleExportSingleSubject = () => {
    exportSubjectScoresToCSV(
      students,
      activeSubject,
      activeTerm,
      allScoreItems,
      draftScoresMap,
      classroomName
    );
    setSuccessMessage(`ส่งออกคะแนนวิชา "${activeSubject.name}" (${activeTerm.name}) เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Handle Export Template
  const handleDownloadTemplate = () => {
    downloadScoreTemplateCSV(students, activeSubject, activeTerm, allScoreItems, classroomName);
    setSuccessMessage(`ดาวน์โหลดแบบฟอร์มเปล่าวิชา "${activeSubject.name}" เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Handle Export All Subjects
  const handleExportAllSubjects = () => {
    exportAllScoresMatrixToCSV(
      students,
      subjects,
      terms,
      allScoreItems,
      allScores,
      classroomName
    );
    setSuccessMessage(`ส่งออกคะแนนรวมทุกรายวิชา (${subjects.length} วิชา) สำเร็จแล้ว`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      parseCsv(content);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    setImportError('');
    try {
      const specificItem = selectedItemId !== 'all' ? selectedItemId : undefined;
      const res = parseScoreCSVText(text, targetScoreItems, students, specificItem);
      if (res.rows.length === 0) {
        setImportError('ไม่พบแถวข้อมูลคะแนนนักเรียนในไฟล์');
      }
      setImportResult(res);
    } catch (err: any) {
      setImportError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    }
  };

  // Apply Import to Database
  const handleApplyImport = () => {
    if (!importResult || importResult.rows.length === 0) return;

    const newScoresToSave: Array<{
      student_id: string;
      score_item_id: string;
      score: number | null;
      status: ScoreStatus;
    }> = [];

    importResult.rows.forEach((row) => {
      if (!row.matched) return;

      Object.entries(row.itemScores).forEach(([itemId, val]) => {
        if (!val.isValid) return;

        // If merge mode and raw score is empty, skip
        if (overwriteOption === 'merge' && val.rawInput === '') return;

        newScoresToSave.push({
          student_id: row.studentId,
          score_item_id: itemId,
          score: val.score,
          status: val.status,
        });
      });
    });

    if (newScoresToSave.length === 0) {
      alert('ไม่มีคะแนนที่ถูกต้องสำหรับบันทึก');
      return;
    }

    storage.batchUpsertScores(newScoresToSave);
    onScoresImported();
    setSuccessMessage(
      `นำเข้าคะแนนสำเร็จจำนวน ${newScoresToSave.length} รายการ สำหรับ ${importResult.matchedStudents} คน!`
    );
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                นำเข้าและส่งออกคะแนน (CSV / Excel)
              </h2>
              <p className="text-xs text-emerald-100">
                สำหรับห้อง {classroomName} • รองรับภาษาไทย UTF-8 100% เปิดใน Microsoft Excel ได้ถูกต้อง
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกคะแนน (Export CSV/Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าคะแนนจากไฟล์ (Import CSV)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Notification Banner */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* =========================================================================
              EXPORT TAB
              ========================================================================= */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Option Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลือกรายวิชาที่ต้องการส่งออก
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลือกภาคเรียน
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ปีการศึกษา {t.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Export Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Export Current Subject Scores */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">
                      ส่งออกคะแนนวิชา{activeSubject.name}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      รวมทุกรายการคะแนนใน{activeTerm.name} ({targetScoreItems.length} ช่องคะแนน) พร้อมรายชื่อนักเรียน {students.length} คน
                    </p>
                  </div>
                  <button
                    onClick={handleExportSingleSubject}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด CSV รายวิชา</span>
                  </button>
                </div>

                {/* 2. Download Blank Template */}
                <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">
                      แบบฟอร์มเปล่าสำหรับกรอก
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      มีรายชื่อนักเรียนและหัวตารางคะแนนครบถ้วน สามารถนำไปแจกครูผู้สอนกรอกใน Excel แล้วนำเข้ากลับมาได้
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด Template</span>
                  </button>
                </div>

                {/* 3. Export All Subjects Matrix */}
                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">
                      ส่งออกคะแนนรวมทุกวิชา
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      รวมคะแนนของทุกรายวิชา ({subjects.length} วิชา) ทั้งสองเทอม เหมาะสำหรับนำไปวิเคราะห์ข้อมูลภายนอก
                    </p>
                  </div>
                  <button
                    onClick={handleExportAllSubjects}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>ส่งออกทุกวิชา (Master CSV)</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  คำแนะนำสำหรับการเปิดไฟล์ใน Microsoft Excel:
                </div>
                <p className="leading-relaxed">
                  ไฟล์ CSV ของระบบได้รับการฝังรหัส <strong>UTF-8 with BOM</strong> ไว้ ทำให้สามารถดับเบิลคลิกเปิดบน Microsoft Excel (ทั้ง Windows และ Mac) ได้ทันทีโดยภาษาไทยไม่เพี้ยน
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              IMPORT TAB
              ========================================================================= */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Target Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. วิชาที่จะนำเข้าคะแนน *
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      if (csvRawText) parseCsv(csvRawText);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-indigo-900"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. ภาคเรียน *
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => {
                      setSelectedTermId(e.target.value);
                      if (csvRawText) parseCsv(csvRawText);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-indigo-900"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.academic_year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. ช่องคะแนนเป้าหมาย
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      if (csvRawText) parseCsv(csvRawText);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="all">ทุกช่องคะแนน (จับคู่ตามหัวตาราง)</option>
                    {targetScoreItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} (เต็ม {it.max_score})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Input & Paste Area */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5">
                      <Upload className="w-4 h-4" />
                      <span>เลือกไฟล์ CSV / TXT จากเครื่อง</span>
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-slate-400">หรือวางข้อความที่คัดลอกจาก Excel</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ดาวน์โหลดแบบฟอร์มนำเข้า
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder="วางข้อมูลคะแนนจาก Excel ได้ที่นี่ เช่น:&#10;เลขที่,เลขประจำตัว,ชื่อ-นามสกุล,ห้อง,ใบงานที่ 1,สอบกลางภาค&#10;1,50101,เด็กชายสมชาย หมายมั่น,ป.5/1,9.5,18&#10;2,50102,เด็กหญิงสมหญิง รักเรียน,ป.5/1,10,20"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Import Errors / Warnings */}
              {importError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Preview Table */}
              {importResult && importResult.rows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span>ตัวอย่างผลการตรวจสอบ ({importResult.rows.length} รายการ):</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                        จับคู่นักเรียนได้ {importResult.matchedStudents}/{importResult.totalStudents} คน
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="overwriteOption"
                          value="overwrite"
                          checked={overwriteOption === 'overwrite'}
                          onChange={() => setOverwriteOption('overwrite')}
                          className="text-indigo-600"
                        />
                        <span>เขียนทับทั้งหมด</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="overwriteOption"
                          value="merge"
                          checked={overwriteOption === 'merge'}
                          onChange={() => setOverwriteOption('merge')}
                          className="text-indigo-600"
                        />
                        <span>อัปเดตเฉพาะช่องใหม่</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-12">เลขที่</th>
                          <th className="py-2 px-2.5 w-24">รหัส</th>
                          <th className="py-2 px-3">ชื่อ - นามสกุล</th>
                          {targetScoreItems.map((it) => (
                            <th key={it.id} className="py-2 px-2 text-center">
                              {it.name} ({it.max_score})
                            </th>
                          ))}
                          <th className="py-2 px-2.5 text-center w-24">สถานะตรวจสอบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 ${
                              !row.matched ? 'bg-rose-50/40 text-rose-700' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-center font-bold text-slate-600">
                              {row.studentNo}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-500">
                              {row.studentCode}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">
                              {row.studentName}
                            </td>
                            {targetScoreItems.map((it) => {
                              const itemScore = row.itemScores[it.id];
                              const hasErr = itemScore && !itemScore.isValid;
                              return (
                                <td
                                  key={it.id}
                                  className={`py-1.5 px-2 text-center font-bold ${
                                    hasErr
                                      ? 'text-rose-600 bg-rose-50'
                                      : itemScore?.status === 'absent'
                                      ? 'text-amber-700'
                                      : itemScore?.status === 'missing'
                                      ? 'text-rose-700'
                                      : 'text-indigo-900'
                                  }`}
                                  title={itemScore?.errorMessage}
                                >
                                  {itemScore
                                    ? itemScore.status === 'absent'
                                      ? 'ร'
                                      : itemScore.status === 'missing'
                                      ? 'มส'
                                      : itemScore.score !== null
                                      ? itemScore.score
                                      : '-'
                                    : '-'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2.5 text-center text-[11px]">
                              {row.matched ? (
                                <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> พร้อมบันทึก
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">ไม่พบรหัส</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          {activeTab === 'import' && (
            <button
              onClick={handleApplyImport}
              disabled={!importResult || importResult.matchedStudents === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                ยืนยันการนำเข้าคะแนน ({importResult?.matchedStudents || 0} คน)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
