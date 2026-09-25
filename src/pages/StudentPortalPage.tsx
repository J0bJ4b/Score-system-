import React, { useState, useMemo, useEffect } from 'react';
import {
  Student,
  Subject,
  ScoreItem,
  Score,
  Term,
  Classroom,
  User,
} from '../types';
import {
  getStudentFullReport,
  getStudentTermScore,
  calculateGrade,
} from '../utils/gradeCalculator';
import {
  Search,
  School,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Printer,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Info,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface StudentPortalPageProps {
  initialStudent?: Student | null;
  allStudents: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classrooms: Classroom[];
  user?: User | null;
  onBackToTeacherApp?: () => void;
}

export const StudentPortalPage: React.FC<StudentPortalPageProps> = ({
  initialStudent = null,
  allStudents,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classrooms,
  user,
  onBackToTeacherApp,
}) => {
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent);
  const [searchError, setSearchError] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'yearly' | 'term-1' | 'term-2'>('yearly');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudent(initialStudent);
    }
  }, [initialStudent]);

  // Quick lookup handler
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError('');

    const query = studentCodeInput.trim().toLowerCase();
    if (!query) {
      setSearchError('กรุณากรอกรหัสประจำตัวนักเรียน');
      return;
    }

    const found = allStudents.find(
      (s) =>
        (s.student_code && s.student_code.toLowerCase() === query) ||
        s.student_code === query.padStart(5, '0') ||
        s.name.toLowerCase().includes(query)
    );

    if (found) {
      setSelectedStudent(found);
      setStudentCodeInput('');
      setSearchError('');
    } else {
      setSearchError(`ไม่พบข้อมูลนักเรียนสำหรับรหัส "${studentCodeInput}" กรุณาตรวจสอบรหัสอีกครั้ง`);
    }
  };

  const handleSelectQuickCode = (code: string) => {
    setStudentCodeInput(code);
    const found = allStudents.find((s) => s.student_code === code);
    if (found) {
      setSelectedStudent(found);
      setSearchError('');
    }
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentCodeInput('');
    setSearchError('');
  };

  const handlePrint = () => {
    window.print();
  };

  // Find active student classroom info
  const studentClassroom = useMemo(() => {
    if (!selectedStudent) return null;
    return (
      classrooms.find(
        (c) =>
          c.id === selectedStudent.classroom_id ||
          c.name === selectedStudent.classroom
      ) || {
        id: selectedStudent.classroom_id || 'room-1',
        name: selectedStudent.classroom,
        level: selectedStudent.classroom.includes('6')
          ? 'ประถมศึกษาปีที่ 6'
          : 'ประถมศึกษาปีที่ 5',
        academic_year: '2569',
        homeroom_teacher: user?.full_name || 'ครูสมศรี จิตเมตตา',
      }
    );
  }, [selectedStudent, classrooms, user]);

  // Compute full report data for the selected student
  const fullReport = useMemo(() => {
    if (!selectedStudent) return null;
    return getStudentFullReport(
      selectedStudent,
      subjects,
      allScoreItems,
      allScores,
      terms
    );
  }, [selectedStudent, subjects, allScoreItems, allScores, terms]);

  // Identify any missing work or absent statuses
  const statusSummary = useMemo(() => {
    if (!selectedStudent) return { hasAbsent: false, hasMissing: false, issues: [] };
    const stuScores = allScores.filter((s) => s.student_id === selectedStudent.id);
    const absentScores = stuScores.filter((s) => s.status === 'absent');
    const missingScores = stuScores.filter((s) => s.status === 'missing');

    const issues: { subjectName: string; itemName: string; status: 'absent' | 'missing'; note?: string }[] = [];

    absentScores.forEach((s) => {
      const item = allScoreItems.find((i) => i.id === s.score_item_id);
      const subj = subjects.find((sb) => sb.id === item?.subject_id);
      issues.push({
        subjectName: subj?.name || 'รายวิชา',
        itemName: item?.name || 'การสอบ',
        status: 'absent',
        note: s.note,
      });
    });

    missingScores.forEach((s) => {
      const item = allScoreItems.find((i) => i.id === s.score_item_id);
      const subj = subjects.find((sb) => sb.id === item?.subject_id);
      issues.push({
        subjectName: subj?.name || 'รายวิชา',
        itemName: item?.name || 'ชิ้นงาน/แบบฝึกหัด',
        status: 'missing',
        note: s.note,
      });
    });

    return {
      hasAbsent: absentScores.length > 0,
      hasMissing: missingScores.length > 0,
      issues,
    };
  }, [selectedStudent, allScores, allScoreItems, subjects]);

  // Total scores calculations
  const totalScoreSummary = useMemo(() => {
    if (!fullReport) return { totalRaw: 0, maxPossible: 0, percentage: 0 };
    const totalRaw = fullReport.subjects.reduce((sum, s) => sum + s.total_score, 0);
    const maxPossible = fullReport.subjects.length * 100;
    const percentage = maxPossible > 0 ? Math.round((totalRaw / maxPossible) * 1000) / 10 : 0;
    return { totalRaw, maxPossible, percentage };
  }, [fullReport]);

  // Sample student codes for quick testing
  const sampleStudents = useMemo(() => {
    return allStudents.slice(0, 6);
  }, [allStudents]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Sarabun',sans-serif]">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  ระบบบริการนักเรียน
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {user?.school_name || 'โรงเรียนบ้านป่าส่าน'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                ระบบตรวจสอบผลการเรียนและคะแนนสะสม
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudent && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="พิมพ์ใบรายงานผลการเรียน"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">พิมพ์ผลการเรียน</span>
              </button>
            )}

            {selectedStudent && (
              <button
                type="button"
                onClick={handleClearStudent}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">ค้นหารหัสอื่น</span>
              </button>
            )}

            {onBackToTeacherApp && (
              <button
                type="button"
                onClick={onBackToTeacherApp}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{user ? 'กลับสู่ระบบครู' : 'กลับสู่หน้าหลัก'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* If no student selected: Render Search Hero */}
        {!selectedStudent ? (
          <div className="max-w-2xl mx-auto py-8">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200">
                  <GraduationCap className="w-11 h-11" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                  ตรวจสอบผลการเรียนออนไลน์
                </h2>
                <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-8">
                  กรอก <span className="font-bold text-indigo-700">รหัสประจำตัวนักเรียน</span> เพื่อดูคะแนนเก็บรายวิชา สอบกลางภาค ปลายภาค และเกรดเฉลี่ยสะสม
                </p>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-500">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={studentCodeInput}
                        onChange={(e) => {
                          setStudentCodeInput(e.target.value);
                          if (searchError) setSearchError('');
                        }}
                        placeholder="กรอกรหัสนักเรียน เช่น 50101 หรือ 60101"
                        autoFocus
                        className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg bg-slate-50 border-2 border-indigo-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 font-semibold text-slate-800 transition-all placeholder:text-slate-400 placeholder:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-200 text-base transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>ดูคะแนน</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {searchError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm flex items-center justify-center gap-2 max-w-lg mx-auto animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}
                </form>

                {/* Quick Test Chips */}
                <div className="pt-6 border-t border-slate-100 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>กดรหัสตัวอย่างเพื่อทดสอบระบบได้ทันที:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sampleStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectQuickCode(s.student_code)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/60 text-left transition-all text-xs flex items-center justify-between group cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded mr-2">
                            {s.student_code}
                          </span>
                          <span className="font-medium text-slate-700 group-hover:text-indigo-900">
                            {s.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold ml-2 shrink-0">
                          {s.classroom}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 text-[12px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      กรณีจำรหัสประจำตัวไม่ได้ กรุณาติดต่อคุณครูประจำชั้นเพื่อขอรับรหัส
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Found: Render Full Score Dashboard */
          <div className="space-y-6">
            {/* Student Profile Hero Card */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-sky-800 rounded-3xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
              {/* Background graphic */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black shadow-inner shrink-0">
                    {selectedStudent.gender === 'หญิง' ? '👧' : '👦'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white border border-white/25">
                        รหัสนักเรียน: {selectedStudent.student_code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-400/40 text-[11px] sm:text-xs font-semibold text-indigo-100">
                        เลขที่ {selectedStudent.student_no}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-400/40 text-[11px] sm:text-xs font-semibold text-sky-100">
                        ห้อง {selectedStudent.classroom}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                      {selectedStudent.name}
                    </h2>

                    <div className="text-xs sm:text-sm text-indigo-200 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        ระดับชั้น: <strong className="text-white">{studentClassroom?.level || 'ประถมศึกษา'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        ครูประจำชั้น: <strong className="text-white">{studentClassroom?.homeroom_teacher || 'ครูประจำชั้น'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        ปีการศึกษา: <strong className="text-white">{studentClassroom?.academic_year || '2569'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Quick Action Switch */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearStudent}
                    className="px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>เปลี่ยนนักเรียน</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* GPA Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">เกรดเฉลี่ยสะสม (GPA)</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {fullReport?.gpa.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                      {calculateGrade(fullReport?.gpa ? fullReport.gpa * 25 : 0).description || 'ผ่านเกณฑ์'}
                    </span>
                    <span className="text-[11px] text-slate-400">เต็ม 4.00</span>
                  </div>
                </div>
              </div>

              {/* Total Score Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">คะแนนรวมทุกวิชา</span>
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">
                    {totalScoreSummary.totalRaw}
                    <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">
                      / {totalScoreSummary.maxPossible}
                    </span>
                  </div>
                  <div className="text-xs text-sky-700 font-semibold mt-1">
                    คิดเป็น {totalScoreSummary.percentage}%
                  </div>
                </div>
              </div>

              {/* Subjects Evaluated */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">จำนวนวิชาที่ลงทะเบียน</span>
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">
                    {fullReport?.subjects.length || 0}
                    <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">วิชา</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    รวม {fullReport?.total_credits || 0} หน่วยกิต
                  </div>
                </div>
              </div>

              {/* Attendance & Submission Status */}
              <div className={`rounded-2xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between ${
                statusSummary.hasAbsent || statusSummary.hasMissing
                  ? 'bg-amber-50/90 border-amber-300'
                  : 'bg-emerald-50/90 border-emerald-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">สถานะการส่งงาน/สอบ</span>
                  {statusSummary.hasAbsent || statusSummary.hasMissing ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className={`text-sm sm:text-base font-bold ${
                    statusSummary.hasAbsent || statusSummary.hasMissing
                      ? 'text-amber-900'
                      : 'text-emerald-900'
                  }`}>
                    {statusSummary.hasAbsent
                      ? 'มีรายการขาดสอบ (ร)'
                      : statusSummary.hasMissing
                      ? 'มีงานค้างส่ง (มส)'
                      : 'ครบถ้วนทุกรายการ'}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    {statusSummary.issues.length > 0
                      ? `พบประเด็นต้องติดตาม ${statusSummary.issues.length} รายการ`
                      : 'ไม่มีภาระงานค้าง'}
                  </div>
                </div>
              </div>
            </div>

            {/* Alert banner if student has absent / missing assignments */}
            {statusSummary.issues.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-xs sm:text-sm text-amber-900 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <p className="font-bold">
                      ข้อความแจ้งเตือนจากครูประจำชั้น:
                    </p>
                    <p className="text-amber-800 text-xs">
                      พบรายการที่ต้องติดตามส่งงานหรือติดต่อสอบแก้ตัว กรุณาติดต่อคุณครูผู้สอนประจำวิชา:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {statusSummary.issues.map((iss, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-medium text-xs shadow-2xs"
                        >
                          <span className="font-bold text-amber-700">[{iss.subjectName}]</span>
                          <span>{iss.itemName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            iss.status === 'absent' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {iss.status === 'absent' ? 'ขาดสอบ' : 'ค้างส่ง'}
                          </span>
                          {iss.note && <span className="text-slate-400">({iss.note})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation for Views */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 no-print">
              <button
                type="button"
                onClick={() => setActiveViewTab('yearly')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                  activeViewTab === 'yearly'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>สรุปผลการเรียนทั้งปี (ปพ.5)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('term-1')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                  activeViewTab === 'term-1'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>คะแนนเก็บ ภาคเรียนที่ 1</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('term-2')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                  activeViewTab === 'term-2'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>คะแนนเก็บ ภาคเรียนที่ 2</span>
              </button>
            </div>

            {/* VIEW 1: Yearly Summary Table */}
            {activeViewTab === 'yearly' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>ตารางสรุปผลการเรียนทุกรายวิชา (ตลอดปีการศึกษา)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      คะแนนเต็มแต่ละภาคเรียน 50 คะแนน รวมทั้งปี 100 คะแนน ตัดเกรดตามเกณฑ์ สพฐ.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start sm:self-auto">
                    เกรดเฉลี่ยสะสม GPA: {fullReport?.gpa.toFixed(2)}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 sm:px-4 text-center w-12">ที่</th>
                        <th className="py-3 px-3 sm:px-4">รหัสวิชา</th>
                        <th className="py-3 px-3 sm:px-4">ชื่อรายวิชา</th>
                        <th className="py-3 px-3 sm:px-4 text-center">หน่วยกิต</th>
                        <th className="py-3 px-3 sm:px-4 text-center">เทอม 1 (50)</th>
                        <th className="py-3 px-3 sm:px-4 text-center">เทอม 2 (50)</th>
                        <th className="py-3 px-3 sm:px-4 text-center font-bold text-indigo-900">รวม (100)</th>
                        <th className="py-3 px-3 sm:px-4 text-center font-bold">ระดับผลการเรียน</th>
                        <th className="py-3 px-3 sm:px-4 text-center">ผลการประเมิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {fullReport?.subjects.map((s, idx) => {
                        const gradeInfo = calculateGrade(s.total_score);
                        return (
                          <tr key={s.subject.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 sm:px-4 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-mono font-medium text-slate-600">
                              {s.subject.code}
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900">
                              {s.subject.name}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-medium">
                              {s.subject.credit.toFixed(1)}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-mono">
                              {s.term1_score}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-mono">
                              {s.term2_score}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30">
                              {s.total_score}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-bold">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-black ${
                                  s.status !== 'ปกติ'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : gradeInfo.badgeColor
                                }`}
                              >
                                {s.status !== 'ปกติ' ? s.status : s.grade}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center text-xs text-slate-600">
                              {s.status !== 'ปกติ'
                                ? (s.status === 'ร' ? 'รอการตัดสิน' : 'ไม่สมบูรณ์')
                                : gradeInfo.description}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-xs sm:text-sm text-slate-800 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-3.5 px-4 text-right">
                          รวมหน่วยกิตและเฉลี่ยสะสม:
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-indigo-700">
                          {fullReport?.total_credits.toFixed(1)}
                        </td>
                        <td colSpan={3} className="py-3.5 px-4 text-right text-slate-600">
                          เกรดเฉลี่ยสะสม (GPA):
                        </td>
                        <td colSpan={2} className="py-3.5 px-4 text-center">
                          <span className="text-base font-black text-indigo-800 bg-indigo-100/70 px-3 py-1 rounded-xl">
                            {fullReport?.gpa.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2 & 3: Term Breakdown Cards */}
            {(activeViewTab === 'term-1' || activeViewTab === 'term-2') && (
              <div className="space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-indigo-950">
                        รายละเอียดคะแนนเก็บรายวิชา — {activeViewTab === 'term-1' ? 'ภาคเรียนที่ 1' : 'ภาคเรียนที่ 2'}
                      </h3>
                      <p className="text-xs text-indigo-700">
                        คลิกที่แต่ละวิชาเพื่อดูรายละเอียดคะแนนชิ้นงาน แบบฝึกหัด และการสอบ
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded-lg text-indigo-800 border border-indigo-200">
                    คะแนนเต็ม 50 คะแนน
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subj) => {
                    const currentTermId = activeViewTab;
                    const termCalc = getStudentTermScore(
                      selectedStudent.id,
                      subj.id,
                      currentTermId,
                      allScoreItems,
                      allScores
                    );

                    const items = allScoreItems.filter(
                      (i) => i.subject_id === subj.id && i.term_id === currentTermId
                    );

                    const percent = Math.min(100, Math.round((termCalc.score / 50) * 100));
                    const isExpanded = expandedSubjectId === subj.id;

                    return (
                      <div
                        key={subj.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all overflow-hidden flex flex-col"
                      >
                        <div className="p-4 sm:p-5 flex-1">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                  {subj.code}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  {subj.credit} หน่วยกิต
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-slate-900 mt-1">
                                {subj.name}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xl font-black text-indigo-700 font-mono">
                                {termCalc.score}
                                <span className="text-xs font-normal text-slate-400 ml-1">/ 50</span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500">
                                {percent}%
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent >= 80
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : percent >= 70
                                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500'
                                  : percent >= 60
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  : 'bg-gradient-to-r from-rose-500 to-orange-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {/* Warning badge if absent / missing in this subject */}
                          {(termCalc.hasAbsent || termCalc.hasMissing) && (
                            <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                {termCalc.hasAbsent ? 'มีขาดสอบในวิชานี้' : 'มีงานค้างส่งในวิชานี้'}
                              </span>
                            </div>
                          )}

                          {/* Toggle expand breakdown */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubjectId(isExpanded ? null : subj.id)
                            }
                            className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50/60 text-slate-600 hover:text-indigo-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border border-slate-200/80"
                          >
                            <span>
                              {isExpanded ? 'ย่อรายละเอียดคะแนน' : 'ดูรายละเอียดทุกชิ้นงานและการสอบ'}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Expanded Items Breakdown */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fadeIn">
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                รายการคะแนนย่อย ({items.length} รายการ)
                              </div>
                              {items.map((item) => {
                                const scoreRecord = allScores.find(
                                  (s) =>
                                    s.student_id === selectedStudent.id &&
                                    s.score_item_id === item.id
                                );

                                const isAbsent = scoreRecord?.status === 'absent';
                                const isMissing = scoreRecord?.status === 'missing';
                                const point = scoreRecord?.score;

                                return (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="font-medium text-slate-800 truncate">
                                        {item.name}
                                      </div>
                                      {scoreRecord?.note && (
                                        <div className="text-[11px] text-amber-700 italic">
                                          หมายเหตุ: {scoreRecord.note}
                                        </div>
                                      )}
                                    </div>

                                    <div className="shrink-0 text-right">
                                      {isAbsent ? (
                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[11px]">
                                          ขาดสอบ (ร)
                                        </span>
                                      ) : isMissing ? (
                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                                          ไม่ส่งงาน (มส)
                                        </span>
                                      ) : point !== null && point !== undefined ? (
                                        <span className="font-mono font-bold text-slate-900">
                                          {point} <span className="text-slate-400 font-normal">/ {item.max_score}</span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">ยังไม่กรอก</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Encouraging Remarks & Teacher Note Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    ข้อเสนอแนะและคำแนะนำจากคุณครูประจำชั้น
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {fullReport?.gpa && fullReport.gpa >= 3.5
                      ? 'นักเรียนมีความตั้งใจในการเรียนดีเยี่ยม มีผลการประเมินอยู่ในเกณฑ์ยอดเยี่ยม ขอให้รักษาความตั้งใจและความมุ่งมั่นในการเรียนต่อไป'
                      : fullReport?.gpa && fullReport.gpa >= 3.0
                      ? 'นักเรียนมีพัฒนาการการเรียนที่ดีมาก ส่งงานได้ตรงต่อเวลา หากฝึกฝนและทบทวนบทเรียนเพิ่มเติมในรายวิชาคำนวณจะช่วยยกระดับผลการเรียนได้ดียิ่งขึ้น'
                      : 'ขอให้นักเรียนหมั่นทบทวนบทเรียนและสอบถามคุณครูเมื่อมีข้อสงสัย และติดตามส่งชิ้นงานให้ครบถ้วนเพื่อพัฒนาผลการเรียนให้ดียิ่งขึ้น'}
                  </p>
                  <div className="text-[11px] text-slate-400 pt-2 flex items-center gap-2">
                    <span>{studentClassroom?.homeroom_teacher || 'ครูประจำชั้น'}</span>
                    <span>•</span>
                    <span>{user?.school_name || 'โรงเรียนบ้านป่าส่าน'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRINT-ONLY SECTION (Only visible during printing) */}
            <div className="hidden print:block text-black bg-white p-4">
              <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
                <div className="text-xs font-bold uppercase">
                  กระทรวงศึกษาธิการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
                </div>
                <h2 className="text-lg font-bold">
                  ใบแจ้งผลการเรียนและคะแนนสะสมรายบุคคล
                </h2>
                <div className="text-sm">
                  {user?.school_name || 'โรงเรียนประถมศึกษา'}
                </div>
                <div className="text-xs text-slate-600">
                  ปีการศึกษา {studentClassroom?.academic_year || '2569'} • {studentClassroom?.level} (ห้อง {studentClassroom?.name})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-2 border-b border-slate-300">
                <div>ชื่อ-นามสกุล: <strong>{selectedStudent.name}</strong></div>
                <div>รหัสประจำตัว: <strong>{selectedStudent.student_code}</strong></div>
                <div>เลขที่: <strong>{selectedStudent.student_no}</strong></div>
                <div>ชั้นเรียน: <strong>{selectedStudent.classroom}</strong></div>
                <div>เกรดเฉลี่ยสะสม (GPA): <strong>{fullReport?.gpa.toFixed(2)}</strong></div>
                <div>ครูประจำชั้น: <strong>{studentClassroom?.homeroom_teacher}</strong></div>
              </div>

              <table className="w-full text-xs border border-slate-400 mb-4 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                    <th className="p-1 border-r border-slate-400 text-center w-8">ที่</th>
                    <th className="p-1 border-r border-slate-400 text-left">รหัสวิชา</th>
                    <th className="p-1 border-r border-slate-400 text-left">รายวิชา</th>
                    <th className="p-1 border-r border-slate-400 text-center">หน่วยกิต</th>
                    <th className="p-1 border-r border-slate-400 text-center">เทอม 1 (50)</th>
                    <th className="p-1 border-r border-slate-400 text-center">เทอม 2 (50)</th>
                    <th className="p-1 border-r border-slate-400 text-center">รวม (100)</th>
                    <th className="p-1 text-center">เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {fullReport?.subjects.map((sub, i) => (
                    <tr key={sub.subject.id} className="border-b border-slate-300">
                      <td className="p-1 border-r border-slate-300 text-center">{i + 1}</td>
                      <td className="p-1 border-r border-slate-300">{sub.subject.code}</td>
                      <td className="p-1 border-r border-slate-300">{sub.subject.name}</td>
                      <td className="p-1 border-r border-slate-300 text-center">{sub.subject.credit.toFixed(1)}</td>
                      <td className="p-1 border-r border-slate-300 text-center">{sub.term1_score}</td>
                      <td className="p-1 border-r border-slate-300 text-center">{sub.term2_score}</td>
                      <td className="p-1 border-r border-slate-300 text-center font-bold">{sub.total_score}</td>
                      <td className="p-1 text-center font-bold">{sub.status !== 'ปกติ' ? sub.status : sub.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8">
                <div>
                  <div className="h-10"></div>
                  <div>ลงชื่อ........................................................</div>
                  <div>( {studentClassroom?.homeroom_teacher} )</div>
                  <div>ครูประจำชั้น</div>
                </div>
                <div>
                  <div className="h-10"></div>
                  <div>ลงชื่อ........................................................</div>
                  <div>( ผู้ปกครองนักเรียน )</div>
                  <div>วันที่......../......../........</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
