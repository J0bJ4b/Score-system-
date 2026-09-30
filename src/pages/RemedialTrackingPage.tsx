import React, { useState, useMemo } from 'react';
import {
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
  Classroom,
  User,
  RemedialRecord,
  RemedialStatus,
  RemedialMethod,
} from '../types';
import { storage } from '../services/storage';
import { lineNotifyService } from '../services/lineNotify';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Printer,
  Sparkles,
  Send,
  Calendar,
  UserCheck,
  FileText,
  RotateCcw,
  Check,
  Edit,
  Trash2,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  X,
  Share2,
} from 'lucide-react';

interface RemedialTrackingPageProps {
  students: Student[];
  subjects: Subject[];
  terms: Term[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  classroom: string;
  activeClassroom: Classroom;
  classrooms: Classroom[];
  user: User | null;
  onScoresUpdated: () => void;
}

const REMEDIAL_METHOD_LABELS: Record<RemedialMethod, { label: string; icon: string; color: string }> = {
  individual_tutoring: {
    label: 'สอนเสริมรายบุคคล / กลุ่มย่อย',
    icon: '👨‍🏫',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  remedial_worksheet: {
    label: 'มอบหมายชุดฝึก / ใบงานปรับพื้นฐาน',
    icon: '📝',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  peer_tutoring: {
    label: 'กิจกรรมเพื่อนช่วยเพื่อน (Peer Tutoring)',
    icon: '🤝',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  digital_learning: {
    label: 'เรียนรู้ผ่านคลิป / สื่อบทเรียนออนไลน์',
    icon: '💻',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  project_assignment: {
    label: 'โครงงาน / ชิ้นงานทดแทน',
    icon: '🎨',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  other: {
    label: 'วิธีการอื่นๆ ตามดุลยพินิจครู',
    icon: '📌',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

const STATUS_CONFIG: Record<
  RemedialStatus,
  { label: string; badge: string; icon: any; step: number }
> = {
  pending: {
    label: 'รอจัดตารางสอนซ่อม',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: AlertTriangle,
    step: 1,
  },
  in_progress: {
    label: 'กำลังสอนซ่อมเสริม',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
    step: 2,
  },
  re_exam_scheduled: {
    label: 'นัดสอบแก้ตัวแล้ว',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: Calendar,
    step: 3,
  },
  passed: {
    label: 'สอบแก้ตัวผ่านแล้ว',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
    step: 4,
  },
  failed: {
    label: 'ยังไม่ผ่านเกณฑ์ (ต้องซ่อมรอบ 2)',
    badge: 'bg-red-100 text-red-800 border-red-300',
    icon: RotateCcw,
    step: 2,
  },
};

export const RemedialTrackingPage: React.FC<RemedialTrackingPageProps> = ({
  students,
  subjects,
  terms,
  allScoreItems,
  allScores,
  classroom,
  activeClassroom,
  classrooms,
  user,
  onScoresUpdated,
}) => {
  // Navigation tabs within Remedial Page
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'detector' | 'report'>('records');

  // Filter states
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(activeClassroom.id || 'all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Remedial records in state
  const [records, setRecords] = useState<RemedialRecord[]>(() => storage.getAllRemedialRecords());

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<RemedialRecord> | null>(null);

  const [isQuickReExamModalOpen, setIsQuickReExamModalOpen] = useState(false);
  const [quickTargetRecord, setQuickTargetRecord] = useState<RemedialRecord | null>(null);
  const [quickScoreInput, setQuickScoreInput] = useState<number>(5);
  const [quickSyncGradebook, setQuickSyncGradebook] = useState<boolean>(true);
  const [quickDateInput, setQuickDateInput] = useState<string>(
    new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  // LINE Notification Modal state
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [lineModalRecord, setLineModalRecord] = useState<RemedialRecord | null>(null);
  const [lineMessageType, setLineMessageType] = useState<'schedule' | 'passed'>('schedule');
  const [lineMessageText, setLineMessageText] = useState<string>('');
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [lineStatusNotice, setLineStatusNotice] = useState<{ success: boolean; msg: string } | null>(null);

  // Reload records helper
  const reloadRemedialRecords = () => {
    const list = storage.getAllRemedialRecords();
    setRecords(list);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedClassroomId !== 'all' && r.classroom_id && r.classroom_id !== selectedClassroomId) {
        return false;
      }
      if (selectedSubjectId !== 'all' && r.subject_id !== selectedSubjectId) {
        return false;
      }
      if (selectedTermId !== 'all' && r.term_id !== selectedTermId) {
        return false;
      }
      if (selectedStatus !== 'all' && r.status !== selectedStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = r.student_name.toLowerCase().includes(q);
        const matchCode = r.student_code?.toLowerCase().includes(q);
        const matchNo = r.student_no?.toString().includes(q);
        const matchSubject = r.subject_name.toLowerCase().includes(q);
        const matchItem = r.score_item_name?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchNo && !matchSubject && !matchItem) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedClassroomId, selectedSubjectId, selectedTermId, selectedStatus, searchTerm]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const pending = filteredRecords.filter((r) => r.status === 'pending').length;
    const inProgress = filteredRecords.filter((r) => r.status === 'in_progress').length;
    const scheduled = filteredRecords.filter((r) => r.status === 're_exam_scheduled').length;
    const passed = filteredRecords.filter((r) => r.status === 'passed').length;
    const failed = filteredRecords.filter((r) => r.status === 'failed').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, pending, inProgress, scheduled, passed, failed, passRate };
  }, [filteredRecords]);

  // Smart At-Risk Detector: Find students with score < 50% or missing/absent
  const detectedAtRiskCandidates = useMemo(() => {
    const candidates: Array<{
      student: Student;
      subject: Subject;
      term: Term;
      scoreItem: ScoreItem;
      scoreRecord: Score | null;
      obtainedScore: number;
      maxScore: number;
      percentage: number;
      reason: string;
      alreadyEnrolled: boolean;
      existingRecordId?: string;
    }> = [];

    const activeStudents = selectedClassroomId === 'all'
      ? students
      : students.filter((s) => !s.classroom_id || s.classroom_id === selectedClassroomId);

    allScoreItems.forEach((item) => {
      if (selectedSubjectId !== 'all' && item.subject_id !== selectedSubjectId) return;
      if (selectedTermId !== 'all' && item.term_id !== selectedTermId) return;

      const sub = subjects.find((s) => s.id === item.subject_id);
      const term = terms.find((t) => t.id === item.term_id);
      if (!sub || !term) return;

      activeStudents.forEach((stu) => {
        const sc = allScores.find((s) => s.student_id === stu.id && s.score_item_id === item.id);
        const maxScore = item.max_score || 10;
        const obtainedScore = sc?.score ?? 0;
        const isAbsentOrMissing = sc?.status === 'absent' || sc?.status === 'missing';
        const isLowScore = sc?.score !== null && sc?.score !== undefined && (obtainedScore / maxScore) < 0.5;

        if (isAbsentOrMissing || isLowScore || sc === undefined) {
          // Check if already in remedial records
          const existing = records.find(
            (r) => r.student_id === stu.id && r.score_item_id === item.id
          );

          let reason = '';
          if (sc?.status === 'absent') reason = 'ติด ร (ขาดสอบ)';
          else if (sc?.status === 'missing') reason = 'ติด มส (ไม่ส่งงาน)';
          else if (sc === undefined) reason = 'ยังไม่มีบันทึกคะแนน';
          else reason = `คะแนนไม่ผ่านเกณฑ์ (${obtainedScore}/${maxScore} คิดเป็น ${Math.round((obtainedScore / maxScore) * 100)}%)`;

          candidates.push({
            student: stu,
            subject: sub,
            term: term,
            scoreItem: item,
            scoreRecord: sc || null,
            obtainedScore: sc?.score ?? 0,
            maxScore,
            percentage: Math.round(((sc?.score ?? 0) / maxScore) * 100),
            reason,
            alreadyEnrolled: !!existing,
            existingRecordId: existing?.id,
          });
        }
      });
    });

    return candidates;
  }, [allScoreItems, allScores, students, subjects, terms, selectedClassroomId, selectedSubjectId, selectedTermId, records]);

  // Handle open add / edit modal
  const handleOpenAddModal = (candidatePreset?: typeof detectedAtRiskCandidates[0]) => {
    if (candidatePreset) {
      setEditingRecord({
        student_id: candidatePreset.student.id,
        student_name: candidatePreset.student.name,
        student_code: candidatePreset.student.student_code,
        student_no: candidatePreset.student.student_no,
        classroom_id: candidatePreset.student.classroom_id || activeClassroom.id,
        classroom_name: candidatePreset.student.classroom || activeClassroom.name,
        subject_id: candidatePreset.subject.id,
        subject_name: candidatePreset.subject.name,
        subject_code: candidatePreset.subject.code,
        term_id: candidatePreset.term.id,
        term_name: candidatePreset.term.name,
        score_item_id: candidatePreset.scoreItem.id,
        score_item_name: candidatePreset.scoreItem.name,
        indicator_or_standard: '',
        original_score: candidatePreset.obtainedScore,
        max_score: candidatePreset.maxScore,
        target_passing_score: Math.round(candidatePreset.maxScore * 0.5),
        learning_defect: candidatePreset.reason.includes('ขาด') ? 'ขาดสอบเนื่องจากลากิจ/ป่วย' : 'ยังไม่เข้าใจมโนทัศน์และวิธีการแก้โจทย์ปัญหา',
        remedial_method: 'individual_tutoring',
        remedial_method_detail: 'ครูสอนทบทวนเนื้อหาและให้ทำแบบฝึกหัดแก้ตัว',
        remedial_date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        remedial_duration_hours: 1,
        re_exam_date: '',
        re_exam_score: null,
        final_recorded_score: null,
        status: 'pending',
        teacher_notes: '',
        remedial_round: 1,
        synced_to_gradebook: false,
      });
    } else {
      const defaultStudent = students[0];
      const defaultSubject = subjects[0];
      const defaultTerm = terms[0];
      const defaultItem = allScoreItems.find(
        (i) => i.subject_id === defaultSubject?.id && i.term_id === defaultTerm?.id
      );

      setEditingRecord({
        student_id: defaultStudent?.id || '',
        student_name: defaultStudent?.name || '',
        student_code: defaultStudent?.student_code || '',
        student_no: defaultStudent?.student_no || 1,
        classroom_id: defaultStudent?.classroom_id || activeClassroom.id,
        classroom_name: defaultStudent?.classroom || activeClassroom.name,
        subject_id: defaultSubject?.id || '',
        subject_name: defaultSubject?.name || '',
        subject_code: defaultSubject?.code || '',
        term_id: defaultTerm?.id || '',
        term_name: defaultTerm?.name || '',
        score_item_id: defaultItem?.id || '',
        score_item_name: defaultItem?.name || '',
        indicator_or_standard: '',
        original_score: 3,
        max_score: defaultItem?.max_score || 10,
        target_passing_score: Math.round((defaultItem?.max_score || 10) * 0.5),
        learning_defect: 'ยังสับสนแนวคิดหลักและทำแบบฝึกหัดไม่ผ่านเกณฑ์',
        remedial_method: 'remedial_worksheet',
        remedial_method_detail: 'มอบหมายชุดฝึกเสริมทักษะปรับพื้นฐาน',
        remedial_date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        remedial_duration_hours: 1,
        re_exam_date: '',
        re_exam_score: null,
        final_recorded_score: null,
        status: 'pending',
        teacher_notes: '',
        remedial_round: 1,
        synced_to_gradebook: false,
      });
    }
    setIsEditModalOpen(true);
  };

  const handleEditRecord = (rec: RemedialRecord) => {
    setEditingRecord({ ...rec });
    setIsEditModalOpen(true);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบบันทึกการสอนซ่อมเสริมของ ${name} หรือไม่?`)) {
      storage.deleteRemedialRecord(id);
      reloadRemedialRecords();
    }
  };

  const handleSaveModalRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.student_id || !editingRecord.subject_id) return;

    if (editingRecord.id) {
      storage.updateRemedialRecord(editingRecord as RemedialRecord);
    } else {
      storage.addRemedialRecord(editingRecord as Omit<RemedialRecord, 'id'>);
    }

    // Auto-sync if marked as passed and requested
    if (editingRecord.status === 'passed' && editingRecord.id && editingRecord.synced_to_gradebook) {
      storage.syncRemedialScoreToGradebook(editingRecord.id, 'cap_passing');
      onScoresUpdated();
    }

    setIsEditModalOpen(false);
    setEditingRecord(null);
    reloadRemedialRecords();
  };

  // Open Quick Re-Exam Result Modal
  const handleOpenQuickReExam = (rec: RemedialRecord) => {
    setQuickTargetRecord(rec);
    const passThreshold = rec.target_passing_score || Math.round(rec.max_score * 0.5);
    setQuickScoreInput(passThreshold);
    setQuickSyncGradebook(true);
    setIsQuickReExamModalOpen(true);
  };

  // Submit Quick Re-Exam Result
  const handleSubmitQuickReExam = (passed: boolean) => {
    if (!quickTargetRecord) return;

    const passingScore = quickTargetRecord.target_passing_score || Math.round(quickTargetRecord.max_score * 0.5);
    const reExamScore = passed ? Math.max(quickScoreInput, passingScore) : Math.min(quickScoreInput, passingScore - 1);
    const finalScore = passed ? passingScore : reExamScore;

    const updated: RemedialRecord = {
      ...quickTargetRecord,
      status: passed ? 'passed' : 'failed',
      re_exam_score: reExamScore,
      final_recorded_score: passed ? finalScore : null,
      re_exam_date: quickDateInput,
      synced_to_gradebook: passed && quickSyncGradebook,
      updatedAt: new Date().toISOString(),
    };

    storage.updateRemedialRecord(updated);

    if (passed && quickSyncGradebook) {
      storage.syncRemedialScoreToGradebook(quickTargetRecord.id, 'cap_passing');
      onScoresUpdated();
    }

    setIsQuickReExamModalOpen(false);
    setQuickTargetRecord(null);
    reloadRemedialRecords();
  };

  // Direct sync button
  const handleSyncToGradebook = (recordId: string) => {
    const res = storage.syncRemedialScoreToGradebook(recordId, 'cap_passing');
    if (res.success) {
      alert(res.message);
      onScoresUpdated();
      reloadRemedialRecords();
    } else {
      alert(res.message);
    }
  };

  // Open LINE Notification Modal
  const handleOpenLineModal = (rec: RemedialRecord, type: 'schedule' | 'passed') => {
    setLineModalRecord(rec);
    setLineMessageType(type);
    setLineStatusNotice(null);

    const schoolName = user?.school_name || activeClassroom.name || 'โรงเรียนบ้านป่าส่าน';
    const teacherName = user?.full_name || 'ครูผู้สอน';

    let msg = '';
    if (type === 'schedule') {
      msg = lineNotifyService.buildRemedialNoticeMessage({
        classroomName: rec.classroom_name || activeClassroom.name,
        studentName: rec.student_name,
        studentNo: rec.student_no,
        subjectName: rec.subject_name,
        remedialItemName: rec.score_item_name || 'การประเมินผลการเรียนรู้',
        remedialDate: rec.remedial_date,
        remedialMethod: REMEDIAL_METHOD_LABELS[rec.remedial_method]?.label || 'การสอนเสริม',
        reExamDate: rec.re_exam_date || 'ตามที่ครูกำหนด',
        teacherName,
        schoolName,
      });
    } else {
      const passScore = rec.target_passing_score || Math.round(rec.max_score * 0.5);
      msg = lineNotifyService.buildRemedialPassedMessage({
        classroomName: rec.classroom_name || activeClassroom.name,
        studentName: rec.student_name,
        studentNo: rec.student_no,
        subjectName: rec.subject_name,
        scoreItemName: rec.score_item_name || 'งานที่สอบแก้ตัว',
        reExamScore: rec.re_exam_score ?? passScore,
        maxScore: rec.max_score,
        finalRecordedScore: rec.final_recorded_score ?? passScore,
        teacherName,
        schoolName,
      });
    }

    setLineMessageText(msg);
    setIsLineModalOpen(true);
  };

  const handleSendLine = async () => {
    if (!lineModalRecord) return;
    setIsSendingLine(true);
    setLineStatusNotice(null);

    const title =
      lineMessageType === 'schedule'
        ? `แจ้งนัดหมายสอนซ่อมเสริม: ${lineModalRecord.student_name}`
        : `แจ้งผลสอบแก้ตัวผ่าน: ${lineModalRecord.student_name}`;

    try {
      const res = await lineNotifyService.sendMessage(lineMessageText, {
        type: lineMessageType === 'schedule' ? 'remedial_scheduled' : 'remedial_passed',
        title,
        classroom: lineModalRecord.classroom_name,
        subjectName: lineModalRecord.subject_name,
        termName: lineModalRecord.term_name,
        studentCount: 1,
      });

      if (res.success) {
        setLineStatusNotice({ success: true, msg: 'ส่งข้อความแจ้งเตือนผ่าน LINE เรียบร้อยแล้ว' });
      } else {
        setLineStatusNotice({ success: false, msg: res.message });
      }
    } catch (e: any) {
      setLineStatusNotice({ success: false, msg: e.message || 'ส่งไม่สำเร็จ' });
    } finally {
      setIsSendingLine(false);
    }
  };

  // Batch enroll all detected candidates
  const handleBatchEnrollAllCandidates = () => {
    const unenrolled = detectedAtRiskCandidates.filter((c) => !c.alreadyEnrolled);
    if (unenrolled.length === 0) {
      alert('นักเรียนทุกคนที่ตรวจพบได้รับการบันทึกการสอนซ่อมเสริมเรียบร้อยแล้ว');
      return;
    }

    if (
      window.confirm(
        `ต้องการเพิ่มนักเรียนที่ต้องซ่อมเสริมจำนวน ${unenrolled.length} รายการเข้าสู่ระบบพร้อมกันหรือไม่?`
      )
    ) {
      const newBatch = unenrolled.map((c) => ({
        student_id: c.student.id,
        student_name: c.student.name,
        student_code: c.student.student_code,
        student_no: c.student.student_no,
        classroom_id: c.student.classroom_id || activeClassroom.id,
        classroom_name: c.student.classroom || activeClassroom.name,
        subject_id: c.subject.id,
        subject_name: c.subject.name,
        subject_code: c.subject.code,
        term_id: c.term.id,
        term_name: c.term.name,
        score_item_id: c.scoreItem.id,
        score_item_name: c.scoreItem.name,
        original_score: c.obtainedScore,
        max_score: c.maxScore,
        target_passing_score: Math.round(c.maxScore * 0.5),
        learning_defect: c.reason,
        remedial_method: 'individual_tutoring' as RemedialMethod,
        remedial_method_detail: 'ครูสอนทบทวนและให้ทำแบบฝึกหัดแก้ตัว',
        remedial_date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        remedial_duration_hours: 1,
        status: 'pending' as RemedialStatus,
        remedial_round: 1,
        synced_to_gradebook: false,
      }));

      storage.batchAddRemedialRecords(newBatch);
      reloadRemedialRecords();
      alert(`บันทึกนักเรียนเข้าสู่การสอนซ่อมเสริมเรียบร้อยแล้ว ${unenrolled.length} รายการ`);
      setActiveSubTab('records');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-2xl text-white p-5 sm:p-6 shadow-md shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
              งานวัดและประเมินผลการเรียนรู้ สพฐ.
            </span>
            <span className="text-indigo-200 text-xs font-medium">
              ห้อง {activeClassroom.name} • ปีการศึกษา {activeClassroom.academic_year}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-amber-300" />
            ระบบบันทึกการสอนซ่อมเสริมและสอบแก้ตัว
          </h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-2xl leading-relaxed">
            ติดตามนักเรียนที่มีผลการเรียนไม่ผ่านเกณฑ์ (ติด 0 / ร / มส) จัดทำแผนซ่อมเสริม บันทึกผลสอบแก้ตัว และอัปเดตคะแนนเข้าสู่สมุด ปพ.5 อัตโนมัติ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold text-sm rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบันทึกซ่อมเสริม
          </button>
          <button
            onClick={() => setActiveSubTab('report')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            พิมพ์แบบรายงาน สพฐ.
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 font-medium">รายการซ่อมเสริมทั้งหมด</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-800">{stats.total}</span>
            <span className="text-[11px] text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-rose-700 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            รอดำเนินการซ่อม
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-800">{stats.pending}</span>
            <span className="text-[11px] text-rose-600 font-medium">คน</span>
          </div>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-amber-700 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            กำลังสอนซ่อมเสริม
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-800">{stats.inProgress}</span>
            <span className="text-[11px] text-amber-600 font-medium">คน</span>
          </div>
        </div>

        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            นัดสอบแก้ตัวแล้ว
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-800">{stats.scheduled}</span>
            <span className="text-[11px] text-indigo-600 font-medium">คน</span>
          </div>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สอบแก้ตัวผ่านแล้ว
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-800">{stats.passed}</span>
            <span className="text-[11px] text-emerald-600 font-medium">คน</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            อัตราการผ่านเกณฑ์
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-900">{stats.passRate}%</span>
            <span className="text-[11px] text-indigo-500">สำเร็จ</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'records'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            รายการสอนซ่อมเสริม ({filteredRecords.length})
          </button>
          <button
            onClick={() => setActiveSubTab('detector')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'detector'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            ตรวจจับนักเรียนที่ต้องซ่อม ({detectedAtRiskCandidates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('report')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'report'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            แบบรายงานทางการ สพฐ.
          </button>
        </div>

        {/* Quick Helper hint */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
          <span>เกณฑ์ สพฐ.: สอบแก้ตัวผ่าน ได้คะแนนสูงสุดไม่เกินเกณฑ์ผ่านขั้นต่ำ (50%)</span>
        </div>
      </div>

      {/* TAB 1: Remedial Records List */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, เลขที่, หรือรายวิชา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              {/* Classroom Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">ห้อง:</span>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกห้องเรียน</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">วิชา:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกรายวิชา</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Term Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">เทอม:</span>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกภาคเรียน</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">สถานะ:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">รอดำเนินการซ่อม</option>
                  <option value="in_progress">กำลังสอนซ่อมเสริม</option>
                  <option value="re_exam_scheduled">นัดสอบแก้ตัวแล้ว</option>
                  <option value="passed">สอบแก้ตัวผ่านแล้ว</option>
                  <option value="failed">ยังไม่ผ่านเกณฑ์</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Table */}
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">ไม่พบรายการสอนซ่อมเสริมตามตัวกรอง</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                สามารถกดปุ่ม "เพิ่มบันทึกซ่อมเสริม" หรือสลับไปแท็บ "ตรวจจับนักเรียนที่ต้องซ่อม" เพื่อดึงข้อมูลนักเรียนที่คะแนนตกหรือติด ร/มส อัตโนมัติ
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
              >
                + เพิ่มบันทึกซ่อมเสริมใหม่
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">เลขที่</th>
                      <th className="py-3 px-4">ชื่อ-สกุลนักเรียน</th>
                      <th className="py-3 px-4">รายวิชา & งานที่ซ่อม</th>
                      <th className="py-3 px-3 text-center">คะแนนเดิม / เต็ม</th>
                      <th className="py-3 px-4">รูปแบบการซ่อมเสริม</th>
                      <th className="py-3 px-3 text-center">คะแนนสอบแก้ตัว</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => {
                      const statusInfo = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                      const methodInfo = REMEDIAL_METHOD_LABELS[r.remedial_method] || REMEDIAL_METHOD_LABELS.other;
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {r.student_no || '-'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{r.student_name}</div>
                            <div className="text-[11px] text-slate-400">
                              รหัส {r.student_code || '-'} • ห้อง {r.classroom_name || activeClassroom.name}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-indigo-900">
                              {r.subject_name} {r.subject_code ? `(${r.subject_code})` : ''}
                            </div>
                            <div className="text-xs text-slate-600">
                              {r.score_item_name || 'งานที่ตก'} • {r.term_name || 'ภาคเรียน'}
                            </div>
                            {r.indicator_or_standard && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={r.indicator_or_standard}>
                                ตัวชี้วัด: {r.indicator_or_standard}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-rose-600 text-sm">{r.original_score}</span>
                            <span className="text-slate-400 text-xs font-semibold"> / {r.max_score}</span>
                            <div className="text-[10px] text-slate-400">เกณฑ์ {r.target_passing_score || Math.round(r.max_score * 0.5)}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${methodInfo.color}`}>
                              <span>{methodInfo.icon}</span>
                              <span className="truncate max-w-[170px]">{methodInfo.label}</span>
                            </span>
                            {r.remedial_date && (
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{r.remedial_date}</span>
                                {r.remedial_duration_hours && <span>({r.remedial_duration_hours} ชม.)</span>}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {r.status === 'passed' ? (
                              <div>
                                <span className="font-bold text-emerald-700 text-base">
                                  {r.re_exam_score !== null && r.re_exam_score !== undefined ? r.re_exam_score : '-'}
                                </span>
                                <span className="text-slate-400 text-xs"> / {r.max_score}</span>
                                {r.final_recorded_score !== null && (
                                  <div className="text-[10px] text-emerald-600 font-bold">
                                    บันทึก ปพ.5: {r.final_recorded_score}
                                  </div>
                                )}
                              </div>
                            ) : r.status === 'failed' ? (
                              <div>
                                <span className="font-bold text-rose-600">{r.re_exam_score ?? '-'}</span>
                                <span className="text-slate-400 text-xs"> / {r.max_score}</span>
                                <div className="text-[10px] text-rose-500">ไม่ผ่านเกณฑ์</div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">ยังไม่ได้สอบ</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badge}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusInfo.label}</span>
                            </span>
                            {r.synced_to_gradebook && (
                              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center justify-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> ซิงค์ ปพ.5 แล้ว
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Re-exam button */}
                              {r.status !== 'passed' ? (
                                <button
                                  onClick={() => handleOpenQuickReExam(r)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                  title="บันทึกผลสอบแก้ตัว"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ผลสอบ</span>
                                </button>
                              ) : (
                                !r.synced_to_gradebook && (
                                  <button
                                    onClick={() => handleSyncToGradebook(r.id)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                    title="ซิงค์คะแนนกลับสมุดเกรด"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>ซิงค์</span>
                                  </button>
                                )
                              )}

                              {/* LINE Notify Button */}
                              <button
                                onClick={() => handleOpenLineModal(r, r.status === 'passed' ? 'passed' : 'schedule')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                title="ส่งแจ้งเตือน LINE ผู้ปกครอง"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleEditRecord(r)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="แก้ไขบันทึก"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteRecord(r.id, r.student_name)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Smart At-Risk Detector */}
      {activeSubTab === 'detector' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 text-sm">
                  ระบบตรวจจับคะแนนต่ำกว่าเกณฑ์อัตโนมัติ (At-Risk Diagnostic)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  สแกนคะแนนจากสมุดเกรดปัจจุบัน พบรายการที่คะแนนต่ำกว่า 50% หรือขาดสอบ/ค้างส่ง (ติด ร/มส) ทั้งหมด {detectedAtRiskCandidates.length} รายการ
                </p>
              </div>
            </div>

            <button
              onClick={handleBatchEnrollAllCandidates}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              นำเข้าสู่การสอนซ่อมเสริมทั้งหมด
            </button>
          </div>

          {detectedAtRiskCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">ยินดีด้วย! ไม่พบนักเรียนที่คะแนนตกหรือติด ร/มส</h3>
              <p className="text-xs text-slate-500 mt-1">นักเรียนทุกคนในห้องเรียนมีคะแนนผ่านเกณฑ์ขั้นต่ำ 50% ครบทุกรายการ</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">เลขที่</th>
                      <th className="py-3 px-4">ชื่อ-สกุลนักเรียน</th>
                      <th className="py-3 px-4">วิชา / รายการคะแนน</th>
                      <th className="py-3 px-3 text-center">คะแนนที่ได้ / เต็ม</th>
                      <th className="py-3 px-4">สาเหตุที่พบ</th>
                      <th className="py-3 px-3 text-center">สถานะการบันทึก</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedAtRiskCandidates.map((cand, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {cand.student.student_no}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{cand.student.name}</div>
                          <div className="text-[11px] text-slate-400">รหัส {cand.student.student_code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{cand.subject.name}</div>
                          <div className="text-xs text-slate-500">
                            {cand.scoreItem.name} • {cand.term.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-rose-600 text-sm">{cand.obtainedScore}</span>
                          <span className="text-slate-400 text-xs"> / {cand.maxScore}</span>
                          <div className="text-[10px] text-slate-400">{cand.percentage}%</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            {cand.reason}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {cand.alreadyEnrolled ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3" /> เปิดบันทึกแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" /> รอดำเนินการ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {cand.alreadyEnrolled ? (
                            <button
                              onClick={() => {
                                const found = records.find((r) => r.id === cand.existingRecordId);
                                if (found) handleEditRecord(found);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                            >
                              ดู/แก้ไข
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAddModal(cand)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              เปิดบันทึกซ่อม
                            </button>
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

      {/* TAB 3: Official OBEC Report Document */}
      {activeSubTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Printer className="w-5 h-5 text-indigo-600" />
              <span className="font-bold">แบบรายงานการสอนซ่อมเสริมและประเมินผลการเรียนแก้ตัว (เอกสาร สพฐ.)</span>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสารนี้ (Print A4)
            </button>
          </div>

          {/* Printable Document Box */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-sm font-['Sarabun',sans-serif] text-slate-900 printable-area">
            {/* Header */}
            <div className="text-center space-y-1 mb-6 border-b border-slate-300 pb-4">
              <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center font-bold text-2xl text-slate-700">
                ⚜️
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                แบบบันทึกผลการสอนซ่อมเสริมและการประเมินผลการเรียนแก้ตัว
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                ตามระเบียบกระทรวงศึกษาธิการว่าด้วยการวัดและประเมินผลการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน
              </p>
              <p className="text-xs text-slate-700 font-bold mt-1">
                {user?.school_name || 'โรงเรียนบ้านป่าส่าน'} • ระดับชั้นห้อง {activeClassroom.name} • ภาคเรียนที่ {terms[0]?.name || '1'} ปีการศึกษา {activeClassroom.academic_year}
              </p>
            </div>

            {/* Document Info Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">ครูผู้สอน/ประจำชั้น: </span>
                <span className="font-bold">{user?.full_name || 'ครูสมศรี จิตเมตตา'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">ระดับชั้น: </span>
                <span className="font-bold">{activeClassroom.level}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">จำนวนที่ซ่อมเสริม: </span>
                <span className="font-bold">{filteredRecords.length} รายการ</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">สอบแก้ตัวผ่านแล้ว: </span>
                <span className="font-bold text-emerald-700">{stats.passed} รายการ</span>
              </div>
            </div>

            {/* Official Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                    <th className="border border-slate-300 py-2 px-2 w-10">ที่</th>
                    <th className="border border-slate-300 py-2 px-2 w-20">เลขประจำตัว</th>
                    <th className="border border-slate-300 py-2 px-3 text-left">ชื่อ - นามสกุล</th>
                    <th className="border border-slate-300 py-2 px-3 text-left">รายวิชา / จุดประสงค์การเรียนรู้</th>
                    <th className="border border-slate-300 py-2 px-2 w-16">คะแนนเดิม</th>
                    <th className="border border-slate-300 py-2 px-3 text-left">กิจกรรม/วิธีการสอนซ่อมเสริม</th>
                    <th className="border border-slate-300 py-2 px-2 w-20">วันที่ซ่อม</th>
                    <th className="border border-slate-300 py-2 px-2 w-16">คะแนนแก้ตัว</th>
                    <th className="border border-slate-300 py-2 px-2 w-16">ผลตัดสิน</th>
                    <th className="border border-slate-300 py-2 px-3 w-24">ลายมือชื่อ นร.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => (
                    <tr key={r.id} className="text-slate-800">
                      <td className="border border-slate-300 py-2 px-2 text-center font-medium">{i + 1}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center">{r.student_code || '-'}</td>
                      <td className="border border-slate-300 py-2 px-3 font-semibold">{r.student_name}</td>
                      <td className="border border-slate-300 py-2 px-3">
                        <div className="font-bold text-slate-900">{r.subject_name}</div>
                        <div className="text-[11px] text-slate-600">{r.score_item_name}</div>
                        {r.indicator_or_standard && (
                          <div className="text-[10px] text-slate-500 italic">{r.indicator_or_standard}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center text-rose-600 font-bold">
                        {r.original_score}/{r.max_score}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-[11px]">
                        <div>{REMEDIAL_METHOD_LABELS[r.remedial_method]?.label}</div>
                        {r.learning_defect && (
                          <div className="text-[10px] text-slate-500">สาเหตุ: {r.learning_defect}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center text-[11px] whitespace-nowrap">
                        {r.remedial_date || '-'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                        {r.status === 'passed' ? (
                          <span className="text-emerald-700">{r.re_exam_score ?? r.final_recorded_score ?? '-'}</span>
                        ) : r.status === 'failed' ? (
                          <span className="text-rose-600">{r.re_exam_score ?? '-'}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                        {r.status === 'passed' ? (
                          <span className="text-emerald-700">ผ่าน</span>
                        ) : r.status === 'failed' ? (
                          <span className="text-rose-600">ไม่ผ่าน</span>
                        ) : (
                          <span className="text-slate-400">รอสอบ</span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-center text-slate-300">
                        .....................
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signatures Grid (สพฐ. Standard) */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
              <div className="space-y-6">
                <div>ลงชื่อ......................................................</div>
                <div>
                  ({user?.full_name || 'ครูสมศรี จิตเมตตา'})
                  <div className="text-[11px] text-slate-500">ครูผู้สอน / ผู้ดำเนินการสอนซ่อมเสริม</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>ลงชื่อ......................................................</div>
                <div>
                  (......................................................)
                  <div className="text-[11px] text-slate-500">หัวหน้ากลุ่มสาระการเรียนรู้</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>ลงชื่อ......................................................</div>
                <div>
                  (......................................................)
                  <div className="text-[11px] text-slate-500">หัวหน้างานวัดและประเมินผลการเรียนรู้</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>ลงชื่อ......................................................</div>
                <div>
                  (นายประเสริฐ สุขสวัสดิ์)
                  <div className="text-[11px] text-slate-500">ผู้อำนวยการสถานศึกษา</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Remedial Record */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                {editingRecord.id ? 'แก้ไขบันทึกการสอนซ่อมเสริม' : 'เพิ่มบันทึกการสอนซ่อมเสริมใหม่'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalRecord} className="space-y-4 text-xs sm:text-sm">
              {/* Row 1: Student Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลือกนักเรียน *</label>
                  <select
                    value={editingRecord.student_id}
                    onChange={(e) => {
                      const stu = students.find((s) => s.id === e.target.value);
                      if (stu) {
                        setEditingRecord((prev) => ({
                          ...prev,
                          student_id: stu.id,
                          student_name: stu.name,
                          student_code: stu.student_code,
                          student_no: stu.student_no,
                          classroom_id: stu.classroom_id || activeClassroom.id,
                          classroom_name: stu.classroom || activeClassroom.name,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        เลขที่ {s.student_no} - {s.name} ({s.student_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">รายวิชา *</label>
                  <select
                    value={editingRecord.subject_id}
                    onChange={(e) => {
                      const sub = subjects.find((s) => s.id === e.target.value);
                      if (sub) {
                        setEditingRecord((prev) => ({
                          ...prev,
                          subject_id: sub.id,
                          subject_name: sub.name,
                          subject_code: sub.code,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Term and Score Item */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ภาคเรียน *</label>
                  <select
                    value={editingRecord.term_id}
                    onChange={(e) => {
                      const term = terms.find((t) => t.id === e.target.value);
                      if (term) {
                        setEditingRecord((prev) => ({
                          ...prev,
                          term_id: term.id,
                          term_name: term.name,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ปีการศึกษา {t.academic_year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">รายการคะแนน / งานที่สอบตก *</label>
                  <select
                    value={editingRecord.score_item_id}
                    onChange={(e) => {
                      const itm = allScoreItems.find((i) => i.id === e.target.value);
                      if (itm) {
                        setEditingRecord((prev) => ({
                          ...prev,
                          score_item_id: itm.id,
                          score_item_name: itm.name,
                          max_score: itm.max_score,
                          target_passing_score: Math.round(itm.max_score * 0.5),
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- ระบุหรือเลือกรายการ --</option>
                    {allScoreItems
                      .filter(
                        (i) =>
                          (!editingRecord.subject_id || i.subject_id === editingRecord.subject_id) &&
                          (!editingRecord.term_id || i.term_id === editingRecord.term_id)
                      )
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (เต็ม {i.max_score} คะแนน)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Standard / Indicator */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ตัวชี้วัด / มาตรฐานการเรียนรู้ที่ต้องซ่อมเสริม
                </label>
                <input
                  type="text"
                  placeholder="เช่น ค 1.1 ป.5/2 การบวก ลบ คูณ หารเศษส่วน"
                  value={editingRecord.indicator_or_standard || ''}
                  onChange={(e) => setEditingRecord((prev) => ({ ...prev, indicator_or_standard: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Row 4: Scores (Original, Max, Target Passing) */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">คะแนนเดิมที่ตก *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingRecord.original_score ?? 0}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, original_score: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-rose-700 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">คะแนนเต็ม *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={editingRecord.max_score ?? 10}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, max_score: parseFloat(e.target.value) || 10 }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">เกณฑ์ผ่าน (สพฐ. 50%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingRecord.target_passing_score ?? 5}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, target_passing_score: parseFloat(e.target.value) || 5 }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-indigo-700 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Row 5: Remedial Method & Defect */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สาเหตุ / จุดบกพร่องของนักเรียน</label>
                  <input
                    type="text"
                    placeholder="เช่น ยังสับสนสูตร หรือ ขาดสอบเนื่องจากป่วย"
                    value={editingRecord.learning_defect || ''}
                    onChange={(e) => setEditingRecord((prev) => ({ ...prev, learning_defect: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">วิธีการสอนซ่อมเสริม *</label>
                  <select
                    value={editingRecord.remedial_method}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, remedial_method: e.target.value as RemedialMethod }))
                    }
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="individual_tutoring">สอนเสริมรายบุคคล / กลุ่มย่อย</option>
                    <option value="remedial_worksheet">มอบหมายชุดฝึก / ใบงานปรับพื้นฐาน</option>
                    <option value="peer_tutoring">กิจกรรมเพื่อนช่วยเพื่อน (Peer Tutoring)</option>
                    <option value="digital_learning">เรียนรู้ผ่านคลิป / สื่อบทเรียนออนไลน์</option>
                    <option value="project_assignment">โครงงาน / ชิ้นงานทดแทน</option>
                    <option value="other">วิธีการอื่นๆ ตามดุลยพินิจครู</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Remedial Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่สอนซ่อมเสริม</label>
                  <input
                    type="text"
                    placeholder="เช่น ๑๕ กันยายน ๒๕๖๙"
                    value={editingRecord.remedial_date || ''}
                    onChange={(e) => setEditingRecord((prev) => ({ ...prev, remedial_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนชั่วโมงที่สอน</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editingRecord.remedial_duration_hours ?? 1}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, remedial_duration_hours: parseFloat(e.target.value) || 1 }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานะปัจจุบัน *</label>
                  <select
                    value={editingRecord.status}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({ ...prev, status: e.target.value as RemedialStatus }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">รอดำเนินการสอนซ่อม</option>
                    <option value="in_progress">กำลังสอนซ่อมเสริม</option>
                    <option value="re_exam_scheduled">นัดสอบแก้ตัวแล้ว</option>
                    <option value="passed">สอบแก้ตัวผ่านแล้ว</option>
                    <option value="failed">ยังไม่ผ่านเกณฑ์</option>
                  </select>
                </div>
              </div>

              {/* Row 7: Re-exam Result Section if tested */}
              {editingRecord.status === 'passed' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-3">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ข้อมูลผลการสอบแก้ตัว & การปรับคะแนนในสมุดเกรด</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-800 mb-1">คะแนนสอบแก้ตัวที่ได้</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingRecord.re_exam_score ?? ''}
                        onChange={(e) =>
                          setEditingRecord((prev) => ({
                            ...prev,
                            re_exam_score: e.target.value === '' ? null : parseFloat(e.target.value),
                            final_recorded_score:
                              e.target.value === ''
                                ? null
                                : Math.min(parseFloat(e.target.value), prev?.target_passing_score || 5),
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 font-bold text-emerald-800 bg-white"
                        placeholder="เช่น 7"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-800 mb-1">
                        คะแนนที่บันทึกลง ปพ.5 (สพฐ.)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingRecord.final_recorded_score ?? ''}
                        onChange={(e) =>
                          setEditingRecord((prev) => ({
                            ...prev,
                            final_recorded_score: e.target.value === '' ? null : parseFloat(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 font-bold text-emerald-900 bg-white"
                        placeholder="เช่น 5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-800 mb-1">วันที่สอบแก้ตัว</label>
                      <input
                        type="text"
                        value={editingRecord.re_exam_date || ''}
                        onChange={(e) => setEditingRecord((prev) => ({ ...prev, re_exam_date: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 text-xs bg-white"
                        placeholder="เช่น ๒๐ กันยายน ๒๕๖๙"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editingRecord.synced_to_gradebook ?? true}
                      onChange={(e) => setEditingRecord((prev) => ({ ...prev, synced_to_gradebook: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>อัปเดตคะแนนนี้ลงสมุดเกรดบุ๊ก (ปพ.5) ทันทีหลังกดบันทึก</span>
                  </label>
                </div>
              )}

              {/* Teacher Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">บันทึกข้อเสนอแนะของครูผู้สอน</label>
                <textarea
                  rows={2}
                  placeholder="เช่น นักเรียนมีความตั้งใจและเข้าใจมโนทัศน์เพิ่มขึ้น..."
                  value={editingRecord.teacher_notes || ''}
                  onChange={(e) => setEditingRecord((prev) => ({ ...prev, teacher_notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Re-Exam Result Input */}
      {isQuickReExamModalOpen && quickTargetRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                บันทึกผลการสอบแก้ตัวด่วน
              </h3>
              <button
                onClick={() => setIsQuickReExamModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800 text-sm">{quickTargetRecord.student_name}</div>
              <div className="text-slate-600">
                วิชา: <span className="font-semibold text-indigo-900">{quickTargetRecord.subject_name}</span> • {quickTargetRecord.score_item_name}
              </div>
              <div className="text-slate-500">
                คะแนนเดิม: <span className="font-bold text-rose-600">{quickTargetRecord.original_score}</span> / {quickTargetRecord.max_score} (เกณฑ์ผ่าน {quickTargetRecord.target_passing_score || Math.round(quickTargetRecord.max_score * 0.5)})
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">คะแนนสอบแก้ตัวที่ทำได้</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={quickTargetRecord.max_score}
                    value={quickScoreInput}
                    onChange={(e) => setQuickScoreInput(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 font-extrabold text-base text-center text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400 font-bold">/ {quickTargetRecord.max_score} คะแนน</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">วันที่สอบแก้ตัว</label>
                <input
                  type="text"
                  value={quickDateInput}
                  onChange={(e) => setQuickDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={quickSyncGradebook}
                  onChange={(e) => setQuickSyncGradebook(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>อัปเดตคะแนนลงสมุด ปพ.5 ทันที (จำกัดไม่เกิน 50% ตามเกณฑ์ สพฐ.)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSubmitQuickReExam(false)}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ยังไม่ผ่านเกณฑ์ (ซ่อมรอบ 2)
              </button>

              <button
                type="button"
                onClick={() => handleSubmitQuickReExam(true)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                สอบแก้ตัวผ่านเกณฑ์ ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LINE Notify Sender */}
      {isLineModalOpen && lineModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                  💬
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">ส่งแจ้งเตือนผู้ปกครองผ่าน LINE</h3>
                  <p className="text-[11px] text-slate-400">แจ้งนัดหมายการสอนซ่อมเสริมหรือแจ้งผลสอบแก้ตัว</p>
                </div>
              </div>
              <button
                onClick={() => setIsLineModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template selector pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLineMessageType('schedule');
                  const schoolName = user?.school_name || activeClassroom.name || 'โรงเรียนบ้านป่าส่าน';
                  const teacherName = user?.full_name || 'ครูผู้สอน';
                  setLineMessageText(
                    lineNotifyService.buildRemedialNoticeMessage({
                      classroomName: lineModalRecord.classroom_name || activeClassroom.name,
                      studentName: lineModalRecord.student_name,
                      studentNo: lineModalRecord.student_no,
                      subjectName: lineModalRecord.subject_name,
                      remedialItemName: lineModalRecord.score_item_name || 'การประเมินผลการเรียนรู้',
                      remedialDate: lineModalRecord.remedial_date,
                      remedialMethod: REMEDIAL_METHOD_LABELS[lineModalRecord.remedial_method]?.label || 'การสอนเสริม',
                      reExamDate: lineModalRecord.re_exam_date || 'ตามที่ครูกำหนด',
                      teacherName,
                      schoolName,
                    })
                  );
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                  lineMessageType === 'schedule'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                📅 แจ้งนัดหมายเวลาซ่อมเสริม
              </button>

              <button
                onClick={() => {
                  setLineMessageType('passed');
                  const schoolName = user?.school_name || activeClassroom.name || 'โรงเรียนบ้านป่าส่าน';
                  const teacherName = user?.full_name || 'ครูผู้สอน';
                  const passScore = lineModalRecord.target_passing_score || Math.round(lineModalRecord.max_score * 0.5);
                  setLineMessageText(
                    lineNotifyService.buildRemedialPassedMessage({
                      classroomName: lineModalRecord.classroom_name || activeClassroom.name,
                      studentName: lineModalRecord.student_name,
                      studentNo: lineModalRecord.student_no,
                      subjectName: lineModalRecord.subject_name,
                      scoreItemName: lineModalRecord.score_item_name || 'งานที่สอบแก้ตัว',
                      reExamScore: lineModalRecord.re_exam_score ?? passScore,
                      maxScore: lineModalRecord.max_score,
                      finalRecordedScore: lineModalRecord.final_recorded_score ?? passScore,
                      teacherName,
                      schoolName,
                    })
                  );
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                  lineMessageType === 'passed'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🎉 แจ้งผลสอบแก้ตัวผ่านแล้ว
              </button>
            </div>

            {/* Message preview textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อความที่จะส่ง (สามารถปรับแต่งข้อความเพิ่มเติมได้)
              </label>
              <textarea
                rows={7}
                value={lineMessageText}
                onChange={(e) => setLineMessageText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Status notice */}
            {lineStatusNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  lineStatusNotice.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {lineStatusNotice.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{lineStatusNotice.msg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <a
                href={lineNotifyService.getLineShareUrl(lineMessageText)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
              >
                <Share2 className="w-3.5 h-3.5" />
                แชร์ไปยัง LINE App
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLineModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={handleSendLine}
                  disabled={isSendingLine}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingLine ? 'กำลังส่ง...' : 'ส่ง LINE Notify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
