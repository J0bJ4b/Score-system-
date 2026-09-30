import React, { useState, useEffect } from 'react';
import {
  Student,
  Subject,
  ScoreItem,
  Score,
  Term,
  FeedbackTone,
  StudentLearningFeedback,
} from '../types';
import { getStudentFullReport } from '../utils/gradeCalculator';
import {
  generateStudentLearningFeedback,
  generateClassroomFeedbackBatch,
} from '../utils/feedbackGenerator';
import { storage } from '../services/storage';
import {
  X,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Award,
  Zap,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Wand2,
} from 'lucide-react';

interface StudentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentStudentId: string;
  onSelectStudent: (studentId: string) => void;
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  onFeedbackSaved?: () => void;
}

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  isOpen,
  onClose,
  students,
  currentStudentId,
  onSelectStudent,
  subjects,
  allScoreItems,
  allScores,
  terms,
  onFeedbackSaved,
}) => {
  const [selectedTone, setSelectedTone] = useState<FeedbackTone>('balanced');
  const [commentText, setCommentText] = useState('');
  const [actionSteps, setActionSteps] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [growthAreas, setGrowthAreas] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState('');

  const currentIndex = students.findIndex((s) => s.id === currentStudentId);
  const currentStudent = students[currentIndex] || students[0];

  // Load existing feedback or generate default
  useEffect(() => {
    if (!currentStudent) return;
    const existing = storage.getStudentFeedback(currentStudent.id);
    const report = getStudentFullReport(currentStudent, subjects, allScoreItems, allScores, terms);

    if (existing) {
      setCommentText(existing.comment);
      setSelectedTone(existing.tone);
      setActionSteps(existing.actionSteps || []);
      setStrengths(existing.strengths || []);
      setGrowthAreas(existing.growthAreas || []);
    } else {
      const generated = generateStudentLearningFeedback(currentStudent, report, {
        tone: selectedTone,
      });
      setCommentText(generated.comment);
      setActionSteps(generated.actionSteps);
      setStrengths(generated.strengths);
      setGrowthAreas(generated.growthAreas);
    }
    setSaveSuccess(false);
  }, [currentStudent?.id, subjects, allScoreItems, allScores, terms]);

  if (!isOpen || !currentStudent) return null;

  const currentReport = getStudentFullReport(
    currentStudent,
    subjects,
    allScoreItems,
    allScores,
    terms
  );

  const handleRegenerate = (toneToUse: FeedbackTone = selectedTone) => {
    setSelectedTone(toneToUse);
    const generated = generateStudentLearningFeedback(currentStudent, currentReport, {
      tone: toneToUse,
    });
    setCommentText(generated.comment);
    setActionSteps(generated.actionSteps);
    setStrengths(generated.strengths);
    setGrowthAreas(generated.growthAreas);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    const feedback: StudentLearningFeedback = {
      id: `fb-${currentStudent.id}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      classroomId: currentStudent.classroom_id,
      tone: selectedTone,
      comment: commentText.trim(),
      strengths,
      growthAreas,
      actionSteps,
      performanceTier:
        currentReport.gpa >= 3.5
          ? 'excellent'
          : currentReport.gpa >= 3.0
          ? 'very_good'
          : currentReport.gpa >= 2.5
          ? 'good'
          : currentReport.gpa >= 2.0
          ? 'moderate'
          : 'needs_attention',
      gpa: currentReport.gpa,
      totalScorePercentage: Math.round(
        (currentReport.subjects.reduce((a, b) => a + b.total_score, 0) /
          Math.max(1, currentReport.subjects.length * 100)) *
          100
      ),
      isCustomized: true,
      generatedAt: new Date().toISOString(),
    };

    storage.saveStudentFeedback(feedback);
    setSaveSuccess(true);
    if (onFeedbackSaved) onFeedbackSaved();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleBatchGenerateAll = () => {
    if (
      !window.confirm(
        `คุณต้องการวิเคราะห์และสร้างข้อเสนอแนะเพื่อการเรียนรู้ให้นักเรียนทั้งห้อง (${students.length} คน) อัตโนมัติหรือไม่?`
      )
    ) {
      return;
    }

    const batch = generateClassroomFeedbackBatch(
      students,
      (stu) => getStudentFullReport(stu, subjects, allScoreItems, allScores, terms),
      selectedTone
    );

    storage.saveAllStudentFeedbacks(batch);
    setBatchSuccess(`สร้างข้อคิดเห็นเฉพาะบุคคลให้นักเรียนครบทั้ง ${students.length} คนเรียบร้อยแล้ว!`);
    
    // Refresh current view
    if (batch[currentStudent.id]) {
      setCommentText(batch[currentStudent.id].comment);
      setActionSteps(batch[currentStudent.id].actionSteps);
      setStrengths(batch[currentStudent.id].strengths);
      setGrowthAreas(batch[currentStudent.id].growthAreas);
    }
    if (onFeedbackSaved) onFeedbackSaved();
    setTimeout(() => setBatchSuccess(''), 4000);
  };

  const toneOptions: { id: FeedbackTone; label: string; desc: string; icon: string }[] = [
    {
      id: 'balanced',
      label: 'สมดุลรอบด้าน (แนะนำ)',
      desc: 'ชื่นชมจุดแข็ง + ชี้แนะจุดที่ควรพัฒนา + คำแนะนำเชิงปฏิบัติ',
      icon: '⚖️',
    },
    {
      id: 'academic',
      label: 'วิชาการและความเป็นเลิศ',
      desc: 'เน้นกระบวนการคิดวิเคราะห์ โครงงาน และการพัฒนาสู่ความเป็นเลิศ',
      icon: '🎓',
    },
    {
      id: 'encouraging',
      label: 'เสริมพลังบวกและกำลังใจ',
      desc: 'น้ำเสียงอบอุ่น เน้นความพยายาม สร้างความมั่นใจ และการไม่ย่อท้อ',
      icon: '💖',
    },
    {
      id: 'ministry_standard',
      label: 'มาตรฐาน สพฐ. กระชับ',
      desc: 'ข้อความทางการ กระชับ เหมาะสมสำหรับช่อง ปพ.6 ขนาดกะทัดรัด',
      icon: '📜',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn font-['Sarabun',sans-serif]">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  สร้างข้อเสนอแนะเพื่อการเรียนรู้เฉพาะบุคคล
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  ปพ.6 & พอร์ทัล
                </span>
              </div>
              <p className="text-indigo-200 text-xs sm:text-sm mt-0.5">
                วิเคราะห์ผลสัมฤทธิ์จาก GPA และคะแนนรายวิชาอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Navigator Bar */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => onSelectStudent(students[currentIndex - 1]?.id)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>

            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              เลขที่ {currentStudent.student_no} : {currentStudent.name}
            </span>

            <button
              type="button"
              disabled={currentIndex >= students.length - 1}
              onClick={() => onSelectStudent(students[currentIndex + 1]?.id)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchGenerateAll}
              title="สร้างข้อคิดเห็นให้นักเรียนทุกคนในห้องในครั้งเดียว"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">สร้างอัตโนมัติทั้งห้อง ({students.length} คน)</span>
              <span className="sm:hidden">ทั้งห้อง</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {batchSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{batchSuccess}</span>
            </div>
          )}

          {/* Quick Academic Snapshot Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                {currentReport.gpa.toFixed(2)}
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  เกรดเฉลี่ยสะสม (GPA) : {currentReport.gpa.toFixed(2)}
                </div>
                <div className="text-slate-500 text-[11px]">
                  รวม {currentReport.subjects.length} วิชา ({currentReport.total_credits} หน่วยกิต)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {strengths.length > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 font-semibold text-[11px]">
                  ⭐ วิชาเด่น: {strengths.join(', ')}
                </div>
              )}
              {growthAreas.length > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/60 font-semibold text-[11px]">
                  💡 ควรพัฒนา: {growthAreas.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              เลือกน้ำเสียงข้อคิดเห็น (Tone & Style):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {toneOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleRegenerate(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    selectedTone === t.id
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {t.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comment Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                ข้อคิดเห็นครูประจำชั้น (ปรากฏใน ปพ.6 และพอร์ทัลตรวจคะแนน):
              </label>
              <button
                type="button"
                onClick={() => handleRegenerate(selectedTone)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>สร้างใหม่อัตโนมัติ</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                setSaveSuccess(false);
              }}
              placeholder="พิมพ์ข้อคิดเห็นหรือข้อเสนอแนะเพิ่มเติมสำหรับนักเรียน..."
              className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all leading-relaxed"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              ความยาว: {commentText.length} ตัวอักษร
            </div>
          </div>

          {/* Action Steps Recommendation */}
          {actionSteps.length > 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ข้อเสนอแนะเชิงปฏิบัติสำหรับนักเรียน (Action Steps):</span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {actionSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกเรียบร้อยแล้ว</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              ปิด
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อคิดเห็น</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
