/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * หน้าแบบส่งออกข้อมูลเชื่อมต่อ SchoolMIS
 * (ระบบสารสนเทศเพื่อการบริหารจัดการศึกษาของ สพฐ. / สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน)
 */

import React, { useState, useMemo } from 'react';
import {
  Student,
  Subject,
  ScoreItem,
  Score,
  Term,
  Classroom,
  SchoolSettings,
} from '../types';
import {
  prepareSchoolMisRows,
  exportSchoolMisSubjectExcel,
  exportSchoolMisSubjectCsv,
  exportSchoolMisAllSubjectsMaster,
  copyColumnToClipboard,
  cleanCitizenId,
} from '../services/schoolMisExport';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  BookOpen,
  Users,
  ShieldCheck,
  Calendar,
  School,
  Layers,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle,
  HelpCircle,
  Hash,
  Award,
} from 'lucide-react';

interface SchoolMisExportPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: Classroom;
  schoolSettings?: SchoolSettings;
  onNavigateToStudents?: () => void;
  onNavigateToScores?: () => void;
}

export const SchoolMisExportPage: React.FC<SchoolMisExportPageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  schoolSettings,
  onNavigateToStudents,
  onNavigateToScores,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'subject' | 'quick-copy' | 'all-subjects' | 'guide'>('subject');
  const [copiedColumn, setCopiedColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  }, [subjects, selectedSubjectId]);

  // Prepared SchoolMIS rows for current subject
  const currentSubjectRows = useMemo(() => {
    if (!activeSubject) return [];
    return prepareSchoolMisRows(students, activeSubject, allScoreItems, allScores, terms);
  }, [students, activeSubject, allScoreItems, allScores, terms]);

  // Validation & Readiness Status
  const readinessStats = useMemo(() => {
    const totalStudents = students.length;
    const withCitizenId = students.filter(
      (s) => cleanCitizenId(s.citizen_id || s.student_code).length === 13
    ).length;
    const missingCitizenId = totalStudents - withCitizenId;

    // Incomplete or pending grades in current subject
    const pendingGrades = currentSubjectRows.filter(
      (r) => r.status === 'ร' || r.status === 'มส' || r.total_score === 0
    ).length;

    const isFullyReady = totalStudents > 0 && missingCitizenId === 0 && pendingGrades === 0;

    return {
      totalStudents,
      withCitizenId,
      missingCitizenId,
      pendingGrades,
      isFullyReady,
    };
  }, [students, currentSubjectRows]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Quick Copy Handler
  const handleQuickCopy = async (
    columnKey: string,
    label: string,
    values: (string | number)[]
  ) => {
    const ok = await copyColumnToClipboard(values);
    if (ok) {
      setCopiedColumn(columnKey);
      showToast(`คัดลอกคอลัมน์ "${label}" (${values.length} แถว) เรียบร้อย! นำไปวางใน SchoolMIS ได้ทันที`);
      setTimeout(() => setCopiedColumn(null), 3000);
    }
  };

  // Filtered rows for table view
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return currentSubjectRows;
    const q = searchQuery.trim().toLowerCase();
    return currentSubjectRows.filter(
      (r) =>
        r.fullname.toLowerCase().includes(q) ||
        r.student_code.includes(q) ||
        r.citizen_id.includes(q) ||
        r.student_no.toString().includes(q)
    );
  }, [currentSubjectRows, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-semibold">{toastMessage}</div>
        </div>
      )}

      {/* Main Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>สพฐ. กระทรวงศึกษาธิการ</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-bold">
                SchoolMIS Standard
              </span>
              <span className="text-xs text-blue-200/70">
                ปีการศึกษา {classroom.academic_year || schoolSettings?.academic_year || '2569'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              แบบส่งออกข้อมูลเชื่อมต่อ SchoolMIS
            </h1>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              เครื่องมือจัดเตรียมและส่งออกไฟล์ผลการเรียน คะแนนเก็บ คะแนนสอบ และแบบสรุปผลการเรียน
              ให้ตรงตามรูปแบบและโครงสร้างที่ระบบ SchoolMIS ของ สพฐ. กำหนด เพื่อให้นำเข้าได้ทันที ไม่เกิดปัญหาฟอนต์ภาษาไทยเพี้ยน
            </p>
          </div>

          {/* Quick Info Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold">
              <School className="w-4 h-4 text-blue-300" />
              <span className="truncate max-w-[200px]">
                {schoolSettings?.school_name || 'โรงเรียนบ้านป่าส่าน'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold">
              <Users className="w-4 h-4 text-blue-300" />
              <span>
                ห้อง {classroom.name} ({classroom.level}) • {students.length} คน
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold">
              <BookOpen className="w-4 h-4 text-blue-300" />
              <span>{subjects.length} รายวิชาในหลักสูตร</span>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Check Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                readinessStats.isFullyReady
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {readinessStats.isFullyReady ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>ความพร้อมของข้อมูลสำหรับระบบ SchoolMIS</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    readinessStats.isFullyReady
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {readinessStats.isFullyReady ? 'สมบูรณ์พร้อมส่งออก 100%' : 'มีรายการต้องตรวจสอบ'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                SchoolMIS บังคับใช้ <strong className="text-slate-700">เลขประจำตัวประชาชน 13 หลัก</strong> และการคำนวณคะแนนตามสัดส่วน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">เลข 13 หลักครบ: </span>
              <strong className="text-emerald-700 font-bold font-mono">
                {readinessStats.withCitizenId}/{readinessStats.totalStudents}
              </strong>
            </div>

            {readinessStats.missingCitizenId > 0 && (
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>กรอกเลข 13 หลัก ({readinessStats.missingCitizenId} คน)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {readinessStats.pendingGrades > 0 && (
              <button
                type="button"
                onClick={onNavigateToScores}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>กรอกคะแนนที่ค้าง</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('subject')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'subject'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ส่งออกผลการเรียนรายวิชา (Excel / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick-copy')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'quick-copy'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>คัดลอกคะแนนทั้งห้อง (One-Click Paste)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-amber-400 text-amber-950">
            แนะนำ
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all-subjects')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'all-subjects'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ส่งออกรวมทุกวิชาทั้งห้อง (Master Workbook)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'guide'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>คู่มือขั้นตอนการนำเข้า SchoolMIS</span>
        </button>
      </div>

      {/* TAB 1: SUBJECT EXPORT (EXCEL / CSV) */}
      {activeTab === 'subject' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Subject Selector */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700">เลือกรายวิชา:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.name} ({s.credit.toFixed(1)} นก.)
                  </option>
                ))}
              </select>

              {activeSubject && (
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  • {classroom.name} • {students.length} คน
                </span>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!activeSubject) return;
                  exportSchoolMisSubjectExcel({
                    subject: activeSubject,
                    classroom,
                    students,
                    allScoreItems,
                    allScores,
                    terms,
                    schoolSettings,
                  });
                  showToast(`ดาวน์โหลดไฟล์ Excel สำหรับวิชา ${activeSubject.name} เรียบร้อยแล้ว`);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeSubject) return;
                  exportSchoolMisSubjectCsv({
                    subject: activeSubject,
                    classroom,
                    students,
                    allScoreItems,
                    allScores,
                    terms,
                  });
                  showToast(`ดาวน์โหลดไฟล์ CSV (UTF-8 BOM) สำหรับ SchoolMIS เรียบร้อยแล้ว`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด CSV (UTF-8 BOM)</span>
              </button>
            </div>
          </div>

          {/* Preview Table Header & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>
                    ตัวอย่างโครงสร้างข้อมูลที่จะส่งออกเข้าสู่ระบบ SchoolMIS — {activeSubject?.name} ({activeSubject?.code})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คอลัมน์มาตรฐาน: เลขประจำตัว, เลข 13 หลัก, ชื่อ-นามสกุล, คะแนนเก็บ, กลางภาค, ปลายภาค, รวม, เกรด และผลประเมินคุณลักษณะ
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือเลขประจำตัว..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">ที่</th>
                    <th className="py-3 px-3">เลขประจำตัว</th>
                    <th className="py-3 px-3">เลขประชาชน 13 หลัก</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-900 border-x border-emerald-100">
                      คะแนนเก็บ
                    </th>
                    <th className="py-3 px-3 text-center bg-sky-50/70 text-sky-900 border-r border-sky-100">
                      กลางภาค
                    </th>
                    <th className="py-3 px-3 text-center bg-purple-50/70 text-purple-900 border-r border-purple-100">
                      ปลายภาค
                    </th>
                    <th className="py-3 px-3 text-center font-bold text-indigo-900 bg-indigo-50/80">
                      รวม (100)
                    </th>
                    <th className="py-3 px-3 text-center font-bold">เกรด</th>
                    <th className="py-3 px-3 text-center">คุณลักษณะ (0-3)</th>
                    <th className="py-3 px-3 text-center">อ่านคิดฯ (0-3)</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-sans">
                        {row.student_no}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">
                        {row.student_code}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.citizen_id ? (
                          <span className="text-slate-800">{row.citizen_id}</span>
                        ) : (
                          <span className="text-rose-500 font-sans italic text-[11px]">
                            ยังไม่มีเลข 13 หลัก
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {row.fullname}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-emerald-50/30 text-emerald-950 font-bold border-x border-emerald-50">
                        {row.regular_score}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-sky-50/30 text-sky-950 font-bold border-r border-sky-50">
                        {row.midterm_score}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-purple-50/30 text-purple-950 font-bold border-r border-purple-50">
                        {row.final_score}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-900 bg-indigo-50/30">
                        {row.total_score}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                            row.grade === '4'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.grade === '0'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {row.desirable_characteristics}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {row.reading_writing}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            row.status === 'ปกติ'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ONE-CLICK QUICK COPY (ครูนำไป Paste ใน SchoolMIS ได้ทันที) */}
      {activeTab === 'quick-copy' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                  <span>ฟีเจอร์ช่วยครู: คัดลอกทั้งคอลัมน์แล้วไปกด Paste ในเว็บ SchoolMIS</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                    ประหยัดเวลา 90%
                  </span>
                </h3>
                <p className="text-xs text-emerald-800">
                  ระบบ SchoolMIS อนุญาตให้คลิกช่องแรกของคอลัมน์แล้วกด <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">Ctrl + V</kbd> เพื่อวางคะแนนนักเรียนทั้งห้องลงมาได้เลยทีเดียว!
                </p>
              </div>
            </div>

            {/* Subject Selector for Quick Copy */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-emerald-950">เลือกวิชาที่ต้องการคัดลอก:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.name} ({s.credit.toFixed(1)} นก.)
                  </option>
                ))}
              </select>
              <span className="text-xs text-emerald-700">
                นักเรียน {currentSubjectRows.length} คน (เรียงตามเลขที่ 1 ถึง {currentSubjectRows.length})
              </span>
            </div>
          </div>

          {/* Quick Copy Column Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. คัดลอกคะแนนเก็บ */}
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ส่วนที่ 1
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentSubjectRows.length} รายการ
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  คะแนนเก็บระหว่างเรียน (Formative)
                </h4>
                <p className="text-xs text-slate-500">
                  ชิ้นงาน ใบงาน และแบบฝึกหัด (รวม {currentSubjectRows[0]?.regular_score !== undefined ? 'คะแนนเก็บสะสม' : ''})
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickCopy(
                    'regular_score',
                    'คะแนนเก็บระหว่างเรียน',
                    currentSubjectRows.map((r) => r.regular_score)
                  )
                }
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedColumn === 'regular_score'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {copiedColumn === 'regular_score' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกคะแนนเก็บแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกคอลัมน์คะแนนเก็บ</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. คัดลอกคะแนนสอบกลางภาค */}
            <div className="bg-white rounded-2xl p-5 border border-sky-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    ส่วนที่ 2
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentSubjectRows.length} รายการ
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  คะแนนสอบกลางภาค (Midterm)
                </h4>
                <p className="text-xs text-slate-500">
                  ผลการประเมินการสอบกลางภาคเรียน
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickCopy(
                    'midterm_score',
                    'คะแนนสอบกลางภาค',
                    currentSubjectRows.map((r) => r.midterm_score)
                  )
                }
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedColumn === 'midterm_score'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                }`}
              >
                {copiedColumn === 'midterm_score' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกคะแนนกลางภาคแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกคอลัมน์กลางภาค</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. คัดลอกคะแนนสอบปลายภาค */}
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    ส่วนที่ 3
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentSubjectRows.length} รายการ
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  คะแนนสอบปลายภาค (Final)
                </h4>
                <p className="text-xs text-slate-500">
                  ผลการประเมินการสอบปลายภาคเรียน
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickCopy(
                    'final_score',
                    'คะแนนสอบปลายภาค',
                    currentSubjectRows.map((r) => r.final_score)
                  )
                }
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedColumn === 'final_score'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                }`}
              >
                {copiedColumn === 'final_score' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกคะแนนปลายภาคแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกคอลัมน์ปลายภาค</span>
                  </>
                )}
              </button>
            </div>

            {/* 4. คัดลอกคะแนนรวม (100 คะแนน) */}
            <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    คะแนนรวม
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    เต็ม 100
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  คะแนนรวมทั้งสิ้น (Total 100)
                </h4>
                <p className="text-xs text-slate-500">
                  คะแนนรวม 3 ส่วนสะสมตลอดปีการศึกษา
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickCopy(
                    'total_score',
                    'คะแนนรวมทั้งสิ้น',
                    currentSubjectRows.map((r) => r.total_score)
                  )
                }
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedColumn === 'total_score'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {copiedColumn === 'total_score' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกคะแนนรวมแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกคอลัมน์คะแนนรวม</span>
                  </>
                )}
              </button>
            </div>

            {/* 5. คัดลอกระดับผลการเรียน (เกรด 0-4) */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    ระดับผลการเรียน
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    เกรด 0-4
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  ระดับผลการเรียน (Grade)
                </h4>
                <p className="text-xs text-slate-500">
                  เกรด 0, 1, 1.5, 2, 2.5, 3, 3.5, 4 หรือ ร, มส
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickCopy(
                    'grade',
                    'ระดับผลการเรียน (เกรด)',
                    currentSubjectRows.map((r) => r.grade)
                  )
                }
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedColumn === 'grade'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {copiedColumn === 'grade' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกเกรดเรียบร้อยแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกคอลัมน์เกรด</span>
                  </>
                )}
              </button>
            </div>

            {/* 6. คัดลอกคุณลักษณะอันพึงประสงค์ & อ่านคิดวิเคราะห์ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    การประเมิน สพฐ.
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    เกณฑ์ 0-3
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  คุณลักษณะ & การอ่านคิดวิเคราะห์
                </h4>
                <p className="text-xs text-slate-500">
                  3=ดีเยี่ยม, 2=ดี, 1=ผ่าน, 0=ไม่ผ่าน
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickCopy(
                      'characteristics',
                      'คุณลักษณะอันพึงประสงค์',
                      currentSubjectRows.map((r) => r.desirable_characteristics)
                    )
                  }
                  className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>คุณลักษณะ (0-3)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickCopy(
                      'reading_writing',
                      'การอ่าน คิดวิเคราะห์ เขียน',
                      currentSubjectRows.map((r) => r.reading_writing)
                    )
                  }
                  className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>อ่านคิดฯ (0-3)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL SUBJECTS MASTER WORKBOOK */}
      {activeTab === 'all-subjects' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg shadow-2xs">
                  <Layers className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    ส่งออกชุดข้อมูล Master รวมทุกวิชาสำหรับห้อง {classroom.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ไฟล์เดียวจบ รวมทุก {subjects.length} วิชา + แผ่นสรุป GPA และผลการตัดสินเลื่อนชั้น
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  exportSchoolMisAllSubjectsMaster({
                    classroom,
                    subjects,
                    students,
                    allScoreItems,
                    allScores,
                    terms,
                    schoolSettings,
                  });
                  showToast('ดาวน์โหลด Master Workbook รวมทุกวิชาสำหรับ SchoolMIS เรียบร้อยแล้ว');
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Master Workbook (.xlsx)</span>
              </button>
            </div>

            {/* Highlights of Master Workbook */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  แผ่นสรุปผลรวมทุกวิชา (GPA Sheet)
                </h4>
                <p className="text-slate-600">
                  รวบรวมคะแนนและเกรดทุกรายวิชาของนักเรียนทุกคนในห้อง พร้อมหน่วยกิตรวม, เกรดเฉลี่ย GPA และการตัดสินเลื่อนชั้น
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  แผ่นแยกรายวิชา {subjects.length} แผ่น
                </h4>
                <p className="text-slate-600">
                  มี Sheet แยกตามรหัสวิชา ({subjects.map((s) => s.code).join(', ')}) สะดวกสำหรับครูประจำวิชาดึงข้อมูลนำเข้า SchoolMIS
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  เข้ากันได้กับระบบ สพฐ. 100%
                </h4>
                <p className="text-slate-600">
                  จัดเรียงตามเลขที่, มีเลขประจำตัว 13 หลัก และเลขประจำตัวนักเรียนถูกต้องตามฐานข้อมูล DMC
                </p>
              </div>
            </div>

            {/* List of Subjects in this classroom */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                รายวิชาที่จะถูกบรรจุใน Master Workbook ({subjects.length} วิชา):
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {subjects.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-indigo-700 font-bold mr-1">
                        {s.code}
                      </span>
                      <span className="text-slate-800 font-medium">{s.name}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {s.credit.toFixed(1)} นก.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STEP-BY-STEP GUIDE FOR TEACHERS */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  คู่มือขั้นตอนการนำเข้าคะแนนสู่ระบบ SchoolMIS สพฐ.
                </h3>
                <p className="text-xs text-slate-500">
                  คำแนะนำขั้นตอนสำหรับคุณครูผู้สอนและครูฝ่ายทะเบียน-วัดผลในการนำข้อมูลไปใช้งาน
                </p>
              </div>
            </div>

            {/* 4 Steps Timeline */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ดาวน์โหลดไฟล์หรือกดคัดลอกข้อมูลจากหน้านี้
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    - หากต้องการนำเข้าเป็นไฟล์ ให้กดดาวน์โหลด <strong>Excel (.xlsx)</strong> หรือ <strong>CSV (UTF-8)</strong><br />
                    - หากต้องการกรอกบนหน้าเว็บ SchoolMIS ให้ไปที่แท็บ <strong>"คัดลอกคะแนนทั้งห้อง (One-Click Paste)"</strong> แล้วกดปุ่มคัดลอกคอลัมน์ที่ต้องการ
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    เข้าสู่ระบบ SchoolMIS ของ สพฐ.
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    เข้าสู่ระบบผ่านเว็บไซต์ SchoolMIS ของเขตพื้นที่การศึกษา เข้าสู่เมนู <strong>"ผลการเรียน"</strong> &gt; <strong>"บันทึก/แก้ไขคะแนนย่อย"</strong> หรือ <strong>"บันทึกผลการเรียนรายวิชา"</strong>
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    เลือกวิธีนำเข้าข้อมูล (ไฟล์ CSV หรือวางแบบ Column Paste)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    - <strong>วิธีไฟล์:</strong> คลิกปุ่ม "นำเข้าไฟล์ CSV" แล้วเลือกไฟล์ที่ดาวน์โหลดไว้<br />
                    - <strong>วิธีวางข้อมูล:</strong> คลิกช่องคะแนนของนักเรียนคนแรก (เลขที่ 1) แล้วกดปุ่มลัด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">Ctrl + V</kbd> ข้อมูลจะถูกหยอดลงตารางทั้งห้องโดยอัตโนมัติ
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ตรวจสอบความถูกต้องและกด "บันทึกข้อมูล"
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ตรวจสอบคะแนนรวมและเกรดเฉลี่ยว่าตรงกับระบบสมุดบันทึกผลการเรียน ปพ.5 แล้วกดปุ่ม <strong>"บันทึก"</strong> เพื่อยืนยันข้อมูลใน SchoolMIS
                  </p>
                </div>
              </div>
            </div>

            {/* Note & Best Practices */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                <span>ข้อควรระวังสำคัญสำหรับระบบ SchoolMIS:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 pl-1">
                <li>กรณีนักเรียนติด <strong>"ร"</strong> หรือ <strong>"มส"</strong> ให้ตรวจสอบว่าระบบ SchoolMIS ของท่านเปิดให้บันทึกเป็นตัวอักษร หรือให้ใส่คะแนนเป็น 0 ก่อนสอบแก้ตัว</li>
                <li>เลขประจำตัวประชาชน 13 หลัก ต้องตรงกับฐานข้อมูล DMC หากไม่ตรงระบบจะไม่ยอมรับข้อมูล</li>
                <li>ไฟล์ CSV จากระบบของเราได้ฝัง <strong>UTF-8 BOM</strong> ไว้เรียบร้อยแล้ว ป้องกันปัญหาสระและวรรณยุกต์ภาษาไทยลอยหรือเป็นภาษาต่างดาวในโปรแกรม Excel 100%</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
