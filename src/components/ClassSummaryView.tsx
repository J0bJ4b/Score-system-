import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Subject, Student, ScoreItem, Score, Term, Classroom } from '../types';
import { getSubjectSummaryForStudent, getStudentFullReport } from '../utils/gradeCalculator';
import {
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Percent,
  Check,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface ClassSummaryViewProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  activeClassroom: Classroom;
  onNavigateToGrading: () => void;
  onNavigateToSubjectSummary: () => void;
  onNavigateToRemedial?: () => void;
}

// Grade tier colors and metadata
export interface GradeTierConfig {
  key: string;
  label: string;
  letter: string;
  thaiLabel: string;
  scoreRange: string;
  color: string;
  hoverColor: string;
  badgeBg: string;
  textColor: string;
  description: string;
}

export const GRADE_TIERS_LETTER: GradeTierConfig[] = [
  {
    key: 'A',
    label: 'เกรด A',
    letter: 'A',
    thaiLabel: 'เกรด 4 (ดีเยี่ยม)',
    scoreRange: '80 - 100 คะแนน',
    color: '#10b981', // emerald-500
    hoverColor: '#059669',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    description: 'ผลการเรียนระดับดีเยี่ยม (คะแนนร้อยละ 80 ขึ้นไป)',
  },
  {
    key: 'B',
    label: 'เกรด B',
    letter: 'B',
    thaiLabel: 'เกรด 3 - 3.5 (ดีมาก/ดี)',
    scoreRange: '70 - 79 คะแนน',
    color: '#06b6d4', // cyan-500
    hoverColor: '#0891b2',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    description: 'ผลการเรียนระดับดีมากถึงดี (คะแนนร้อยละ 70-79)',
  },
  {
    key: 'C',
    label: 'เกรด C',
    letter: 'C',
    thaiLabel: 'เกรด 2 - 2.5 (ปานกลาง)',
    scoreRange: '60 - 69 คะแนน',
    color: '#f59e0b', // amber-500
    hoverColor: '#d97706',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-400',
    description: 'ผลการเรียนระดับปานกลาง (คะแนนร้อยละ 60-69)',
  },
  {
    key: 'D',
    label: 'เกรด D',
    letter: 'D',
    thaiLabel: 'เกรด 1 - 1.5 (ผ่านเกณฑ์)',
    scoreRange: '50 - 59 คะแนน',
    color: '#f97316', // orange-500
    hoverColor: '#ea580c',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-400',
    description: 'ผลการเรียนระดับพอใช้และผ่านเกณฑ์ขั้นต่ำ (คะแนนร้อยละ 50-59)',
  },
  {
    key: 'F',
    label: 'เกรด F',
    letter: 'F',
    thaiLabel: 'เกรด 0 (ไม่ผ่านเกณฑ์)',
    scoreRange: 'ต่ำกว่า 50 คะแนน',
    color: '#ef4444', // rose-500
    hoverColor: '#dc2626',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    textColor: 'text-rose-700 dark:text-rose-400',
    description: 'ไม่ผ่านเกณฑ์การประเมิน ต้องดำเนินการสอนซ่อมเสริม',
  },
  {
    key: 'SPECIAL',
    label: 'ติด ร / มส',
    letter: 'ร / มส',
    thaiLabel: 'ขาดสอบ / ค้างส่งงาน',
    scoreRange: 'รอตัดสิน',
    color: '#8b5cf6', // violet-500
    hoverColor: '#7c3aed',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-400',
    description: 'ติด ร (ขาดสอบ) หรือติด มส (เวลาเรียนไม่ถึง/ไม่ส่งงาน)',
  },
];

export const ClassSummaryView: React.FC<ClassSummaryViewProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  activeClassroom,
  onNavigateToGrading,
  onNavigateToSubjectSummary,
  onNavigateToRemedial,
}) => {
  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all'); // 'all' or subject.id
  const [gradeScaleMode, setGradeScaleMode] = useState<'letter' | 'numeric'>('letter'); // Letter A-F vs Thai 4-0
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const [searchStudent, setSearchStudent] = useState<string>('');

  // 1. Compute scores and grades per student and per subject
  const detailedRecords = useMemo(() => {
    const list: Array<{
      student: Student;
      subject: Subject;
      term1Score: number;
      term2Score: number;
      totalScore: number;
      grade: string;
      gradePoint: number;
      statusFlag: 'ร' | 'มส' | 'ปกติ';
      letterGrade: 'A' | 'B' | 'C' | 'D' | 'F' | 'SPECIAL';
    }> = [];

    students.forEach((stu) => {
      subjects.forEach((sub) => {
        const summary = getSubjectSummaryForStudent(
          stu.id,
          sub.id,
          allScoreItems,
          allScores,
          terms
        );

        let letter: 'A' | 'B' | 'C' | 'D' | 'F' | 'SPECIAL' = 'F';
        if (summary.status_flag === 'ร' || summary.status_flag === 'มส') {
          letter = 'SPECIAL';
        } else if (summary.total_score >= 80) {
          letter = 'A';
        } else if (summary.total_score >= 70) {
          letter = 'B';
        } else if (summary.total_score >= 60) {
          letter = 'C';
        } else if (summary.total_score >= 50) {
          letter = 'D';
        } else {
          letter = 'F';
        }

        list.push({
          student: stu,
          subject: sub,
          term1Score: summary.term1_score,
          term2Score: summary.term2_score,
          totalScore: summary.total_score,
          grade: summary.grade,
          gradePoint: summary.grade_point,
          statusFlag: summary.status_flag || 'ปกติ',
          letterGrade: letter,
        });
      });
    });

    return list;
  }, [students, subjects, allScoreItems, allScores, terms]);

  // Student reports for Overall GPA
  const studentReports = useMemo(() => {
    return students.map((stu) => {
      const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);
      let gpaLetter: 'A' | 'B' | 'C' | 'D' | 'F' | 'SPECIAL' = 'F';
      const hasSpecial = report.subjects.some(s => s.status === 'ร' || s.status === 'มส');

      if (hasSpecial) {
        gpaLetter = 'SPECIAL';
      } else if (report.gpa >= 3.5) {
        gpaLetter = 'A';
      } else if (report.gpa >= 2.5) {
        gpaLetter = 'B';
      } else if (report.gpa >= 1.5) {
        gpaLetter = 'C';
      } else if (report.gpa >= 1.0) {
        gpaLetter = 'D';
      } else {
        gpaLetter = 'F';
      }

      return {
        student: stu,
        report,
        gpa: report.gpa,
        gpaLetter,
      };
    });
  }, [students, subjects, allScoreItems, allScores, terms]);

  // 2. Filtered records based on selectedSubjectId
  const activeRecords = useMemo(() => {
    if (selectedSubjectId === 'all') {
      return detailedRecords;
    }
    return detailedRecords.filter((r) => r.subject.id === selectedSubjectId);
  }, [detailedRecords, selectedSubjectId]);

  // 3. Distribution data for the Bar Chart
  const distributionChartData = useMemo(() => {
    if (gradeScaleMode === 'letter') {
      return GRADE_TIERS_LETTER.map((tier) => {
        let matchingRecords: typeof detailedRecords = [];
        let matchingStudents: Student[] = [];

        if (selectedSubjectId === 'all') {
          // When all subjects are selected, we group by student's overall GPA grade
          const matchedReports = studentReports.filter((r) => r.gpaLetter === tier.key);
          matchingStudents = matchedReports.map((r) => r.student);
          // Also collect all course records in this tier for reference
          matchingRecords = detailedRecords.filter((r) => r.letterGrade === tier.key);
        } else {
          matchingRecords = activeRecords.filter((r) => r.letterGrade === tier.key);
          matchingStudents = matchingRecords.map((r) => r.student);
        }

        const count = selectedSubjectId === 'all' ? matchingStudents.length : matchingRecords.length;
        const totalBasis = selectedSubjectId === 'all' ? (students.length || 1) : (activeRecords.length || 1);
        const percentage = Math.round((count / totalBasis) * 1000) / 10;

        return {
          key: tier.key,
          label: tier.label,
          letter: tier.letter,
          thaiLabel: tier.thaiLabel,
          count,
          percentage,
          color: tier.color,
          hoverColor: tier.hoverColor,
          scoreRange: tier.scoreRange,
          students: matchingStudents,
          records: matchingRecords,
        };
      });
    } else {
      // 8-tier Thai grading system: 4, 3.5, 3, 2.5, 2, 1.5, 1, 0, plus ร/มส
      const NUMERIC_TIERS = [
        { key: '4', label: 'เกรด 4', color: '#10b981', range: '80 - 100' },
        { key: '3.5', label: 'เกรด 3.5', color: '#059669', range: '75 - 79' },
        { key: '3', label: 'เกรด 3', color: '#06b6d4', range: '70 - 74' },
        { key: '2.5', label: 'เกรด 2.5', color: '#0284c7', range: '65 - 69' },
        { key: '2', label: 'เกรด 2', color: '#f59e0b', range: '60 - 64' },
        { key: '1.5', label: 'เกรด 1.5', color: '#f97316', range: '55 - 59' },
        { key: '1', label: 'เกรด 1', color: '#ea580c', range: '50 - 54' },
        { key: '0', label: 'เกรด 0', color: '#ef4444', range: '< 50' },
        { key: 'SPECIAL', label: 'ร / มส', color: '#8b5cf6', range: 'ค้างงาน' },
      ];

      const totalBasis = activeRecords.length || 1;

      return NUMERIC_TIERS.map((tier) => {
        let matchingRecords: typeof detailedRecords = [];
        if (tier.key === 'SPECIAL') {
          matchingRecords = activeRecords.filter((r) => r.statusFlag === 'ร' || r.statusFlag === 'มส');
        } else {
          matchingRecords = activeRecords.filter((r) => r.grade === tier.key && r.statusFlag === 'ปกติ');
        }
        const count = matchingRecords.length;
        const percentage = Math.round((count / totalBasis) * 1000) / 10;
        const matchingStudents = matchingRecords.map((r) => r.student);

        return {
          key: tier.key,
          label: tier.label,
          letter: tier.key,
          thaiLabel: tier.label,
          count,
          percentage,
          color: tier.color,
          hoverColor: tier.color,
          scoreRange: tier.range,
          students: matchingStudents,
          records: matchingRecords,
        };
      });
    }
  }, [gradeScaleMode, selectedSubjectId, studentReports, detailedRecords, activeRecords, students.length]);

  // 4. Key Performance Trends
  const trendsAnalysis = useMemo(() => {
    const totalCount = distributionChartData.reduce((acc, curr) => acc + curr.count, 0) || 1;
    const sortedByCount = [...distributionChartData].sort((a, b) => b.count - a.count);
    const modeGrade = sortedByCount[0];

    // Excellence (A / 4)
    const gradeA = distributionChartData.find((d) => d.key === 'A' || d.key === '4')?.count || 0;
    const excellencePct = Math.round((gradeA / totalCount) * 100);

    // Failing / At risk (F, 0, or SPECIAL)
    const gradeF = distributionChartData.find((d) => d.key === 'F' || d.key === '0')?.count || 0;
    const gradeSpecial = distributionChartData.find((d) => d.key === 'SPECIAL')?.count || 0;
    const totalAtRisk = gradeF + gradeSpecial;
    const atRiskPct = Math.round((totalAtRisk / totalCount) * 100);

    // Passing (A, B, C, D / >= 1.0)
    const totalPassing = totalCount - totalAtRisk;
    const passRate = Math.round((totalPassing / totalCount) * 100);

    let trendDescription = '';
    let trendBadge = { text: 'ปกติ', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };

    if (passRate >= 90) {
      trendDescription = 'ผลการเรียนกระจายตัวในกลุ่มดีเยี่ยม (เกรด A และ B มากกว่า 70%) อัตราผ่านเกณฑ์สูงมาก';
      trendBadge = { text: 'ดีเยี่ยม (High Performing)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    } else if (atRiskPct > 25) {
      trendDescription = 'พบสัดส่วนนักเรียนที่ต้องการช่วยเหลือ (เกรด F, ร, มส) เกินร้อยละ 25 ควรจัดตารางสอนซ่อมเสริมเร่งด่วน';
      trendBadge = { text: 'ต้องการดูแลเร่งด่วน (Intervention Needed)', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    } else if (passRate >= 75) {
      trendDescription = 'ผลการเรียนเป็นไปตามเกณฑ์มาตรฐาน การกระจายตัวแบบสมดุล นักเรียนส่วนใหญ่ผ่านเกณฑ์การประเมิน';
      trendBadge = { text: 'มาตรฐาน (Satisfactory)', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    } else {
      trendDescription = 'มีนักเรียนบางส่วนต้องพัฒนาเพิ่มเติมในหัวข้อเก็บคะแนนและงานที่ค้างส่ง';
      trendBadge = { text: 'ควรติดตามใกล้ชิด (Moderate)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }

    return {
      modeGrade,
      excellencePct,
      atRiskPct,
      passRate,
      totalCount,
      totalAtRisk,
      totalPassing,
      trendDescription,
      trendBadge,
    };
  }, [distributionChartData]);

  // 5. Subject Matrix Breakdown: Percentage of A, B, C, D, F per subject
  const subjectsMatrix = useMemo(() => {
    return subjects.map((sub) => {
      const records = detailedRecords.filter((r) => r.subject.id === sub.id);
      const total = records.length || 1;
      const aCount = records.filter((r) => r.letterGrade === 'A').length;
      const bCount = records.filter((r) => r.letterGrade === 'B').length;
      const cCount = records.filter((r) => r.letterGrade === 'C').length;
      const dCount = records.filter((r) => r.letterGrade === 'D').length;
      const fCount = records.filter((r) => r.letterGrade === 'F').length;
      const specialCount = records.filter((r) => r.letterGrade === 'SPECIAL').length;

      const avgScore =
        records.length > 0
          ? Math.round((records.reduce((acc, curr) => acc + curr.totalScore, 0) / records.length) * 10) / 10
          : 0;

      return {
        subject: sub,
        total,
        avgScore,
        aPct: Math.round((aCount / total) * 100),
        bPct: Math.round((bCount / total) * 100),
        cPct: Math.round((cCount / total) * 100),
        dPct: Math.round((dCount / total) * 100),
        fPct: Math.round((fCount / total) * 100),
        specialPct: Math.round((specialCount / total) * 100),
        failAndSpecialCount: fCount + specialCount,
      };
    });
  }, [subjects, detailedRecords]);

  // Selected tier data for student inspector
  const activeSelectedTier = useMemo(() => {
    if (!selectedBarKey) return null;
    return distributionChartData.find((d) => d.key === selectedBarKey) || null;
  }, [distributionChartData, selectedBarKey]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header with Filters and Subject Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                สรุปผลสัมฤทธิ์ชั้นเรียน & แผนภูมิการกระจายเกรด (Class Grade Distributions)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              วิเคราะห์แนวโน้มการกระจายตัวของผลการเรียน (Grade A - F) ห้อง {activeClassroom.name} เพื่อวางแผนพัฒนาและติดตามการเรียนรู้
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Letter Grades (A-F) vs Thai Numbers (4-0) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setGradeScaleMode('letter')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  gradeScaleMode === 'letter'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ระบบตัวอักษร (A, B, C, D, F)
              </button>
              <button
                type="button"
                onClick={() => setGradeScaleMode('numeric')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  gradeScaleMode === 'numeric'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ระบบตัวเลข สพฐ. (4 - 0)
              </button>
            </div>

            <button
              type="button"
              onClick={onNavigateToSubjectSummary}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>ดูตาราง ปพ.5 ทุกวิชา</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Subject Selection */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>เลือกวิชา:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId('all');
                setSelectedBarKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSubjectId === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ภาพรวมทุกวิชา (GPA ทั้งห้อง)
            </button>

            {subjects.map((sub) => {
              const isSelected = selectedSubjectId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setSelectedBarKey(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            {selectedSubjectId === 'all' ? (
              <span>ฐานข้อมูล: นักเรียน {students.length} คน (เกรดเฉลี่ย GPA)</span>
            ) : (
              <span>
                วิชา: {subjects.find((s) => s.id === selectedSubjectId)?.name} ({subjects.find((s) => s.id === selectedSubjectId)?.code})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Trend Highlights Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pass Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">อัตราผ่านเกณฑ์ (Pass Rate)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {trendsAnalysis.passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {trendsAnalysis.totalPassing} จาก {trendsAnalysis.totalCount} รายการ (เกรด D / 1 ขึ้นไป)
          </div>
        </div>

        {/* Excellence Rate (Grade A / 4) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">เกรดดีเยี่ยม (Grade A / 4)</span>
            <Award className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-700 dark:text-cyan-400">
            {trendsAnalysis.excellencePct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            คะแนนร้อยละ 80 - 100
          </div>
        </div>

        {/* Mode Grade */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">เกรดฐานนิยม (Mode)</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300 flex items-baseline gap-1.5">
            <span>{trendsAnalysis.modeGrade?.label || 'ไม่มี'}</span>
            <span className="text-xs font-semibold text-slate-400">
              ({trendsAnalysis.modeGrade?.count || 0} รายการ)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            กลุ่มคะแนนที่นักเรียนได้มากที่สุด
          </div>
        </div>

        {/* At Risk / Remedial Needed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">ต้องดูแลช่วยเหลือ (At Risk)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${trendsAnalysis.totalAtRisk > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {trendsAnalysis.totalAtRisk} <span className="text-xs font-normal text-slate-400">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            เกรด F / 0 หรือติด ร/มส ({trendsAnalysis.atRiskPct}%)
          </div>
        </div>
      </div>

      {/* Main Bar Chart Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>
                แผนภูมิแท่งแสดงการกระจายเกรด: {selectedSubjectId === 'all' ? 'ภาพรวมเกรดเฉลี่ยทั้งห้อง' : subjects.find(s => s.id === selectedSubjectId)?.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              คลิกที่แท่งกราฟเพื่อดูรายชื่อนักเรียนในกลุ่มเกรดนั้นทันที
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">ประเมินแนวโน้ม:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${trendsAnalysis.trendBadge.color}`}>
              {trendsAnalysis.trendBadge.text}
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Component */}
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distributionChartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const clickedKey = state.activePayload[0].payload.key;
                  setSelectedBarKey(selectedBarKey === clickedKey ? null : clickedKey);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                label={{ value: 'จำนวน (คน/รายการ)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, offset: 10 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                          <span className="font-bold text-sm" style={{ color: data.color }}>
                            {data.label}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {data.scoreRange}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">จำนวน:</span>
                          <span className="font-black text-white text-sm">{data.count} คน</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">สัดส่วนในชั้น:</span>
                          <span className="font-bold text-amber-300">{data.percentage}%</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          คลิกเพื่อกรองรายชื่อนักเรียนด้านล่าง
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                animationDuration={600}
                className="cursor-pointer"
              >
                {distributionChartData.map((entry) => {
                  const isSelected = selectedBarKey === entry.key;
                  return (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      stroke={isSelected ? '#0f172a' : 'transparent'}
                      strokeWidth={isSelected ? 2.5 : 0}
                      opacity={selectedBarKey === null || isSelected ? 1 : 0.45}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution Breakdown Cards (Interactive Selector) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
          {distributionChartData.map((tier) => {
            const isSelected = selectedBarKey === tier.key;
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => setSelectedBarKey(isSelected ? null : tier.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 shadow-xs bg-white dark:bg-slate-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black" style={{ color: tier.color }}>
                    {tier.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tier.percentage}%
                  </span>
                </div>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {tier.count} <span className="text-xs font-normal text-slate-400">คน</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {tier.scoreRange}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Grade Student Roster Inspector */}
      {activeSelectedTier && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs"
                style={{ backgroundColor: activeSelectedTier.color }}
              >
                {activeSelectedTier.letter}
              </span>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                  <span>รายชื่อนักเรียนในกลุ่ม: {activeSelectedTier.label}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({activeSelectedTier.count} คน • {activeSelectedTier.percentage}% ของห้อง)
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ช่วงคะแนน {activeSelectedTier.scoreRange} • {selectedSubjectId === 'all' ? 'พิจารณาจากเกรดเฉลี่ยรวม (GPA)' : `วิชา ${subjects.find(s => s.id === selectedSubjectId)?.name}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ / เลขที่..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedBarKey(null)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>

          {/* Student Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {activeSelectedTier.students
              .filter((stu) => {
                if (!searchStudent.trim()) return true;
                const q = searchStudent.toLowerCase();
                return stu.name.toLowerCase().includes(q) || stu.student_no.toString().includes(q);
              })
              .map((stu) => {
                // Find student record
                const rec = activeSelectedTier.records.find((r) => r.student.id === stu.id);
                return (
                  <div
                    key={stu.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                        {stu.student_no}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {stu.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {stu.student_code}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {rec ? (
                        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          {rec.totalScore} <span className="text-[10px] font-normal text-slate-400">คะแนน</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          GPA {studentReports.find(r => r.student.id === stu.id)?.gpa.toFixed(2)}
                        </div>
                      )}
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold" style={{ backgroundColor: `${activeSelectedTier.color}20`, color: activeSelectedTier.color }}>
                        เกรด {rec ? rec.grade : activeSelectedTier.letter}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {(activeSelectedTier.key === 'F' || activeSelectedTier.key === '0' || activeSelectedTier.key === 'SPECIAL') && onNavigateToRemedial && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300">
              <span>
                นักเรียนในกลุ่มนี้ต้องการการสอนซ่อมเสริมเพื่อปรับปรุงผลการเรียนให้ผ่านเกณฑ์
              </span>
              <button
                type="button"
                onClick={onNavigateToRemedial}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>บันทึกสอนซ่อมเสริม</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cross-Subject Grade Comparison Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>ตารางเปรียบเทียบการกระจายเกรดทุกรายวิชา (Subject Comparison Matrix)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ช่วยให้ครูประจำชั้นเห็นภาพรวมว่าวิชาใดมีสัดส่วนคะแนนดีเยี่ยมสูง หรือวิชาใดมีนักเรียนตกค้างมากที่สุด
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>A (80+)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              <span>B (70-79)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>C (60-69)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>D (50-59)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>F (&lt;50)</span>
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3">รายวิชา</th>
                <th className="py-2.5 px-2 text-center w-20">คะแนนเฉลี่ย</th>
                <th className="py-2.5 px-3 text-center min-w-[200px]">สัดส่วนการกระจายเกรด (A / B / C / D / F)</th>
                <th className="py-2.5 px-2 text-center w-24">อัตราผ่าน</th>
                <th className="py-2.5 px-2 text-center w-28">ต้องช่วยเหลือ</th>
                <th className="py-2.5 px-2 text-center w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectsMatrix.map((item) => {
                const passRate = 100 - item.fPct - item.specialPct;
                return (
                  <tr key={item.subject.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                        {item.subject.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.subject.code} • {item.subject.credit} นก.
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center font-black text-slate-900 dark:text-slate-100 text-sm">
                      {item.avgScore}
                      <span className="text-[10px] text-slate-400 block font-normal">/ 100</span>
                    </td>

                    {/* Multi-segmented bar */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          {item.aPct > 0 && (
                            <div
                              style={{ width: `${item.aPct}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`เกรด A: ${item.aPct}%`}
                            />
                          )}
                          {item.bPct > 0 && (
                            <div
                              style={{ width: `${item.bPct}%` }}
                              className="bg-cyan-500 h-full transition-all"
                              title={`เกรด B: ${item.bPct}%`}
                            />
                          )}
                          {item.cPct > 0 && (
                            <div
                              style={{ width: `${item.cPct}%` }}
                              className="bg-amber-500 h-full transition-all"
                              title={`เกรด C: ${item.cPct}%`}
                            />
                          )}
                          {item.dPct > 0 && (
                            <div
                              style={{ width: `${item.dPct}%` }}
                              className="bg-orange-500 h-full transition-all"
                              title={`เกรด D: ${item.dPct}%`}
                            />
                          )}
                          {item.fPct > 0 && (
                            <div
                              style={{ width: `${item.fPct}%` }}
                              className="bg-rose-500 h-full transition-all"
                              title={`เกรด F: ${item.fPct}%`}
                            />
                          )}
                          {item.specialPct > 0 && (
                            <div
                              style={{ width: `${item.specialPct}%` }}
                              className="bg-purple-500 h-full transition-all"
                              title={`ร/มส: ${item.specialPct}%`}
                            />
                          )}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span className="text-emerald-600 font-semibold">A: {item.aPct}%</span>
                          <span className="text-cyan-600 font-semibold">B: {item.bPct}%</span>
                          <span className="text-amber-600 font-semibold">C: {item.cPct}%</span>
                          <span className="text-orange-600 font-semibold">D: {item.dPct}%</span>
                          <span className={item.fPct > 0 ? 'text-rose-600 font-bold' : ''}>F: {item.fPct}%</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <span className={`font-black text-xs ${passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {passRate}%
                      </span>
                    </td>

                    <td className="py-3 px-2 text-center">
                      {item.failAndSpecialCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.failAndSpecialCount} คน</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>ผ่านครบ</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(item.subject.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                      >
                        ดูกราฟ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
