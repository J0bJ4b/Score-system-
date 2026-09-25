import React, { useState, useEffect } from 'react';
import { Student, Subject, ScoreItem, Score, Term, User, Classroom } from '../types';
import { getStudentFullReport } from '../utils/gradeCalculator';
import { StudentProgressChart } from '../components/StudentProgressChart';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Award,
  BookOpen,
  Calendar,
  Layers,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';

interface IndividualSummaryPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  user: User;
  classroom: string;
  activeClassroom?: Classroom;
}

export const IndividualSummaryPage: React.FC<IndividualSummaryPageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  user,
  classroom,
  activeClassroom,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [printAllStudents, setPrintAllStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'both' | 'report' | 'chart'>('both');
  const [includeChartInPrint, setIncludeChartInPrint] = useState(false);

  // Sync selectedStudentId when classroom or student list changes
  useEffect(() => {
    if (students.length > 0 && !students.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const currentIndex = students.findIndex((s) => s.id === selectedStudentId);
  const currentStudent = students[currentIndex] || students[0];

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  const handlePrint = (all: boolean = false) => {
    setPrintAllStudents(all);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Helper to render report card for a student
  const renderReportCard = (stu: Student, isBatchItem: boolean = false) => {
    const report = getStudentFullReport(stu, subjects, allScoreItems, allScores, terms);

    return (
      <div
        key={stu.id}
        className={`bg-white p-6 sm:p-10 rounded-2xl shadow-xs border border-slate-200 text-slate-800 print-card ${
          isBatchItem ? 'page-break mb-8' : ''
        }`}
      >
        {/* Ministry / School Header */}
        <div className="text-center pb-6 border-b-2 border-slate-800 space-y-1">
          <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            กระทรวงศึกษาธิการ • สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.5/ปพ.6)
          </h2>
          <div className="text-sm font-semibold text-slate-700">
            {user.school_name || 'โรงเรียนประถมศึกษา'}
          </div>
          <div className="text-xs text-slate-600">
            ปีการศึกษา {activeClassroom?.academic_year || '2569'} •{' '}
            {activeClassroom?.level ||
              `ระดับชั้นประถมศึกษาปีที่ ${classroom.replace('ป.', '')}`}{' '}
            (ห้อง {activeClassroom?.name || classroom})
          </div>
        </div>

        {/* Student Profile Block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs sm:text-sm border-b border-slate-200">
          <div>
            <span className="text-slate-500 font-medium">ชื่อ - นามสกุล:</span>
            <div className="font-bold text-slate-900 text-base">{stu.name}</div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">
              เลขประจำตัวนักเรียน:
            </span>
            <div className="font-bold text-slate-800 font-mono">
              {stu.student_code}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">เลขที่:</span>
            <div className="font-bold text-slate-800">{stu.student_no}</div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">ห้องเรียน:</span>
            <div className="font-bold text-slate-800">{stu.classroom}</div>
          </div>
        </div>

        {/* Subjects & Grades Table */}
        <div className="py-5">
          <div className="text-xs font-bold text-slate-700 mb-2">
            สรุปผลสัมฤทธิ์ทางการเรียนตามกลุ่มสาระการเรียนรู้
            (คะแนนเต็มแต่ละภาคเรียน 50 คะแนน)
          </div>
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">
                    ที่
                  </th>
                  <th className="py-2.5 px-3 w-24 border-r border-slate-300">
                    รหัสวิชา
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300">
                    รายวิชา
                  </th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-300">
                    นก./ชม.
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-300">
                    เทอม 1 (50)
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-300">
                    เทอม 2 (50)
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-300 font-extrabold">
                    รวม (100)
                  </th>
                  <th className="py-2.5 px-3 text-center w-16">เกรด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.subjects.map((item, idx) => (
                  <tr key={item.subject.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">
                      {item.subject.code}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">
                      {item.subject.name}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200">
                      {item.subject.credit}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-slate-700 border-r border-slate-200">
                      {item.term1_score}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-slate-700 border-r border-slate-200">
                      {item.term2_score}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-slate-900 border-r border-slate-200">
                      {item.total_score}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-base">
                      <span
                        className={`inline-block px-2 py-0.5 rounded ${
                          item.grade === '0' ||
                          item.status === 'ร' ||
                          item.status === 'มส'
                            ? 'text-rose-700 font-extrabold'
                            : item.grade === '4'
                            ? 'text-emerald-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {item.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GPA & Results Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl my-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">
                ระดับผลการเรียนเฉลี่ย (GPA)
              </div>
              <div className="text-2xl font-black text-indigo-900">
                {report.gpa.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>จำนวนหน่วยกิตรวม:</span>
              <span className="font-bold text-slate-800">
                {report.total_credits} หน่วยกิต
              </span>
            </div>
            <div className="flex justify-between">
              <span>ผลการประเมินการเลื่อนชั้น:</span>
              <span className="font-bold text-emerald-700">
                {report.gpa >= 1.0
                  ? '✓ ผ่านเกณฑ์การประเมิน'
                  : '⚠️ ต้องปรับปรุงแก้ไข'}
              </span>
            </div>
          </div>
        </div>

        {/* Teacher Comment / Remarks */}
        <div className="pt-2 pb-6 border-b border-slate-200 text-xs">
          <span className="font-bold text-slate-700">
            ความคิดเห็นของครูประจำชั้น:
          </span>
          <div className="mt-1 p-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-700 min-h-[44px]">
            {report.gpa >= 3.5
              ? 'นักเรียนมีความตั้งใจเรียน มีความรับผิดชอบต่องานดีเยี่ยม ผลการเรียนอยู่ในเกณฑ์ยอดเยี่ยม ขอให้รักษาความดีนี้ต่อไป'
              : report.gpa >= 2.5
              ? 'นักเรียนมีความสนใจในการเรียนดี ส่งงานสม่ำเสมอ แนะนำให้พัฒนาทักษะเพิ่มเติมในวิชาที่ยังได้คะแนนปานกลาง'
              : 'นักเรียนควรเพิ่มความใส่ใจในการทบทวนบทเรียน และส่งงานที่ค้างให้ครบตามกำหนดเพื่อผลการเรียนที่ดียิ่งขึ้น'}
          </div>
        </div>

        {/* Optional Printable Progress Chart */}
        {includeChartInPrint && (
          <div className="my-6 pt-4 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-2">
              📈 กราฟสรุปพัฒนาการการเรียนรู้ตลอดปีการศึกษา
            </div>
            <StudentProgressChart
              student={stu}
              allStudents={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              className="border-slate-300"
            />
          </div>
        )}

        {/* Signatures Block (ปพ. Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 text-center text-xs">
          <div className="space-y-1">
            <div className="h-10 flex items-end justify-center">
              <span className="border-b border-dotted border-slate-500 w-44 inline-block"></span>
            </div>
            <div className="font-bold text-slate-800">
              ({activeClassroom?.homeroom_teacher || user.full_name})
            </div>
            <div className="text-slate-500 text-[11px]">ครูประจำชั้น</div>
          </div>

          <div className="space-y-1">
            <div className="h-10 flex items-end justify-center">
              <span className="border-b border-dotted border-slate-500 w-44 inline-block"></span>
            </div>
            <div className="font-bold text-slate-800">
              ( .................................................... )
            </div>
            <div className="text-slate-500 text-[11px]">ผู้ปกครองนักเรียน</div>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <div className="h-10 flex items-end justify-center">
              <span className="border-b border-dotted border-slate-500 w-44 inline-block"></span>
            </div>
            <div className="font-bold text-slate-800">
              ( .................................................... )
            </div>
            <div className="text-slate-500 text-[11px]">ผู้อำนวยการโรงเรียน</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Navigation and Print Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>รายงานผลการเรียนและพัฒนาการรายบุคคล</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                ปพ.5 / ปพ.6
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              แสดงผลการเรียนเฉลี่ย (GPA) ทุกวิชา พร้อมกราฟเส้นวิเคราะห์พัฒนาการรายบุคคล (Recharts)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePrint(false)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์คนนี้ (PDF)</span>
            </button>

            <button
              onClick={() => handlePrint(true)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>พิมพ์ทั้งห้อง ({students.length} คน)</span>
            </button>
          </div>
        </div>

        {/* Student Selector Row & View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="นักเรียนคนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
            >
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  เลขที่ {stu.student_no}: {stu.name} ({stu.student_code})
                </option>
              ))}
            </select>

            <button
              onClick={handleNext}
              disabled={currentIndex >= students.length - 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="นักเรียนคนถัดไป"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Tab Switcher: Both, Report Only, Chart Only */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทั้งสองอย่าง
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>กราฟพัฒนาการ (Recharts)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>แบบรายงาน ปพ.</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Progress Chart Section (when activeTab is 'both' or 'chart') */}
      {!printAllStudents && currentStudent && (activeTab === 'both' || activeTab === 'chart') && (
        <div className="no-print animate-in fade-in">
          <StudentProgressChart
            student={currentStudent}
            allStudents={students}
            subjects={subjects}
            allScoreItems={allScoreItems}
            allScores={allScores}
            terms={terms}
          />
        </div>
      )}

      {/* Report Card Preview or Batch List (when activeTab is 'both' or 'report') */}
      {(activeTab === 'both' || activeTab === 'report' || printAllStudents) && (
        <>
          {printAllStudents ? (
            <div className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 no-print flex items-center justify-between">
                <span>
                  กำลังแสดงรายงานของนักเรียนทั้งห้อง ({students.length} คน)
                  สำหรับพิมพ์
                </span>
                <button
                  onClick={() => setPrintAllStudents(false)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  กลับไปดูคนเดียว
                </button>
              </div>
              {students.map((stu) => renderReportCard(stu, true))}
            </div>
          ) : (
            currentStudent && renderReportCard(currentStudent, false)
          )}
        </>
      )}
    </div>
  );
};
