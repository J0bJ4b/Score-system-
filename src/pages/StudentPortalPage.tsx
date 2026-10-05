import React, { useState, useMemo, useEffect } from 'react';
import {
  Student,
  Subject,
  ScoreItem,
  Score,
  Term,
  Classroom,
  User,
  RemedialRecord,
} from '../types';
import { storage } from '../services/storage';
import {
  getStudentFullReport,
  getStudentTermScore,
  calculateGrade,
} from '../utils/gradeCalculator';
import { formatCitizenId, cleanCitizenId } from '../utils/dmcParser';
import { StudentProgressChart } from '../components/StudentProgressChart';
import { SchoolLogo } from '../components/SchoolLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { realtimeSync } from '../services/realtimeSync';
import { generateStudentLearningFeedback } from '../utils/feedbackGenerator';
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
  Zap,
  Lightbulb,
  Target,
  Check,
  PieChart,
  Filter,
  Maximize2,
  Minimize2,
  FolderCheck,
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
  const schoolSettings = useMemo(() => storage.getSchoolSettings(), []);
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent);
  const [searchError, setSearchError] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<
    'yearly' | 'breakdown' | 'term-1' | 'term-2' | 'progress'
  >('yearly');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [breakdownTermFilter, setBreakdownTermFilter] = useState<'all' | 'term-1' | 'term-2'>('all');
  const [breakdownCategoryFilter, setBreakdownCategoryFilter] = useState<'all' | 'regular' | 'midterm' | 'final'>('all');
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');
  const [expandedYearlySubjectIds, setExpandedYearlySubjectIds] = useState<Set<string>>(new Set());
  const [expandedBreakdownSubjectIds, setExpandedBreakdownSubjectIds] = useState<Set<string>>(new Set());

  const handleToggleExpandYearlySubject = (subjectId: string) => {
    setExpandedYearlySubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleExpandAllYearlySubjects = () => {
    setExpandedYearlySubjectIds(new Set(subjects.map((s) => s.id)));
  };

  const handleCollapseAllYearlySubjects = () => {
    setExpandedYearlySubjectIds(new Set());
  };

  const handleToggleExpandBreakdownSubject = (subjectId: string) => {
    setExpandedBreakdownSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleExpandAllBreakdownSubjects = () => {
    setExpandedBreakdownSubjectIds(new Set(subjects.map((s) => s.id)));
  };

  const handleCollapseAllBreakdownSubjects = () => {
    setExpandedBreakdownSubjectIds(new Set());
  };

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
    const cleanQuery = cleanCitizenId(query);
    if (!query) {
      setSearchError('กรุณากรอกเลขประจำตัวประชาชน หรือชื่อนักเรียน');
      return;
    }

    const found = allStudents.find(
      (s) =>
        (s.student_code && cleanCitizenId(s.student_code) === cleanQuery) ||
        (s.student_code && s.student_code.toLowerCase() === query) ||
        s.name.toLowerCase().includes(query)
    );

    if (found) {
      setSelectedStudent(found);
      setStudentCodeInput('');
      setSearchError('');
    } else {
      setSearchError(`ไม่พบข้อมูลนักเรียนสำหรับ "${studentCodeInput}" กรุณาตรวจสอบเลขบัตรประชาชน 13 หลัก หรือชื่อนักเรียนอีกครั้ง`);
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

  // Remedial records for the active student
  const studentRemedialRecords = useMemo<RemedialRecord[]>(() => {
    if (!selectedStudent) return [];
    return storage.getAllRemedialRecords().filter((r: RemedialRecord) => r.student_id === selectedStudent.id);
  }, [selectedStudent]);

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

  // Helper to determine score category (regular / midterm / final)
  const getItemCategory = (item: ScoreItem): 'regular' | 'midterm' | 'final' => {
    if (item.category) return item.category;
    const name = item.name.toLowerCase();
    if (
      name.includes('กลางภาค') ||
      name.includes('midterm') ||
      name.includes('กลาง') ||
      name.includes('mid-term')
    ) {
      return 'midterm';
    }
    if (
      name.includes('ปลายภาค') ||
      name.includes('final') ||
      name.includes('ปลาย') ||
      name.includes('สอบปลาย')
    ) {
      return 'final';
    }
    return 'regular';
  };

  // Comprehensive score components breakdown for selected student
  const detailedScoreBreakdown = useMemo(() => {
    if (!selectedStudent) return null;

    // Student score lookup map: key = score_item_id
    const scoreMap = new Map<string, Score>();
    allScores
      .filter((s) => s.student_id === selectedStudent.id)
      .forEach((s) => scoreMap.set(s.score_item_id, s));

    let overallRegularEarned = 0;
    let overallRegularMax = 0;
    let overallMidtermEarned = 0;
    let overallMidtermMax = 0;
    let overallFinalEarned = 0;
    let overallFinalMax = 0;

    const subjectBreakdowns = subjects.map((subj) => {
      const getTermCategoryBreakdown = (
        termId: string,
        category: 'regular' | 'midterm' | 'final'
      ) => {
        const catItems = allScoreItems.filter(
          (i) =>
            i.subject_id === subj.id &&
            i.term_id === termId &&
            getItemCategory(i) === category
        );
        let earned = 0;
        let max = 0;
        let hasAbsent = false;
        let hasMissing = false;

        const itemsWithScores = catItems.map((item) => {
          const rec = scoreMap.get(item.id);
          const score = rec?.score;
          const status = rec?.status || 'normal';
          const note = rec?.note;

          max += item.max_score || 0;
          if (status === 'normal' && typeof score === 'number') {
            earned += score;
          }
          if (status === 'absent') hasAbsent = true;
          if (status === 'missing') hasMissing = true;

          return {
            item,
            score,
            status,
            note,
          };
        });

        const percentage = max > 0 ? Math.round((earned / max) * 1000) / 10 : 0;
        return {
          earned: Math.round(earned * 10) / 10,
          max,
          percentage,
          hasAbsent,
          hasMissing,
          itemsCount: catItems.length,
          items: itemsWithScores,
        };
      };

      const t1Regular = getTermCategoryBreakdown('term-1', 'regular');
      const t1Midterm = getTermCategoryBreakdown('term-1', 'midterm');
      const t1Final = getTermCategoryBreakdown('term-1', 'final');
      const t1Total =
        Math.round((t1Regular.earned + t1Midterm.earned + t1Final.earned) * 10) / 10;
      const t1Max = t1Regular.max + t1Midterm.max + t1Final.max || 50;

      const t2Regular = getTermCategoryBreakdown('term-2', 'regular');
      const t2Midterm = getTermCategoryBreakdown('term-2', 'midterm');
      const t2Final = getTermCategoryBreakdown('term-2', 'final');
      const t2Total =
        Math.round((t2Regular.earned + t2Midterm.earned + t2Final.earned) * 10) / 10;
      const t2Max = t2Regular.max + t2Midterm.max + t2Final.max || 50;

      const yearTotal = Math.min(100, Math.round((t1Total + t2Total) * 10) / 10);
      const yearMax = t1Max + t2Max || 100;
      const yearPercentage =
        yearMax > 0 ? Math.round((yearTotal / yearMax) * 1000) / 10 : 0;
      const gradeResult = calculateGrade(yearTotal);

      // Accumulate overall
      overallRegularEarned += t1Regular.earned + t2Regular.earned;
      overallRegularMax += t1Regular.max + t2Regular.max;
      overallMidtermEarned += t1Midterm.earned + t2Midterm.earned;
      overallMidtermMax += t1Midterm.max + t2Midterm.max;
      overallFinalEarned += t1Final.earned + t2Final.earned;
      overallFinalMax += t1Final.max + t2Final.max;

      return {
        subject: subj,
        term1: {
          total: t1Total,
          max: t1Max,
          percentage: t1Max > 0 ? Math.round((t1Total / t1Max) * 1000) / 10 : 0,
          regular: t1Regular,
          midterm: t1Midterm,
          final: t1Final,
        },
        term2: {
          total: t2Total,
          max: t2Max,
          percentage: t2Max > 0 ? Math.round((t2Total / t2Max) * 1000) / 10 : 0,
          regular: t2Regular,
          midterm: t2Midterm,
          final: t2Final,
        },
        yearTotal,
        yearMax,
        yearPercentage,
        grade: gradeResult.grade,
        gradePoint: gradeResult.gradePoint,
        gradeBadge: gradeResult.badgeColor,
        description: gradeResult.description,
      };
    });

    const totalEarnedAll =
      overallRegularEarned + overallMidtermEarned + overallFinalEarned;
    const totalMaxAll = overallRegularMax + overallMidtermMax + overallFinalMax;

    return {
      overall: {
        regular: {
          earned: Math.round(overallRegularEarned * 10) / 10,
          max: overallRegularMax,
          percentage:
            overallRegularMax > 0
              ? Math.round((overallRegularEarned / overallRegularMax) * 1000) / 10
              : 0,
        },
        midterm: {
          earned: Math.round(overallMidtermEarned * 10) / 10,
          max: overallMidtermMax,
          percentage:
            overallMidtermMax > 0
              ? Math.round((overallMidtermEarned / overallMidtermMax) * 1000) / 10
              : 0,
        },
        final: {
          earned: Math.round(overallFinalEarned * 10) / 10,
          max: overallFinalMax,
          percentage:
            overallFinalMax > 0
              ? Math.round((overallFinalEarned / overallFinalMax) * 1000) / 10
              : 0,
        },
        total: {
          earned: Math.round(totalEarnedAll * 10) / 10,
          max: totalMaxAll,
          percentage:
            totalMaxAll > 0
              ? Math.round((totalEarnedAll / totalMaxAll) * 1000) / 10
              : 0,
        },
      },
      subjects: subjectBreakdowns,
    };
  }, [selectedStudent, subjects, allScoreItems, allScores]);

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
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-indigo-700 flex items-center justify-center shadow-xs p-1">
              <SchoolLogo settings={schoolSettings} size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  ระบบบริการนักเรียน
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                <span className="text-xs text-slate-500 hidden sm:inline font-semibold">
                  {schoolSettings.school_name || user?.school_name || 'โรงเรียนบ้านป่าส่าน'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                ระบบตรวจสอบผลการเรียนและคะแนนสะสม
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

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
                  กรอก <span className="font-bold text-indigo-700">เลขประจำตัวประชาชน 13 หลัก</span> (บนบัตรประชาชน) เพื่อดูคะแนนเก็บรายวิชา สอบกลางภาค ปลายภาค และเกรดเฉลี่ยสะสม
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
                          const val = e.target.value;
                          const hasLetters = /[a-zA-Z\u0E00-\u0E7F]/.test(val);
                          if (hasLetters) {
                            setStudentCodeInput(val);
                          } else {
                            const digits = val.replace(/\D/g, '').slice(0, 13);
                            if (digits.length > 1) {
                              let formatted = digits[0];
                              if (digits.length > 1) formatted += '-' + digits.slice(1, 5);
                              if (digits.length > 5) formatted += '-' + digits.slice(5, 10);
                              if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
                              if (digits.length > 12) formatted += '-' + digits.slice(12, 13);
                              setStudentCodeInput(formatted);
                            } else {
                              setStudentCodeInput(digits);
                            }
                          }
                          if (searchError) setSearchError('');
                        }}
                        placeholder="กรอกเลขบัตร ปชช. เช่น 1-5099-01010-01-1 หรือชื่อนักเรียน"
                        maxLength={17}
                        autoFocus
                        className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg bg-slate-50 border-2 border-indigo-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 font-semibold font-mono tracking-wider text-slate-800 transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:font-normal"
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
                    <span>กดเลขประจำตัวประชาชนตัวอย่างเพื่อทดสอบระบบได้ทันที:</span>
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
                            {formatCitizenId(s.student_code)}
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
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white border border-white/25 font-mono">
                        เลขประจำตัวประชาชน: {formatCitizenId(selectedStudent.student_code)}
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

            {/* Remedial & Re-exam Tracking Notice for Student & Parent */}
            {studentRemedialRecords.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <span className="p-1 rounded-lg bg-amber-100 text-amber-700">📖</span>
                    <span>ข้อมูลการสอนซ่อมเสริมและผลการสอบแก้ตัว</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    พบ {studentRemedialRecords.length} รายการ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studentRemedialRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        rec.status === 'passed'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : rec.status === 're_exam_scheduled'
                          ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                          : 'bg-amber-50/60 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm">{rec.subject_name}</div>
                          <div className="text-slate-600 font-medium">{rec.score_item_name}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 border ${
                            rec.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : rec.status === 're_exam_scheduled'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {rec.status === 'passed'
                            ? 'สอบแก้ตัวผ่านแล้ว ✅'
                            : rec.status === 're_exam_scheduled'
                            ? 'นัดสอบแก้ตัว 📅'
                            : 'กำลังสอนซ่อมเสริม ⏳'}
                        </span>
                      </div>

                      <div className="text-slate-600 space-y-0.5">
                        <div>คะแนนเดิม: <span className="font-bold text-rose-600">{rec.original_score}</span> / {rec.max_score}</div>
                        {rec.status === 'passed' && (
                          <div className="text-emerald-800 font-semibold">
                            คะแนนสอบแก้ตัว: <span className="font-bold">{rec.re_exam_score}</span> / {rec.max_score} (บันทึก ปพ.5: {rec.final_recorded_score || rec.target_passing_score})
                          </div>
                        )}
                        {rec.re_exam_date && (
                          <div>วันที่สอบแก้ตัว: <span className="font-medium text-slate-700">{rec.re_exam_date}</span></div>
                        )}
                        {rec.teacher_notes && (
                          <div className="italic text-slate-500">บันทึกครู: "{rec.teacher_notes}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Detailed Score Structure Overview (โครงสร้างสัดส่วนคะแนนสะสม 3 ส่วนหลัก) */}
            {detailedScoreBreakdown && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black shadow-2xs">
                      <PieChart className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <span>แจงโครงสร้างสัดส่วนคะแนน (3 ส่วนหลักตามเกณฑ์ สพฐ.)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                          สพฐ.
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        คะแนนรวมคำนวณจาก: 1. คะแนนเก็บระหว่างเรียน + 2. สอบกลางภาค + 3. สอบปลายภาค
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveViewTab('breakdown')}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ดูแจงคะแนนแบบละเอียดทุกชิ้นงาน</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Part 1: Regular Formative Work */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <div>
                          <div className="font-bold text-xs text-emerald-950">คะแนนเก็บระหว่างเรียน</div>
                          <div className="text-[10px] text-emerald-700">ใบงาน / แบบฝึกหัด / จิตพิสัย</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {detailedScoreBreakdown.overall.regular.percentage}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="text-slate-500 font-medium">คะแนนที่ได้สะสม:</span>
                      <span className="font-bold text-emerald-900 text-sm font-mono">
                        {detailedScoreBreakdown.overall.regular.earned}{' '}
                        <span className="text-slate-400 font-normal text-xs">
                          / {detailedScoreBreakdown.overall.regular.max}
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-emerald-100/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            detailedScoreBreakdown.overall.regular.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Part 2: Midterm */}
                  <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                          2
                        </div>
                        <div>
                          <div className="font-bold text-xs text-sky-950">คะแนนสอบกลางภาค</div>
                          <div className="text-[10px] text-sky-700">การวัดผลกลางภาคเรียน</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                        {detailedScoreBreakdown.overall.midterm.percentage}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="text-slate-500 font-medium">คะแนนที่ได้สะสม:</span>
                      <span className="font-bold text-sky-900 text-sm font-mono">
                        {detailedScoreBreakdown.overall.midterm.earned}{' '}
                        <span className="text-slate-400 font-normal text-xs">
                          / {detailedScoreBreakdown.overall.midterm.max}
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-sky-100/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            detailedScoreBreakdown.overall.midterm.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Part 3: Final */}
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                        <div>
                          <div className="font-bold text-xs text-purple-950">คะแนนสอบปลายภาค</div>
                          <div className="text-[10px] text-purple-700">การวัดผลปลายภาคเรียน</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                        {detailedScoreBreakdown.overall.final.percentage}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="text-slate-500 font-medium">คะแนนที่ได้สะสม:</span>
                      <span className="font-bold text-purple-900 text-sm font-mono">
                        {detailedScoreBreakdown.overall.final.earned}{' '}
                        <span className="text-slate-400 font-normal text-xs">
                          / {detailedScoreBreakdown.overall.final.max}
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-purple-100/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            detailedScoreBreakdown.overall.final.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Personalized Learning Feedback & Recommendations */}
            {(() => {
              const storedFeedback = storage.getStudentFeedback(selectedStudent.id);
              const feedback =
                storedFeedback ||
                (fullReport
                  ? generateStudentLearningFeedback(selectedStudent, fullReport)
                  : null);

              if (!feedback) return null;

              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-indigo-100 dark:border-slate-800 shadow-md space-y-4 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Lightbulb className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                            ข้อเสนอแนะและคำแนะนำเพื่อการพัฒนาการเรียนรู้
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800">
                            วิเคราะห์เฉพาะบุคคล
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ประเมินจากผลสัมฤทธิ์ทางการเรียนเฉลี่ยและจุดเด่นรายวิชา
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {feedback.performanceTier === 'excellent'
                          ? '🌟 ระดับยอดเยี่ยม'
                          : feedback.performanceTier === 'very_good'
                          ? '⭐ ระดับดีมาก'
                          : feedback.performanceTier === 'good'
                          ? '✨ ระดับดี'
                          : feedback.performanceTier === 'moderate'
                          ? '🌱 ระดับพัฒนาได้ต่อเนื่อง'
                          : '⚠️ ควรได้รับการดูแลใกล้ชิด'}
                      </span>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    "{feedback.comment}"
                  </div>

                  {/* Strengths & Growth Areas Tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {feedback.strengths && feedback.strengths.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>จุดเด่นทางวิชาการ (Strengths):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {feedback.strengths.map((subj, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 font-semibold border border-emerald-200 dark:border-emerald-800 text-xs shadow-2xs"
                            >
                              ⭐ {subj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {feedback.growthAreas && feedback.growthAreas.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <Target className="w-4 h-4 text-amber-600" />
                          <span>วิชาที่ควรเน้นทบทวนเพิ่ม (Growth Areas):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {feedback.growthAreas.map((subj, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-xl bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 font-semibold border border-amber-200 dark:border-amber-800 text-xs shadow-2xs"
                            >
                              💡 {subj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Steps */}
                  {feedback.actionSteps && feedback.actionSteps.length > 0 && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 text-xs space-y-2">
                      <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>3 คำแนะนำเชิงปฏิบัติเพื่อยกระดับผลการเรียน:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {feedback.actionSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tab Navigation for Views */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 no-print overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveViewTab('yearly')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
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
                onClick={() => setActiveViewTab('breakdown')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeViewTab === 'breakdown'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-black ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:bg-amber-50/70 border border-slate-200'
                }`}
              >
                <Layers
                  className={`w-4 h-4 ${
                    activeViewTab === 'breakdown' ? 'fill-slate-950 text-slate-950' : 'text-amber-600'
                  }`}
                />
                <span>แจงรายละเอียดคะแนนทุกส่วน</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                    activeViewTab === 'breakdown'
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  3 ส่วนหลัก
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('term-1')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
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
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeViewTab === 'term-2'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>คะแนนเก็บ ภาคเรียนที่ 2</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('progress')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeViewTab === 'progress'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>กราฟพัฒนาการ (Recharts)</span>
              </button>
            </div>

            {/* VIEW 0: Progress Chart */}
            {activeViewTab === 'progress' && selectedStudent && (
              <div className="animate-in fade-in">
                <StudentProgressChart
                  student={selectedStudent}
                  allStudents={allStudents}
                  subjects={subjects}
                  allScoreItems={allScoreItems}
                  allScores={allScores}
                  terms={terms}
                />
              </div>
            )}

            {/* VIEW 1: Yearly Summary Table */}
            {activeViewTab === 'yearly' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>ตารางสรุปผลการเรียนทุกรายวิชา (ตลอดปีการศึกษา)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      คะแนนเต็มแต่ละภาคเรียน 50 คะแนน รวมทั้งปี 100 คะแนน • คลิกที่ชื่อวิชาหรือปุ่มเพื่อดูแจงคะแนน 3 ส่วน
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={
                        expandedYearlySubjectIds.size === subjects.length
                          ? handleCollapseAllYearlySubjects
                          : handleExpandAllYearlySubjects
                      }
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {expandedYearlySubjectIds.size === subjects.length ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>ย่อรายละเอียดทั้งหมด</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>ขยายดูแจงคะแนนทุกวิชา</span>
                        </>
                      )}
                    </button>
                    <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                      เกรดเฉลี่ยสะสม GPA: {fullReport?.gpa.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-2 text-center w-10"></th>
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
                        const isExpanded = expandedYearlySubjectIds.has(s.subject.id);
                        const subjBreakdown = detailedScoreBreakdown?.subjects.find(
                          (sb) => sb.subject.id === s.subject.id
                        );

                        return (
                          <React.Fragment key={s.subject.id}>
                            <tr
                              onClick={() => handleToggleExpandYearlySubject(s.subject.id)}
                              className={`transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-3 px-2 text-center text-slate-400">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-600 mx-auto" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400 mx-auto" />
                                )}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-mono font-medium text-slate-600">
                                {s.subject.code}
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{s.subject.name}</span>
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-normal">
                                    คลิกดูแจงคะแนน
                                  </span>
                                </div>
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
                                  ? s.status === 'ร'
                                    ? 'รอการตัดสิน'
                                    : 'ไม่สมบูรณ์'
                                  : gradeInfo.description}
                              </td>
                            </tr>

                            {/* Inline Expandable 3-part Score Breakdown */}
                            {isExpanded && subjBreakdown && (
                              <tr className="bg-slate-50/90 border-y border-indigo-100/80 animate-in fade-in duration-150">
                                <td colSpan={10} className="p-4 sm:p-5">
                                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-xs space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                          <Layers className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-sm text-slate-900">
                                            แจงรายละเอียดคะแนนวิชา {s.subject.name} ({s.subject.code})
                                          </h4>
                                          <p className="text-[11px] text-slate-500">
                                            แจกแจงตาม 3 ส่วนหลัก: คะแนนเก็บระหว่างเรียน + สอบกลางภาค + สอบปลายภาค
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveViewTab('breakdown');
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>เปิดหน้าแจงคะแนนแบบเต็ม</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* 3 Components Mini Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      {/* 1. Regular */}
                                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                                              1
                                            </span>
                                            <span>คะแนนเก็บระหว่างเรียน</span>
                                          </span>
                                          <span className="font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">
                                            {Math.round(
                                              ((subjBreakdown.term1.regular.earned +
                                                subjBreakdown.term2.regular.earned) /
                                                Math.max(
                                                  1,
                                                  subjBreakdown.term1.regular.max +
                                                    subjBreakdown.term2.regular.max
                                                )) *
                                                100
                                            )}
                                            %
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-600 flex justify-between">
                                          <span>เทอม 1: {subjBreakdown.term1.regular.earned} / {subjBreakdown.term1.regular.max}</span>
                                          <span>เทอม 2: {subjBreakdown.term2.regular.earned} / {subjBreakdown.term2.regular.max}</span>
                                        </div>
                                        <div className="font-bold text-emerald-900 text-xs">
                                          รวมทั้งปี: {subjBreakdown.term1.regular.earned + subjBreakdown.term2.regular.earned} /{' '}
                                          {subjBreakdown.term1.regular.max + subjBreakdown.term2.regular.max} คะแนน
                                        </div>
                                      </div>

                                      {/* 2. Midterm */}
                                      <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-sky-950 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                                              2
                                            </span>
                                            <span>คะแนนสอบกลางภาค</span>
                                          </span>
                                          <span className="font-black text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded text-[10px]">
                                            {Math.round(
                                              ((subjBreakdown.term1.midterm.earned +
                                                subjBreakdown.term2.midterm.earned) /
                                                Math.max(
                                                  1,
                                                  subjBreakdown.term1.midterm.max +
                                                    subjBreakdown.term2.midterm.max
                                                )) *
                                                100
                                            )}
                                            %
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-600 flex justify-between">
                                          <span>เทอม 1: {subjBreakdown.term1.midterm.earned} / {subjBreakdown.term1.midterm.max}</span>
                                          <span>เทอม 2: {subjBreakdown.term2.midterm.earned} / {subjBreakdown.term2.midterm.max}</span>
                                        </div>
                                        <div className="font-bold text-sky-900 text-xs">
                                          รวมทั้งปี: {subjBreakdown.term1.midterm.earned + subjBreakdown.term2.midterm.earned} /{' '}
                                          {subjBreakdown.term1.midterm.max + subjBreakdown.term2.midterm.max} คะแนน
                                        </div>
                                      </div>

                                      {/* 3. Final */}
                                      <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-purple-950 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                                              3
                                            </span>
                                            <span>คะแนนสอบปลายภาค</span>
                                          </span>
                                          <span className="font-black text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded text-[10px]">
                                            {Math.round(
                                              ((subjBreakdown.term1.final.earned +
                                                subjBreakdown.term2.final.earned) /
                                                Math.max(
                                                  1,
                                                  subjBreakdown.term1.final.max +
                                                    subjBreakdown.term2.final.max
                                                )) *
                                                100
                                            )}
                                            %
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-600 flex justify-between">
                                          <span>เทอม 1: {subjBreakdown.term1.final.earned} / {subjBreakdown.term1.final.max}</span>
                                          <span>เทอม 2: {subjBreakdown.term2.final.earned} / {subjBreakdown.term2.final.max}</span>
                                        </div>
                                        <div className="font-bold text-purple-900 text-xs">
                                          รวมทั้งปี: {subjBreakdown.term1.final.earned + subjBreakdown.term2.final.earned} /{' '}
                                          {subjBreakdown.term1.final.max + subjBreakdown.term2.final.max} คะแนน
                                        </div>
                                      </div>
                                    </div>

                                    {/* Itemized table for this subject */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                      <div className="bg-slate-100/80 px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>รายการชิ้นงานและข้อสอบทั้งหมดในวิชานี้</span>
                                        <span className="text-[11px] text-slate-500 font-normal">
                                          รวม{' '}
                                          {subjBreakdown.term1.regular.itemsCount +
                                            subjBreakdown.term1.midterm.itemsCount +
                                            subjBreakdown.term1.final.itemsCount +
                                            subjBreakdown.term2.regular.itemsCount +
                                            subjBreakdown.term2.midterm.itemsCount +
                                            subjBreakdown.term2.final.itemsCount}{' '}
                                          รายการ
                                        </span>
                                      </div>
                                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                        {[
                                          ...subjBreakdown.term1.regular.items.map((i) => ({ ...i, term: 'เทอม 1', catLabel: 'คะแนนเก็บ', catColor: 'bg-emerald-100 text-emerald-800' })),
                                          ...subjBreakdown.term1.midterm.items.map((i) => ({ ...i, term: 'เทอม 1', catLabel: 'กลางภาค', catColor: 'bg-sky-100 text-sky-800' })),
                                          ...subjBreakdown.term1.final.items.map((i) => ({ ...i, term: 'เทอม 1', catLabel: 'ปลายภาค', catColor: 'bg-purple-100 text-purple-800' })),
                                          ...subjBreakdown.term2.regular.items.map((i) => ({ ...i, term: 'เทอม 2', catLabel: 'คะแนนเก็บ', catColor: 'bg-emerald-100 text-emerald-800' })),
                                          ...subjBreakdown.term2.midterm.items.map((i) => ({ ...i, term: 'เทอม 2', catLabel: 'กลางภาค', catColor: 'bg-sky-100 text-sky-800' })),
                                          ...subjBreakdown.term2.final.items.map((i) => ({ ...i, term: 'เทอม 2', catLabel: 'ปลายภาค', catColor: 'bg-purple-100 text-purple-800' })),
                                        ].map((it, itemIdx) => (
                                          <div
                                            key={`${it.item.id}_${itemIdx}`}
                                            className="px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                                          >
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                              <span className="text-[10px] text-slate-400 font-mono w-6">
                                                #{itemIdx + 1}
                                              </span>
                                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${it.catColor}`}>
                                                {it.catLabel}
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                                                [{it.term}]
                                              </span>
                                              <span className="font-medium text-slate-800 truncate">
                                                {it.item.name}
                                              </span>
                                              {it.note && (
                                                <span className="text-[10px] text-slate-400 italic shrink-0">
                                                  ({it.note})
                                                </span>
                                              )}
                                            </div>

                                            <div className="shrink-0 text-right">
                                              {it.status === 'absent' ? (
                                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                                  ขาดสอบ (ร)
                                                </span>
                                              ) : it.status === 'missing' ? (
                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                  ไม่ส่งงาน (มส)
                                                </span>
                                              ) : typeof it.score === 'number' ? (
                                                <span className="font-bold font-mono text-slate-900">
                                                  {it.score} <span className="text-slate-400 font-normal">/ {it.item.max_score}</span>
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic">ยังไม่กรอก</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-xs sm:text-sm text-slate-800 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-3.5 px-4 text-right">
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

            {/* VIEW: Comprehensive Score Breakdown (แจงรายละเอียดคะแนนทุกส่วนอย่างละเอียด 3 ส่วนหลัก) */}
            {activeViewTab === 'breakdown' && detailedScoreBreakdown && (
              <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
                {/* Control and Filter Bar */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-500" />
                        <span>แจงรายละเอียดส่วนประกอบคะแนนครบทุกส่วน</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        โครงสร้างคะแนนแบ่งออกเป็น 3 ส่วนหลัก: คะแนนเก็บระหว่างเรียน, สอบกลางภาค และสอบปลายภาค
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={
                          expandedBreakdownSubjectIds.size === subjects.length
                            ? handleCollapseAllBreakdownSubjects
                            : handleExpandAllBreakdownSubjects
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {expandedBreakdownSubjectIds.size === subjects.length ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>ย่อทุกวิชา</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>ขยายทุกวิชา</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Filters Grid */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    {/* Term Selector */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>ภาคเรียน:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setBreakdownTermFilter('all')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownTermFilter === 'all'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ทั้งปีการศึกษา (100)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownTermFilter('term-1')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownTermFilter === 'term-1'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ภาคเรียนที่ 1 (50)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownTermFilter('term-2')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownTermFilter === 'term-2'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ภาคเรียนที่ 2 (50)
                      </button>
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>ส่วนคะแนน:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setBreakdownCategoryFilter('all')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownCategoryFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ทั้งหมด (3 ส่วน)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownCategoryFilter('regular')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownCategoryFilter === 'regular'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        1. คะแนนเก็บ
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownCategoryFilter('midterm')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownCategoryFilter === 'midterm'
                            ? 'bg-sky-600 text-white'
                            : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                        }`}
                      >
                        2. กลางภาค
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownCategoryFilter('final')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          breakdownCategoryFilter === 'final'
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                        }`}
                      >
                        3. ปลายภาค
                      </button>
                    </div>

                    {/* Search query input */}
                    <div className="relative w-full md:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={breakdownSearchQuery}
                        onChange={(e) => setBreakdownSearchQuery(e.target.value)}
                        placeholder="ค้นหาชิ้นงาน หรือชื่อวิชา..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subject Cards with Full Breakdown */}
                <div className="space-y-4">
                  {detailedScoreBreakdown.subjects
                    .filter((sb) => {
                      if (!breakdownSearchQuery.trim()) return true;
                      const q = breakdownSearchQuery.trim().toLowerCase();
                      const matchSubj =
                        sb.subject.name.toLowerCase().includes(q) ||
                        sb.subject.code.toLowerCase().includes(q);
                      if (matchSubj) return true;
                      // Match inside any item
                      const allItems = [
                        ...sb.term1.regular.items,
                        ...sb.term1.midterm.items,
                        ...sb.term1.final.items,
                        ...sb.term2.regular.items,
                        ...sb.term2.midterm.items,
                        ...sb.term2.final.items,
                      ];
                      return allItems.some((i) => i.item.name.toLowerCase().includes(q));
                    })
                    .map((sb) => {
                      const isCollapsed = expandedBreakdownSubjectIds.has(sb.subject.id);
                      // Determine visible categories
                      const showRegular =
                        breakdownCategoryFilter === 'all' || breakdownCategoryFilter === 'regular';
                      const showMidterm =
                        breakdownCategoryFilter === 'all' || breakdownCategoryFilter === 'midterm';
                      const showFinal =
                        breakdownCategoryFilter === 'all' || breakdownCategoryFilter === 'final';

                      // Compute active terms items
                      const getActiveCategoryData = (cat: 'regular' | 'midterm' | 'final') => {
                        if (breakdownTermFilter === 'term-1') {
                          return sb.term1[cat];
                        }
                        if (breakdownTermFilter === 'term-2') {
                          return sb.term2[cat];
                        }
                        // 'all': combine term1 and term2
                        const t1 = sb.term1[cat];
                        const t2 = sb.term2[cat];
                        const earned = Math.round((t1.earned + t2.earned) * 10) / 10;
                        const max = t1.max + t2.max;
                        const percentage = max > 0 ? Math.round((earned / max) * 1000) / 10 : 0;
                        return {
                          earned,
                          max,
                          percentage,
                          hasAbsent: t1.hasAbsent || t2.hasAbsent,
                          hasMissing: t1.hasMissing || t2.hasMissing,
                          itemsCount: t1.itemsCount + t2.itemsCount,
                          items: [
                            ...t1.items.map((i) => ({ ...i, termName: 'เทอม 1' })),
                            ...t2.items.map((i) => ({ ...i, termName: 'เทอม 2' })),
                          ],
                        };
                      };

                      const regularData = getActiveCategoryData('regular');
                      const midtermData = getActiveCategoryData('midterm');
                      const finalData = getActiveCategoryData('final');

                      const currentScoreTotal =
                        breakdownTermFilter === 'term-1'
                          ? sb.term1.total
                          : breakdownTermFilter === 'term-2'
                          ? sb.term2.total
                          : sb.yearTotal;

                      const currentScoreMax =
                        breakdownTermFilter === 'term-1'
                          ? sb.term1.max
                          : breakdownTermFilter === 'term-2'
                          ? sb.term2.max
                          : sb.yearMax;

                      return (
                        <div
                          key={sb.subject.id}
                          className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all overflow-hidden"
                        >
                          {/* Subject Header Strip */}
                          <div
                            onClick={() => handleToggleExpandBreakdownSubject(sb.subject.id)}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-gradient-to-r from-slate-50/70 via-white to-indigo-50/30 hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                {sb.grade}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-bold">
                                    {sb.subject.code}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {sb.subject.credit} หน่วยกิต
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                                  <span>{sb.subject.name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sb.gradeBadge}`}
                                  >
                                    เกรด {sb.grade} ({sb.description})
                                  </span>
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* 3 mini pill indicators */}
                              <div className="hidden lg:flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                  📁 เก็บ: {regularData.earned}/{regularData.max} ({regularData.percentage}%)
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                                  📝 กลาง: {midtermData.earned}/{midtermData.max} ({midtermData.percentage}%)
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                                  🎯 ปลาย: {finalData.earned}/{finalData.max} ({finalData.percentage}%)
                                </span>
                              </div>

                              <div className="text-right">
                                <div className="text-lg sm:text-xl font-black text-indigo-700 font-mono">
                                  {currentScoreTotal}{' '}
                                  <span className="text-xs font-normal text-slate-400">
                                    / {currentScoreMax}
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-500">
                                  {breakdownTermFilter === 'term-1'
                                    ? 'คะแนนเทอม 1'
                                    : breakdownTermFilter === 'term-2'
                                    ? 'คะแนนเทอม 2'
                                    : 'คะแนนรวมทั้งปี'}
                                </div>
                              </div>

                              <div className="p-1 rounded-lg text-slate-400">
                                {isCollapsed ? (
                                  <ChevronDown className="w-5 h-5 text-indigo-600" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded 3 Categories Breakdown Content */}
                          {!isCollapsed && (
                            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3">
                                {/* PART 1: REGULAR ASSIGNMENTS */}
                                {showRegular && (
                                  <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 overflow-hidden flex flex-col justify-between">
                                    <div className="p-3.5 border-b border-emerald-100 bg-emerald-50/70 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                                          1
                                        </div>
                                        <div>
                                          <h5 className="font-bold text-xs text-emerald-950">
                                            คะแนนเก็บระหว่างเรียน
                                          </h5>
                                          <span className="text-[10px] text-emerald-700">
                                            ใบงาน / แบบฝึกหัด ({regularData.itemsCount} รายการ)
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-xs text-emerald-950">
                                          {regularData.earned} / {regularData.max}
                                        </div>
                                        <div className="text-[10px] font-extrabold text-emerald-700">
                                          {regularData.percentage}%
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="divide-y divide-emerald-100/60 p-2 space-y-1">
                                      {regularData.items.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400 italic">
                                          ไม่มีรายการคะแนนเก็บในหมวดนี้
                                        </div>
                                      ) : (
                                        regularData.items.map((it, itemIdx) => (
                                          <div
                                            key={`${it.item.id}_${itemIdx}`}
                                            className="p-2 rounded-xl bg-white/90 border border-emerald-100/70 text-xs flex items-center justify-between gap-2 shadow-2xs"
                                          >
                                            <div className="min-w-0 pr-1">
                                              <div className="font-medium text-slate-800 truncate">
                                                {it.item.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                {'termName' in it && <span>{(it as any).termName} •</span>}
                                                <span>เต็ม {it.item.max_score} คะแนน</span>
                                                {it.note && (
                                                  <span className="text-amber-700 italic">
                                                    • {it.note}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                              {it.status === 'absent' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                                  ขาดสอบ
                                                </span>
                                              ) : it.status === 'missing' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                  ค้างส่ง
                                                </span>
                                              ) : typeof it.score === 'number' ? (
                                                <span className="font-mono font-bold text-emerald-950">
                                                  {it.score}{' '}
                                                  <span className="text-slate-400 font-normal">
                                                    /{it.item.max_score}
                                                  </span>
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic text-[11px]">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* PART 2: MIDTERM EXAM */}
                                {showMidterm && (
                                  <div className="rounded-2xl border border-sky-200/90 bg-sky-50/20 overflow-hidden flex flex-col justify-between">
                                    <div className="p-3.5 border-b border-sky-100 bg-sky-50/70 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                                          2
                                        </div>
                                        <div>
                                          <h5 className="font-bold text-xs text-sky-950">
                                            คะแนนสอบกลางภาค
                                          </h5>
                                          <span className="text-[10px] text-sky-700">
                                            การวัดผลกลางภาค ({midtermData.itemsCount} รายการ)
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-xs text-sky-950">
                                          {midtermData.earned} / {midtermData.max}
                                        </div>
                                        <div className="text-[10px] font-extrabold text-sky-700">
                                          {midtermData.percentage}%
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="divide-y divide-sky-100/60 p-2 space-y-1">
                                      {midtermData.items.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400 italic">
                                          ไม่มีรายการสอบกลางภาคในหมวดนี้
                                        </div>
                                      ) : (
                                        midtermData.items.map((it, itemIdx) => (
                                          <div
                                            key={`${it.item.id}_${itemIdx}`}
                                            className="p-2 rounded-xl bg-white/90 border border-sky-100/70 text-xs flex items-center justify-between gap-2 shadow-2xs"
                                          >
                                            <div className="min-w-0 pr-1">
                                              <div className="font-medium text-slate-800 truncate">
                                                {it.item.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                {'termName' in it && <span>{(it as any).termName} •</span>}
                                                <span>เต็ม {it.item.max_score} คะแนน</span>
                                                {it.note && (
                                                  <span className="text-amber-700 italic">
                                                    • {it.note}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                              {it.status === 'absent' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                                  ขาดสอบ
                                                </span>
                                              ) : it.status === 'missing' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                  ค้างส่ง
                                                </span>
                                              ) : typeof it.score === 'number' ? (
                                                <span className="font-mono font-bold text-sky-950">
                                                  {it.score}{' '}
                                                  <span className="text-slate-400 font-normal">
                                                    /{it.item.max_score}
                                                  </span>
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic text-[11px]">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* PART 3: FINAL EXAM */}
                                {showFinal && (
                                  <div className="rounded-2xl border border-purple-200/90 bg-purple-50/20 overflow-hidden flex flex-col justify-between">
                                    <div className="p-3.5 border-b border-purple-100 bg-purple-50/70 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                          3
                                        </div>
                                        <div>
                                          <h5 className="font-bold text-xs text-purple-950">
                                            คะแนนสอบปลายภาค
                                          </h5>
                                          <span className="text-[10px] text-purple-700">
                                            การวัดผลปลายภาค ({finalData.itemsCount} รายการ)
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-xs text-purple-950">
                                          {finalData.earned} / {finalData.max}
                                        </div>
                                        <div className="text-[10px] font-extrabold text-purple-700">
                                          {finalData.percentage}%
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="divide-y divide-purple-100/60 p-2 space-y-1">
                                      {finalData.items.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400 italic">
                                          ไม่มีรายการสอบปลายภาคในหมวดนี้
                                        </div>
                                      ) : (
                                        finalData.items.map((it, itemIdx) => (
                                          <div
                                            key={`${it.item.id}_${itemIdx}`}
                                            className="p-2 rounded-xl bg-white/90 border border-purple-100/70 text-xs flex items-center justify-between gap-2 shadow-2xs"
                                          >
                                            <div className="min-w-0 pr-1">
                                              <div className="font-medium text-slate-800 truncate">
                                                {it.item.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                {'termName' in it && <span>{(it as any).termName} •</span>}
                                                <span>เต็ม {it.item.max_score} คะแนน</span>
                                                {it.note && (
                                                  <span className="text-amber-700 italic">
                                                    • {it.note}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                              {it.status === 'absent' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                                  ขาดสอบ
                                                </span>
                                              ) : it.status === 'missing' ? (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                  ค้างส่ง
                                                </span>
                                              ) : typeof it.score === 'number' ? (
                                                <span className="font-mono font-bold text-purple-950">
                                                  {it.score}{' '}
                                                  <span className="text-slate-400 font-normal">
                                                    /{it.item.max_score}
                                                  </span>
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic text-[11px]">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

                          {/* Expanded Items Breakdown grouped by 3 main parts */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                                <span>แจงคะแนนย่อยตาม 3 ส่วนหลัก ({items.length} รายการ)</span>
                                <span className="text-indigo-600">คะแนนเต็มรวม {items.reduce((acc, it) => acc + (it.max_score || 0), 0)} คะแนน</span>
                              </div>

                              {(['regular', 'midterm', 'final'] as const).map((cat) => {
                                const catItems = items.filter((it) => getItemCategory(it) === cat);
                                if (catItems.length === 0) return null;

                                const catTitle =
                                  cat === 'regular'
                                    ? '1. คะแนนเก็บระหว่างเรียน'
                                    : cat === 'midterm'
                                    ? '2. คะแนนสอบกลางภาค'
                                    : '3. คะแนนสอบปลายภาค';

                                const catSubtitle =
                                  cat === 'regular'
                                    ? 'ใบงาน / แบบฝึกหัด / กิจกรรม'
                                    : cat === 'midterm'
                                    ? 'การวัดผลกลางภาคเรียน'
                                    : 'การวัดผลปลายภาคเรียน';

                                const catColor =
                                  cat === 'regular'
                                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                                    : cat === 'midterm'
                                    ? 'border-sky-200 bg-sky-50/40 text-sky-950'
                                    : 'border-purple-200 bg-purple-50/40 text-purple-950';

                                const catBadgeColor =
                                  cat === 'regular'
                                    ? 'bg-emerald-600 text-white'
                                    : cat === 'midterm'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-purple-600 text-white';

                                let catEarned = 0;
                                let catMax = 0;
                                catItems.forEach((it) => {
                                  catMax += it.max_score || 0;
                                  const sc = allScores.find(
                                    (s) => s.student_id === selectedStudent.id && s.score_item_id === it.id
                                  );
                                  if (sc && sc.status === 'normal' && typeof sc.score === 'number') {
                                    catEarned += sc.score;
                                  }
                                });

                                return (
                                  <div key={cat} className={`rounded-xl border p-2.5 space-y-2 ${catColor}`}>
                                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] ${catBadgeColor}`}>
                                          {cat === 'regular' ? '1' : cat === 'midterm' ? '2' : '3'}
                                        </span>
                                        <span className="font-bold">{catTitle}</span>
                                        <span className="text-[10px] text-slate-500 hidden sm:inline">({catSubtitle})</span>
                                      </div>
                                      <div className="font-mono font-bold text-xs">
                                        {Math.round(catEarned * 10) / 10}{' '}
                                        <span className="text-slate-400 font-normal">/ {catMax}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      {catItems.map((item) => {
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
                                            className="p-2 rounded-lg bg-white/90 border border-slate-100 flex items-center justify-between text-xs shadow-2xs"
                                          >
                                            <div className="min-w-0 pr-2">
                                              <div className="font-medium text-slate-800 truncate">
                                                {item.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <span>เต็ม {item.max_score} คะแนน</span>
                                                {scoreRecord?.note && (
                                                  <span className="text-amber-700 italic">
                                                    • {scoreRecord.note}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                              {isAbsent ? (
                                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                                  ขาดสอบ (ร)
                                                </span>
                                              ) : isMissing ? (
                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
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
              <div className="text-center pb-4 border-b-2 border-slate-900 mb-4 space-y-1">
                <div className="flex justify-center mb-1">
                  <SchoolLogo settings={schoolSettings} size="md" />
                </div>
                <div className="text-xs font-bold uppercase">
                  {schoolSettings.ministry || 'กระทรวงศึกษาธิการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน'}
                </div>
                <h2 className="text-lg font-bold">
                  ใบแจ้งผลการเรียนและคะแนนสะสมรายบุคคล
                </h2>
                <div className="text-sm font-bold">
                  {schoolSettings.school_name || user?.school_name || 'โรงเรียนประถมศึกษา'}
                </div>
                <div className="text-xs text-slate-600">
                  ปีการศึกษา {studentClassroom?.academic_year || schoolSettings.academic_year || '2569'} • {studentClassroom?.level} (ห้อง {studentClassroom?.name})
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
