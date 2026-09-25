import React, { useState } from 'react';
import { Subject, Student, ScoreItem, Score, Term, Classroom } from '../types';
import { getSubjectSummaryForStudent, getStudentFullReport } from '../utils/gradeCalculator';
import { storage } from '../services/storage';
import {
  Users,
  Award,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';

interface DashboardPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  activeClassroom: Classroom;
  classrooms: Classroom[];
  onSelectClassroom: (classroom: Classroom) => void;
  onNavigateToGrading: () => void;
  onNavigateToSubjectSummary: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  activeClassroom,
  classrooms,
  onSelectClassroom,
  onNavigateToGrading,
  onNavigateToSubjectSummary,
}) => {
  const [showComparison, setShowComparison] = useState(false);

  // 1. Calculate subject averages for Term 1 and Term 2 for active classroom
  const subjectAverages = subjects.map((sub) => {
    let t1Sum = 0;
    let t2Sum = 0;
    let totalSum = 0;

    students.forEach((stu) => {
      const summary = getSubjectSummaryForStudent(
        stu.id,
        sub.id,
        allScoreItems,
        allScores,
        terms
      );
      t1Sum += summary.term1_score;
      t2Sum += summary.term2_score;
      totalSum += summary.total_score;
    });

    const count = students.length || 1;
    return {
      subject: sub,
      term1Avg: Math.round((t1Sum / count) * 10) / 10,
      term2Avg: Math.round((t2Sum / count) * 10) / 10,
      totalAvg: Math.round((totalSum / count) * 10) / 10,
    };
  });

  // 2. Class GPA for active classroom
  const studentReports = students.map((s) =>
    getStudentFullReport(s, subjects, allScoreItems, allScores, terms)
  );
  const classGpa =
    studentReports.length > 0
      ? Math.round(
          (studentReports.reduce((acc, curr) => acc + curr.gpa, 0) /
            studentReports.length) *
            100
        ) / 100
      : 0;

  // 3. Students needing special attention
  const studentsNeedingAttention: Array<{
    student: Student;
    issues: string[];
    gpa: number;
  }> = [];

  students.forEach((stu) => {
    const issues: string[] = [];
    subjects.forEach((sub) => {
      const summary = getSubjectSummaryForStudent(
        stu.id,
        sub.id,
        allScoreItems,
        allScores,
        terms
      );
      if (summary.status_flag === 'ร') {
        issues.push(`${sub.name} (ติด ร ขาดสอบ)`);
      } else if (summary.status_flag === 'มส') {
        issues.push(`${sub.name} (ติด มส ไม่ส่งงาน)`);
      } else if (summary.grade === '0') {
        issues.push(`${sub.name} (เกรด 0 ต่ำกว่าเกณฑ์)`);
      }
    });

    const full = studentReports.find((r) => r.student.id === stu.id);
    if (issues.length > 0 || (full && full.gpa < 1.5)) {
      studentsNeedingAttention.push({
        student: stu,
        issues,
        gpa: full ? full.gpa : 0,
      });
    }
  });

  // 4. Overall Class Average Score
  const totalAvgAllSubjects =
    subjectAverages.length > 0
      ? Math.round(
          (subjectAverages.reduce((acc, curr) => acc + curr.totalAvg, 0) /
            subjectAverages.length) *
            10
        ) / 10
      : 0;

  // 5. Calculate statistics for all classrooms for comparison
  const allClassroomsStats = classrooms.map((room) => {
    const roomStudents = storage.getStudents(room.id);
    const roomReports = roomStudents.map((s) =>
      getStudentFullReport(s, subjects, allScoreItems, allScores, terms)
    );
    const roomGpa =
      roomReports.length > 0
        ? Math.round(
            (roomReports.reduce((acc, curr) => acc + curr.gpa, 0) /
              roomReports.length) *
              100
          ) / 100
        : 0;

    let roomScoreSum = 0;
    let roomScoreCount = 0;
    let atRisk = 0;

    roomStudents.forEach((stu) => {
      let stuHasRisk = false;
      subjects.forEach((sub) => {
        const sm = getSubjectSummaryForStudent(stu.id, sub.id, allScoreItems, allScores, terms);
        roomScoreSum += sm.total_score;
        roomScoreCount += 1;
        if (sm.grade === '0' || sm.status_flag !== 'ปกติ') {
          stuHasRisk = true;
        }
      });
      if (stuHasRisk) atRisk += 1;
    });

    const roomAvg = roomScoreCount > 0 ? Math.round((roomScoreSum / roomScoreCount) * 10) / 10 : 0;

    return {
      classroom: room,
      studentCount: roomStudents.length,
      gpa: roomGpa,
      avgScore: roomAvg,
      atRiskCount: atRisk,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Classroom Switcher */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold text-white mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ปีการศึกษา {activeClassroom.academic_year} • {activeClassroom.level}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              ภาพรวมผลการเรียน ห้อง {activeClassroom.name}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-xl">
              สถิติผลการเรียน เกรดเฉลี่ย และการติดตามนักเรียนกลุ่มที่ต้องดูแลช่วยเหลือ
            </p>
          </div>

          {/* Quick Classroom Switcher Pill in Hero */}
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col gap-1.5 self-start md:self-auto min-w-[200px]">
            <div className="text-[11px] font-bold text-indigo-100 px-2 flex items-center justify-between">
              <span>เลือกห้องเรียน:</span>
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className="underline hover:text-white cursor-pointer"
              >
                {showComparison ? 'ซ่อนการเปรียบเทียบ' : '📊 เปรียบเทียบทุกห้อง'}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {classrooms.map((c) => {
                const isSelected = c.id === activeClassroom.id;
                const count = storage.getStudents(c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectClassroom(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <span>ห้อง {c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-white/30 text-white'}`}>
                      {count} คน
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Classroom Comparison Section (Toggled) */}
      {showComparison && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span>ตารางเปรียบเทียบสถิติระหว่างห้องเรียน</span>
              </h3>
              <p className="text-xs text-slate-500">
                เปรียบเทียบผลการเรียน จำนวนนักเรียน เกรดเฉลี่ย (GPA) และกลุ่มเสี่ยงในแต่ละห้อง
              </p>
            </div>
            <button
              onClick={() => setShowComparison(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              ปิด
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allClassroomsStats.map((st) => {
              const isCurrent = st.classroom.id === activeClassroom.id;
              return (
                <div
                  key={st.classroom.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">
                      ห้อง {st.classroom.name}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                        กำลังดูอยู่
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectClassroom(st.classroom)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        สลับมาห้องนี้
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">{st.classroom.level}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400">เกรดเฉลี่ยห้อง (GPA)</div>
                      <div className="text-lg font-black text-amber-600">{st.gpa.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400">คะแนนเฉลี่ยรวม</div>
                      <div className="text-lg font-black text-emerald-700">{st.avgScore} / 100</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400">นักเรียนทั้งหมด</div>
                      <div className="text-base font-bold text-slate-800">{st.studentCount} คน</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400">ต้องช่วยเหลือ (ร/มส)</div>
                      <div className={`text-base font-bold ${st.atRiskCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {st.atRiskCount} คน
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Metric Cards for Active Classroom */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">จำนวนนักเรียน</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            {students.length} <span className="text-xs text-slate-400 font-normal">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ห้อง {activeClassroom.name}</div>
        </div>

        {/* Class GPA */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">เกรดเฉลี่ยห้อง (GPA)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {classGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">จากเต็ม 4.00</div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">คะแนนเฉลี่ยรวมทุกวิชา</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {totalAvgAllSubjects} <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">เกณฑ์ผ่าน 50 คะแนน</div>
        </div>

        {/* Needing attention count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">ต้องดูแลช่วยเหลือ</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${studentsNeedingAttention.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {studentsNeedingAttention.length} <span className="text-xs text-slate-400 font-normal">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ติด ร, มส หรือเกรด 0</div>
        </div>
      </div>

      {/* Subject Comparison Section: Term 1 vs Term 2 */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>เปรียบเทียบคะแนนเฉลี่ยแต่ละวิชา (ห้อง {activeClassroom.name})</span>
            </h3>
            <p className="text-xs text-slate-500">
              แต่ละเทอมคะแนนเต็ม 50 คะแนน รวมทั้งปีเต็ม 100 คะแนน
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-500"></span>
              <span>เทอม 1 (เต็ม 50)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600"></span>
              <span>เทอม 2 (เต็ม 50)</span>
            </div>
          </div>
        </div>

        {/* Bar comparison list */}
        <div className="space-y-3.5 pt-2">
          {subjectAverages.map((item) => {
            const t1Percent = Math.min(100, (item.term1Avg / 50) * 100);
            const t2Percent = Math.min(100, (item.term2Avg / 50) * 100);

            return (
              <div key={item.subject.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">
                    {item.subject.name} <span className="text-slate-400 font-mono text-[11px]">({item.subject.code})</span>
                  </span>
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="text-sky-700">เทอม 1: {item.term1Avg}</span>
                    <span className="text-indigo-700">เทอม 2: {item.term2Avg}</span>
                    <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-bold">
                      รวม: {item.totalAvg}/100
                    </span>
                  </div>
                </div>

                {/* Progress dual bars */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${t1Percent}%` }}
                    ></div>
                  </div>
                  <div className="bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${t2Percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Students Needing Attention Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>นักเรียนที่ต้องดูแลเป็นพิเศษ / ต้องซ่อมเสริม (ห้อง {activeClassroom.name})</span>
            </h3>
            <p className="text-xs text-slate-500">
              นักเรียนที่ได้เกรด 0 ขาดสอบ (ร) หรือไม่ส่งงาน (มส) เพื่อให้ครูติดตามงานได้ทันท่วงที
            </p>
          </div>

          <button
            onClick={onNavigateToGrading}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>ไปที่หน้ากรอกคะแนน</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {studentsNeedingAttention.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {studentsNeedingAttention.map(({ student: stu, issues, gpa }) => (
              <div
                key={stu.id}
                className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 font-bold text-xs flex items-center justify-center">
                      {stu.student_no}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{stu.name}</span>
                    <span className="text-[11px] text-slate-500">({stu.student_code})</span>
                  </div>

                  <div className="mt-2 space-y-1">
                    {issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-rose-700 font-medium flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400">เกรดเฉลี่ย</div>
                  <div className="text-sm font-black text-slate-700">{gpa.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>ยอดเยี่ยมมาก! ไม่มีนักเรียนที่ได้เกรด 0 หรือติด ร/มส ในห้องนี้</span>
          </div>
        )}
      </div>
    </div>
  );
};
