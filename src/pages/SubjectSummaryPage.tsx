import React, { useState } from 'react';
import { Subject, Student, ScoreItem, Score, Term, Classroom } from '../types';
import { getSubjectSummaryForStudent, calculateGrade, exportToCSV } from '../utils/gradeCalculator';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Award,
  Users,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface SubjectSummaryPageProps {
  subjects: Subject[];
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  activeClassroom?: Classroom;
  onNavigateToSheets?: () => void;
}

export const SubjectSummaryPage: React.FC<SubjectSummaryPageProps> = ({
  subjects,
  students,
  allScoreItems,
  allScores,
  terms,
  classroom,
  activeClassroom,
  onNavigateToSheets,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Calculate summaries for all students in this subject
  const studentSummaries = students.map((stu) => {
    const summary = getSubjectSummaryForStudent(
      stu.id,
      activeSubject.id,
      allScoreItems,
      allScores,
      terms
    );
    const gradeInfo = calculateGrade(summary.total_score);
    return {
      student: stu,
      summary,
      gradeInfo,
    };
  });

  // Filter
  const filteredSummaries = studentSummaries.filter((item) => {
    if (gradeFilter === 'all') return true;
    if (gradeFilter === 'failing') return item.summary.grade === '0' || item.summary.status_flag !== 'ปกติ';
    if (gradeFilter === 'excellent') return item.summary.grade === '4';
    return item.summary.grade === gradeFilter;
  });

  // Calculate stats
  const totalScores = studentSummaries.map((s) => s.summary.total_score);
  const avgTotal =
    totalScores.length > 0
      ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 10) / 10
      : 0;

  const grade4Count = studentSummaries.filter((s) => s.summary.grade === '4').length;
  const failingCount = studentSummaries.filter(
    (s) => s.summary.grade === '0' || s.summary.status_flag !== 'ปกติ'
  ).length;
  const passRate =
    students.length > 0
      ? Math.round(((students.length - failingCount) / students.length) * 100)
      : 0;

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'เลขที่',
      'เลขประจำตัว',
      'ชื่อ-นามสกุล',
      'ห้อง',
      'คะแนนเทอม 1 (50)',
      'คะแนนเทอม 2 (50)',
      'คะแนนรวมทั้งปี (100)',
      'ระดับผลการเรียน (เกรด)',
      'สถานะ',
    ];

    const rows = studentSummaries.map((item) => [
      item.student.student_no,
      item.student.student_code,
      item.student.name,
      item.student.classroom,
      item.summary.term1_score,
      item.summary.term2_score,
      item.summary.total_score,
      item.summary.grade,
      item.summary.status_flag || 'ปกติ',
    ]);

    exportToCSV(`สรุปผลการเรียน_${activeSubject.name}_ห้อง${classroom}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Filter and Actions */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>สรุปผลการเรียนรายวิชา</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                เทอม 1 (50) + เทอม 2 (50) = 100 คะแนน
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ระบบตัดเกรดอัตโนมัติตามเกณฑ์มาตรฐาน 8 ระดับ (0 - 4) พร้อมส่งออกไฟล์ Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์หน้านี้</span>
            </button>

            {onNavigateToSheets && (
              <button
                type="button"
                onClick={onNavigateToSheets}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-300 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ซิงค์ไป Google Sheets</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        {/* Subject & Grade Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              เลือกวิชาที่ต้องการดูสรุปผล
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-900"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              กรองตามระดับผลการเรียน
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
            >
              <option value="all">แสดงนักเรียนทุกคน ({students.length} คน)</option>
              <option value="excellent">เฉพาะเกรด 4 ({grade4Count} คน)</option>
              <option value="failing">ต้องช่วยเหลือ / ไม่ผ่าน / ติด ร, มส ({failingCount} คน)</option>
              <option value="3.5">เกรด 3.5</option>
              <option value="3">เกรด 3</option>
              <option value="2.5">เกรด 2.5</option>
              <option value="2">เกรด 2</option>
              <option value="1.5">เกรด 1.5</option>
              <option value="1">เกรด 1</option>
              <option value="0">เกรด 0</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">คะแนนเฉลี่ยรวม</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {avgTotal} <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เฉลี่ยทั้งห้อง {classroom}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">ได้เกรด 4 (ดีเยี่ยม)</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {grade4Count} <span className="text-xs text-slate-400 font-normal">คน</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            {students.length > 0 ? Math.round((grade4Count / students.length) * 100) : 0}% ของห้อง
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">อัตราผ่านเกณฑ์</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-800">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เกรด 1 ขึ้นไป</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">ต้องช่วยเหลือ / ติด ร, มส</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${failingCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {failingCount} <span className="text-xs text-slate-400 font-normal">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">คะแนนต่ำกว่า 50 หรือขาดสอบ</div>
        </div>
      </div>

      {/* Main Summary Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden print-card">
        {/* Printable Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              ตารางสรุปผลการเรียน: วิชา{activeSubject.name} ({activeSubject.code})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ระดับชั้น {classroom} • น้ำหนัก {activeSubject.credit} หน่วยกิต • ปีการศึกษา 2568
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            {filteredSummaries.length} รายชื่อ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-14">เลขที่</th>
                <th className="py-3 px-3 w-28">เลขประจำตัว</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4 text-center w-32 bg-sky-50/50">เทอม 1 (เต็ม 50)</th>
                <th className="py-3 px-4 text-center w-32 bg-indigo-50/50">เทอม 2 (เต็ม 50)</th>
                <th className="py-3 px-4 text-center w-36 bg-amber-50/50">รวมทั้งปี (เต็ม 100)</th>
                <th className="py-3 px-4 text-center w-28">เกรด</th>
                <th className="py-3 px-4 text-center w-32">ผลการประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map(({ student: stu, summary, gradeInfo }) => {
                const isFailing = summary.grade === '0' || summary.status_flag !== 'ปกติ';
                return (
                  <tr
                    key={stu.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isFailing ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                      {stu.student_no}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {stu.student_code}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {stu.name}
                    </td>
                    <td className="py-2.5 px-4 text-center font-medium bg-sky-50/30 text-sky-900">
                      {summary.term1_score}
                    </td>
                    <td className="py-2.5 px-4 text-center font-medium bg-indigo-50/30 text-indigo-900">
                      {summary.term2_score}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-base bg-amber-50/30 text-slate-900">
                      {summary.total_score}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full font-bold text-sm border ${
                          summary.status_flag === 'ร'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : summary.status_flag === 'มส'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : gradeInfo.badgeColor
                        }`}
                      >
                        {summary.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs">
                      {summary.status_flag === 'ร' ? (
                        <span className="text-amber-700 font-bold">รอการตัดสิน (ขาดสอบ)</span>
                      ) : summary.status_flag === 'มส' ? (
                        <span className="text-rose-700 font-bold">ไม่มีสิทธิ์สอบ (ไม่ส่งงาน)</span>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          {gradeInfo.description}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    ไม่พบข้อมูลที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
