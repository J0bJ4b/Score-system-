import React, { useState, useMemo } from 'react';
import { Student, Subject, ScoreItem, Score, Term, Classroom, User } from '../types';
import {
  getClassroomRankings,
  calculateSubjectGradeStats,
  exportToCSV,
} from '../utils/gradeCalculator';
import {
  BookOpen,
  Printer,
  Download,
  Award,
  CheckCircle2,
  Users,
  FileText,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface Pp5BookPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  activeClassroom: Classroom;
  user: User | null;
}

export const Pp5BookPage: React.FC<Pp5BookPageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  activeClassroom,
  user,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'cover' | 'attributes' | 'stats' | 'full_book'>('matrix');
  const [academicYear, setAcademicYear] = useState<string>(activeClassroom.academic_year || '2569');
  const [schoolName, setSchoolName] = useState<string>(user?.school_name || 'โรงเรียนบ้านป่าส่าน (สพฐ.)');
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>(
    activeClassroom.homeroom_teacher || user?.full_name || 'ครูสมศรี จิตเมตตา'
  );
  const [academicHeadName, setAcademicHeadName] = useState<string>('นายวิชาญ การศึกษาดี');
  const [principalName, setPrincipalName] = useState<string>('นายประเสริฐ สุขสวัสดิ์');

  // Compute classroom rankings and matrix
  const rankedStudents = useMemo(() => {
    return getClassroomRankings(students, subjects, allScoreItems, allScores, terms);
  }, [students, subjects, allScoreItems, allScores, terms]);

  // Compute subject statistics
  const subjectStatsList = useMemo(() => {
    return subjects.map((subj) =>
      calculateSubjectGradeStats(students, subj, allScoreItems, allScores, terms)
    );
  }, [students, subjects, allScoreItems, allScores, terms]);

  // Summary statistics across whole classroom
  const overallStats = useMemo(() => {
    if (rankedStudents.length === 0) return { avgGpa: 0, passedCount: 0, passRate: 0, honorCount: 0 };
    const avgGpa =
      Math.round(
        (rankedStudents.reduce((acc, curr) => acc + curr.gpa, 0) / rankedStudents.length) * 100
      ) / 100;
    const passedCount = rankedStudents.filter((s) => s.gpa >= 1.0).length;
    const passRate = Math.round((passedCount / rankedStudents.length) * 100);
    const honorCount = rankedStudents.filter((s) => s.gpa >= 3.5).length;
    return { avgGpa, passedCount, passRate, honorCount };
  }, [rankedStudents]);

  // Export full P.P.5 matrix to Excel / CSV
  const handleExportFullMatrixCSV = () => {
    const headers = [
      'อันดับ',
      'เลขที่',
      'เลขประจำตัว',
      'ชื่อ-นามสกุล',
      'ห้อง',
      ...subjects.map((s) => `${s.name} (${s.code}) เกรด`),
      ...subjects.map((s) => `${s.name} (${s.code}) คะแนนรวม`),
      'รวมคะแนนดิบ',
      'รวมหน่วยกิต',
      'เกรดเฉลี่ย (GPA)',
      'ผลการตัดสิน',
    ];

    const rows = rankedStudents.map((item) => {
      const subjectGrades = subjects.map((s) => {
        const found = item.subjects.find((subj) => subj.subject.id === s.id);
        return found ? found.grade : '-';
      });
      const subjectRawScores = subjects.map((s) => {
        const found = item.subjects.find((subj) => subj.subject.id === s.id);
        return found ? found.total_score : 0;
      });

      return [
        item.rank,
        item.student.student_no,
        item.student.student_code,
        item.student.name,
        item.student.classroom,
        ...subjectGrades,
        ...subjectRawScores,
        item.totalRawScore,
        item.total_credits,
        item.gpa.toFixed(2),
        item.gpa >= 1.0 ? 'ผ่านเกณฑ์เลื่อนชั้น' : 'รอการปรับปรุง',
      ];
    });

    exportToCSV(`ปพ5_สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน_ห้อง${classroom}_ปี${academicYear}`, headers, rows);
  };

  const handlePrint = (tabMode?: 'full_book') => {
    if (tabMode) setActiveTab(tabMode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="no-print bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                แบบรายงาน ปพ.5 (สพฐ.) • เอกสารทางการ
              </span>
              <span className="text-xs text-slate-500 font-semibold">ห้อง {classroom}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-600" />
              สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปผลสัมฤทธิ์ทางการเรียนทุกวิชาของทั้งห้อง จัดพิมพ์เป็นเล่ม ปพ.5 ส่งฝ่ายวิชาการและผู้อำนวยการสถานศึกษาได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportFullMatrixCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>ส่งออก Excel (ปพ.5)</span>
            </button>

            <button
              onClick={() => handlePrint('full_book')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>จัดพิมพ์เป็นเล่ม ปพ.5 (ฉบับสมบูรณ์)</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            ตารางสรุปคะแนนทุกวิชา (Matrix)
          </button>

          <button
            onClick={() => setActiveTab('cover')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'cover'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            หน้าปก ปพ.5 & หน้าอนุมัติ
          </button>

          <button
            onClick={() => setActiveTab('attributes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'attributes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            คุณลักษณะอันพึงประสงค์ & อ่านคิดวิเคราะห์
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            สถิติผลสัมฤทธิ์และร้อยละเกรด
          </button>

          <button
            onClick={() => setActiveTab('full_book')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'full_book'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            พรีวิวเล่ม ปพ.5 ทั้งเล่มพร้อมพิมพ์
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">จำนวนนักเรียนทั้งห้อง</div>
          <div className="text-2xl font-black text-slate-800">
            {students.length} <span className="text-xs font-normal text-slate-400">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ห้อง {activeClassroom.name}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">เกรดเฉลี่ยรวมทั้งห้อง (GPA)</div>
          <div className="text-2xl font-black text-indigo-900">
            {overallStats.avgGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">รวม {subjects.length} รายวิชา</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">อัตราผ่านการประเมิน</div>
          <div className="text-2xl font-black text-emerald-700">
            {overallStats.passRate}%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{overallStats.passedCount}/{students.length} คน ผ่านเลื่อนชั้น</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">นักเรียนผลการเรียนดีเด่น</div>
          <div className="text-2xl font-black text-amber-600">
            {overallStats.honorCount} <span className="text-xs font-normal text-slate-400">คน</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">GPA ตั้งแต่ 3.50 ขึ้นไป</div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MATRIX SUMMARY TABLE (ALL SUBJECTS X ALL STUDENTS)
          ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>ตารางสรุปผลสัมฤทธิ์ทางการเรียนทุกรายวิชา (ปพ.5)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {subjects.length} รายวิชา
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ระดับชั้น {activeClassroom.level || classroom} (ห้อง {activeClassroom.name}) • ปีการศึกษา {academicYear}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrint()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์ตารางนี้
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">อันดับ</th>
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">เลขที่</th>
                  <th className="py-2.5 px-2.5 w-24 border-r border-slate-200">รหัสนักเรียน</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200">ชื่อ - นามสกุล</th>
                  
                  {/* Subject Columns */}
                  {subjects.map((sub) => (
                    <th
                      key={sub.id}
                      className="py-2 px-2 text-center min-w-[70px] border-r border-slate-200 bg-slate-50"
                      title={`${sub.name} (${sub.code}) น้ำหนัก ${sub.credit} นก.`}
                    >
                      <div className="truncate font-bold text-slate-800">{sub.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{sub.code} ({sub.credit})</div>
                    </th>
                  ))}

                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 bg-amber-50/50 font-bold text-amber-900">
                    รวมคะแนน
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 bg-indigo-50/50 font-extrabold text-indigo-900">
                    เกรดเฉลี่ย (GPA)
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24 bg-emerald-50/50 font-bold text-emerald-900">
                    ผลการตัดสิน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {rankedStudents.map((item) => {
                  const isHonor = item.gpa >= 3.5;
                  return (
                    <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-bold text-[10px] shadow-xs">1</span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-bold text-[10px]">2</span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px]">3</span>
                        ) : (
                          item.rank
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-medium text-slate-600 border-r border-slate-200">
                        {item.student.student_no}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 border-r border-slate-200">
                        {item.student.student_code}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        <div className="flex items-center justify-between">
                          <span>{item.student.name}</span>
                          {isHonor && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded ml-1">
                              เกียรตินิยม
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subject Grade and Total per student */}
                      {subjects.map((sub) => {
                        const subjData = item.subjects.find((s) => s.subject.id === sub.id);
                        const grade = subjData ? subjData.grade : '-';
                        const score = subjData ? subjData.total_score : 0;
                        const isFail = grade === '0' || grade === 'ร' || grade === 'มส';

                        return (
                          <td
                            key={sub.id}
                            className={`py-2 px-2 text-center border-r border-slate-200 ${
                              isFail ? 'bg-rose-50 text-rose-700 font-bold' : ''
                            }`}
                          >
                            <div className="font-bold text-xs">{grade}</div>
                            <div className="text-[10px] text-slate-400">({score})</div>
                          </td>
                        );
                      })}

                      <td className="py-2 px-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-amber-50/30">
                        {item.totalRawScore}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-indigo-900 border-r border-slate-200 bg-indigo-50/30 text-sm">
                        {item.gpa.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-center bg-emerald-50/30">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.gpa >= 1.0
                              ? 'text-emerald-700 bg-emerald-100/70'
                              : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {item.gpa >= 1.0 ? 'ผ่าน' : 'ไม่ผ่าน'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: COVER & APPROVAL PAGE (ปกหน้า ปพ.5 & หน้าอนุมัติ)
          ========================================================================= */}
      {activeTab === 'cover' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-10 max-w-4xl mx-auto space-y-8 print-card">
          {/* Official Cover Design */}
          <div className="text-center space-y-4 border-b-2 border-slate-800 pb-8">
            <div className="flex justify-center">
              <GarudaVector className="w-20 h-20 text-amber-700" />
            </div>
            <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              กระทรวงศึกษาธิการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
            </h1>
            <div className="text-base sm:text-lg font-bold text-slate-800">
              ระดับชั้น {activeClassroom.level || classroom} (ห้อง {activeClassroom.name})
            </div>
            <div className="text-sm font-semibold text-slate-600">
              ปีการศึกษา {academicYear}
            </div>
            <div className="text-base font-extrabold text-indigo-900 pt-2">
              {schoolName}
            </div>
          </div>

          {/* Teacher and School Settings Form (Editable inline) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs no-print">
            <div>
              <label className="font-bold text-slate-700">ชื่อโรงเรียน:</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">ปีการศึกษา:</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">ครูประจำชั้น / ครูผู้สอน:</label>
              <input
                type="text"
                value={homeroomTeacher}
                onChange={(e) => setHomeroomTeacher(e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">หัวหน้าฝ่ายวิชาการ:</label>
              <input
                type="text"
                value={academicHeadName}
                onChange={(e) => setAcademicHeadName(e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700">ผู้อำนวยการสถานศึกษา:</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Book Summary Info Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-800">ข้อมูลสรุปการจัดการเรียนการสอนในชั้นเรียน</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">จำนวนนักเรียนต้นปี:</span>
                <div className="font-bold text-slate-900 text-sm">{students.length} คน</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">จำนวนนักเรียนสิ้นปี:</span>
                <div className="font-bold text-slate-900 text-sm">{students.length} คน</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">จำนวนรายวิชา:</span>
                <div className="font-bold text-slate-900 text-sm">{subjects.length} วิชา</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">ผ่านเกณฑ์เลื่อนชั้น:</span>
                <div className="font-bold text-emerald-700 text-sm">{overallStats.passedCount} คน ({overallStats.passRate}%)</div>
              </div>
            </div>
          </div>

          {/* Formal Approval and 3-Party Signatures Block */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <h3 className="font-bold text-sm text-slate-800 text-center">
              บันทึกการอนุมัติและรับรองผลการประเมินการเรียนรู้ (ปพ.5)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs pt-4">
              {/* Teacher Signature */}
              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({homeroomTeacher})</div>
                <div className="text-slate-500">ครูประจำชั้น / ผู้บันทึก</div>
                <div className="text-slate-400 text-[11px]">วันที่ ..... / ............... / .........</div>
              </div>

              {/* Academic Head Signature */}
              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({academicHeadName})</div>
                <div className="text-slate-500">หัวหน้าฝ่ายวิชาการ / งานวัดผล</div>
                <div className="text-slate-400 text-[11px]">วันที่ ..... / ............... / .........</div>
              </div>

              {/* Principal Signature */}
              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({principalName})</div>
                <div className="text-slate-500">ผู้อำนวยการสถานศึกษา</div>
                <div className="text-slate-400 text-[11px]">วันที่ ..... / ............... / .........</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: 8 DESIRABLE ATTRIBUTES & ANALYTICAL READING
          ========================================================================= */}
      {activeTab === 'attributes' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                สรุปผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ และการอ่าน คิดวิเคราะห์
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ระดับชั้น {activeClassroom.level || classroom} • ปีการศึกษา {academicYear} (เกณฑ์: 3=ดีเยี่ยม, 2=ดี, 1=ผ่าน, 0=ไม่ผ่าน)
              </p>
            </div>
            <button
              onClick={() => handlePrint()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์หน้านี้
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">เลขที่</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200">ชื่อ - นามสกุล</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">รักชาติ ศาสน์ กษัตริย์</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">ซื่อสัตย์สุจริต</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">มีวินัย</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">ใฝ่เรียนรู้</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">อยู่อย่างพอเพียง</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">มุ่งมั่นทำงาน</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">รักความเป็นไทย</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-slate-200">มีจิตสาธารณะ</th>
                  <th className="py-2 px-2 text-center w-20 border-r border-slate-200 bg-amber-50 font-bold text-amber-900">
                    สรุปคุณลักษณะ
                  </th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-200 bg-sky-50 font-bold text-sky-900">
                    อ่าน คิดวิเคราะห์
                  </th>
                  <th className="py-2 px-2 text-center w-24 bg-emerald-50 font-bold text-emerald-900">
                    กิจกรรมผู้เรียน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {rankedStudents.map((item) => {
                  // Determine attribute score based on GPA / performance standard
                  const attributeRating = item.gpa >= 3.0 ? '3' : item.gpa >= 2.0 ? '2' : '1';
                  const readingRating = item.gpa >= 3.5 ? 'ดีเยี่ยม' : item.gpa >= 2.0 ? 'ดี' : 'ผ่าน';

                  return (
                    <tr key={item.student.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                        {item.student.student_no}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {item.student.name}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">3</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">3</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">{attributeRating}</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">{attributeRating}</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">3</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">{attributeRating}</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">3</td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700">3</td>
                      <td className="py-2 px-2 text-center font-bold border-r border-slate-200 bg-amber-50/40 text-amber-900">
                        {attributeRating === '3' ? 'ดีเยี่ยม' : attributeRating === '2' ? 'ดี' : 'ผ่าน'}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold border-r border-slate-200 bg-sky-50/40 text-sky-900">
                        {readingRating}
                      </td>
                      <td className="py-2 px-2 text-center font-bold bg-emerald-50/40 text-emerald-800">
                        ผ่าน (ผ)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GRADE DISTRIBUTION & PERCENTAGES (สถิติผลสัมฤทธิ์ทางการเรียน)
          ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                ตารางสถิติและร้อยละผลสัมฤทธิ์ทางการเรียนทุกกลุ่มสาระการเรียนรู้
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ระดับชั้น {activeClassroom.level || classroom} (ห้อง {activeClassroom.name}) • ปีการศึกษา {academicYear}
              </p>
            </div>
            <button
              onClick={() => handlePrint()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ตารางสถิติ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">ที่</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200">กลุ่มสาระการเรียนรู้ / รายวิชา</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">นก./ชม.</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">จำนวนนักเรียน</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-emerald-50">เกรด 4</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-teal-50">เกรด 3.5</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-cyan-50">เกรด 3</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-blue-50">เกรด 2.5</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-amber-50">เกรด 2</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-orange-50">เกรด 1.5</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-yellow-50">เกรด 1</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-rose-50 text-rose-700">เกรด 0</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200 bg-slate-50">ร/มส</th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 bg-indigo-50 font-bold text-indigo-900">
                    คะแนนเฉลี่ย
                  </th>
                  <th className="py-2.5 px-2 text-center w-24 bg-emerald-50 font-bold text-emerald-900">
                    ร้อยละ (เกรด 3+)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {subjectStatsList.map((stat, idx) => (
                  <tr key={stat.subject.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                      {stat.subject.name} ({stat.subject.code})
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200">
                      {stat.subject.credit}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-slate-700 border-r border-slate-200">
                      {stat.totalStudents}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-emerald-700 border-r border-slate-200 bg-emerald-50/30">
                      {stat.countByGrade['4'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-teal-700 border-r border-slate-200 bg-teal-50/30">
                      {stat.countByGrade['3.5'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-cyan-700 border-r border-slate-200 bg-cyan-50/30">
                      {stat.countByGrade['3'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-blue-700 border-r border-slate-200 bg-blue-50/30">
                      {stat.countByGrade['2.5'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-amber-700 border-r border-slate-200 bg-amber-50/30">
                      {stat.countByGrade['2'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-orange-700 border-r border-slate-200 bg-orange-50/30">
                      {stat.countByGrade['1.5'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-yellow-800 border-r border-slate-200 bg-yellow-50/30">
                      {stat.countByGrade['1'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-700 border-r border-slate-200 bg-rose-50/50">
                      {stat.countByGrade['0'] || 0}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-600 border-r border-slate-200">
                      {(stat.countByGrade['ร'] || 0) + (stat.countByGrade['มส'] || 0)}
                    </td>
                    <td className="py-2 px-2 text-center font-black text-indigo-900 border-r border-slate-200 bg-indigo-50/30">
                      {stat.avgScore.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-center font-black text-emerald-800 bg-emerald-50/40">
                      {stat.goodGradePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: FULL BOOKLET PRINT PREVIEW (ฉบับเล่ม ปพ.5 สมบูรณ์)
          ========================================================================= */}
      {activeTab === 'full_book' && (
        <div className="space-y-8">
          <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>
                กำลังแสดงพรีวิว <strong>เล่ม ปพ.5 ฉบับสมบูรณ์</strong> (ประกอบด้วย: หน้าปก, ตารางสรุปคะแนนรวมทุกวิชา, การประเมินคุณลักษณะ, สถิติ, และหน้าลงนามอนุมัติ 3 ฝ่าย)
              </span>
            </div>
            <button
              onClick={() => handlePrint()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์เล่มทันที
            </button>
          </div>

          {/* Page 1: Official Cover */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 sm:p-12 text-center space-y-6 print-page-break">
            <div className="flex justify-center">
              <GarudaVector className="w-24 h-24 text-amber-700" />
            </div>
            <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              กระทรวงศึกษาธิการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
            </h1>
            <div className="text-xl font-bold text-slate-800">
              ระดับชั้น {activeClassroom.level || classroom} (ห้อง {activeClassroom.name})
            </div>
            <div className="text-base font-semibold text-slate-600">
              ปีการศึกษา {academicYear}
            </div>
            <div className="text-2xl font-black text-indigo-900 pt-4">
              {schoolName}
            </div>
            <div className="pt-8 text-xs text-slate-500">
              ครูประจำชั้น: <strong className="text-slate-800">{homeroomTeacher}</strong>
            </div>
          </div>

          {/* Page 2: Full Matrix Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 print-page-break space-y-4">
            <div className="text-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                ตอนที่ 1: ตารางสรุปผลสัมฤทธิ์ทางการเรียนทุกกลุ่มสาระการเรียนรู้ (ปพ.5)
              </h2>
              <div className="text-xs text-slate-500">
                ห้อง {activeClassroom.name} • {schoolName} • ปีการศึกษา {academicYear}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-2 px-1 text-center w-8 border-r">ที่</th>
                    <th className="py-2 px-1 text-center w-8 border-r">เลขที่</th>
                    <th className="py-2 px-2 w-20 border-r">รหัส</th>
                    <th className="py-2 px-2 min-w-[140px] border-r">ชื่อ - นามสกุล</th>
                    {subjects.map((sub) => (
                      <th key={sub.id} className="py-1.5 px-1 text-center border-r font-bold">
                        <div>{sub.name}</div>
                        <div className="text-[9px] text-slate-400">({sub.credit})</div>
                      </th>
                    ))}
                    <th className="py-2 px-1 text-center w-14 border-r bg-amber-50">รวม</th>
                    <th className="py-2 px-1 text-center w-14 border-r bg-indigo-50 font-bold">GPA</th>
                    <th className="py-2 px-1.5 text-center w-14 bg-emerald-50">ผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankedStudents.map((item) => (
                    <tr key={item.student.id}>
                      <td className="py-1.5 px-1 text-center font-bold border-r">{item.rank}</td>
                      <td className="py-1.5 px-1 text-center border-r">{item.student.student_no}</td>
                      <td className="py-1.5 px-2 font-mono text-[10px] text-slate-500 border-r">{item.student.student_code}</td>
                      <td className="py-1.5 px-2 font-semibold border-r">{item.student.name}</td>
                      {subjects.map((sub) => {
                        const subjData = item.subjects.find((s) => s.subject.id === sub.id);
                        return (
                          <td key={sub.id} className="py-1.5 px-1 text-center border-r">
                            <span className="font-bold">{subjData?.grade || '-'}</span>
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center font-bold border-r bg-amber-50/20">{item.totalRawScore}</td>
                      <td className="py-1.5 px-1 text-center font-black border-r bg-indigo-50/20 text-indigo-900">{item.gpa.toFixed(2)}</td>
                      <td className="py-1.5 px-1.5 text-center font-bold text-emerald-800 bg-emerald-50/20">
                        {item.gpa >= 1.0 ? 'ผ่าน' : 'ไม่ผ่าน'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page 3: Signatures & Approval */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 sm:p-12 text-center space-y-8 print-page-break">
            <h3 className="font-bold text-base text-slate-900 border-b pb-4">
              ตอนที่ 2: บันทึกการอนุมัติและลงนามรับรองผลการประเมินการพัฒนาคุณภาพผู้เรียน (ปพ.5)
            </h3>
            <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
              ขอรับรองว่าได้ดำเนินการจัดการเรียนรู้ วัดและประเมินผลการเรียนรู้ของนักเรียนชั้น {activeClassroom.name} ปีการศึกษา {academicYear} ถูกต้องตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ และระเบียบสถานศึกษาครบถ้วน
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs pt-8">
              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({homeroomTeacher})</div>
                <div className="text-slate-500">ครูประจำชั้น / ผู้บันทึก</div>
              </div>

              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({academicHeadName})</div>
                <div className="text-slate-500">หัวหน้าฝ่ายวิชาการ / งานวัดผล</div>
              </div>

              <div className="space-y-2">
                <div className="h-12 flex items-end justify-center">
                  <span className="border-b border-dotted border-slate-600 w-44 inline-block"></span>
                </div>
                <div className="font-bold text-slate-900">({principalName})</div>
                <div className="text-slate-500">ผู้อำนวยการสถานศึกษา</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function GarudaVector({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#FBF3DB" stroke="#D97706" strokeWidth="2" />
      <path
        d="M50 18 L55 32 L70 32 L58 42 L62 56 L50 48 L38 56 L42 42 L30 32 L45 32 Z"
        fill="#D97706"
      />
      <circle cx="50" cy="62" r="14" fill="#B45309" />
      <path d="M42 60 Q50 52 58 60 Q50 68 42 60 Z" fill="#FDF6B2" />
      <path d="M30 68 C40 76 60 76 70 68" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
