import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Subject,
  Term,
  ScoreItem,
  Student,
  Score,
  ScoreStatus,
  User,
} from '../types';
import { storage } from '../services/storage';
import { lineNotifyService } from '../services/lineNotify';
import { getStudentTermScore } from '../utils/gradeCalculator';
import { ScoreCsvImportExportModal } from '../components/ScoreCsvImportExportModal';
import { ScoreWeightingModal } from '../components/ScoreWeightingModal';
import { QuickScoreTextEntryModal } from '../components/QuickScoreTextEntryModal';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Search,
  Filter,
  Check,
  Table,
  Layers,
  X,
  Send,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  Settings,
  Bell,
  FileSpreadsheet,
  Download,
  Upload,
  Sliders,
  Zap,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCheck,
  Hash,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface ScoreEntryPageProps {
  currentTerm: Term;
  terms: Term[];
  subjects: Subject[];
  students: Student[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  onScoresUpdated: () => void;
  onSelectTerm: (term: Term) => void;
  onNavigateToSheets?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToRemedial?: () => void;
  onNavigateToSchoolMis?: () => void;
  classroomName?: string;
  user?: User;
  onAutoSaveStatusChange?: (status: 'saving' | 'saved', timeStr?: string) => void;
}

export const ScoreEntryPage: React.FC<ScoreEntryPageProps> = ({
  currentTerm,
  terms,
  subjects,
  students,
  allScoreItems,
  allScores,
  onScoresUpdated,
  onSelectTerm,
  onNavigateToSheets,
  onNavigateToNotifications,
  onNavigateToRemedial,
  onNavigateToSchoolMis,
  classroomName,
  user,
  onAutoSaveStatusChange,
}) => {
  // Selected state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // LINE Notification Modal state
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMode, setNotifyMode] = useState<'score_saved' | 'midterm_final' | 'at_risk'>('score_saved');
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null);
  const [copiedNotifyText, setCopiedNotifyText] = useState(false);

  // CSV Import/Export Modal state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvModalTab, setCsvModalTab] = useState<'export' | 'import'>('export');

  // Custom Score Weighting Modal state
  const [showWeightingModal, setShowWeightingModal] = useState(false);

  // Quick Text/CSV Score Entry Modal state
  const [showQuickTextEntryModal, setShowQuickTextEntryModal] = useState(false);

  // Quick Fill Mode state (bulk assign same score to multiple students)
  const [isQuickFillMode, setIsQuickFillMode] = useState(false);
  const [quickFillItemId, setQuickFillItemId] = useState<string>('');
  const [quickFillScore, setQuickFillScore] = useState<string>('');
  const [quickFillStatus, setQuickFillStatus] = useState<ScoreStatus>('normal');
  const [quickFillFilter, setQuickFillFilter] = useState<'all' | 'selected' | 'empty_only' | 'failing_only'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Feedback Notification state (for alerts/warnings without window.alert)
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const feedbackToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((type: 'success' | 'warning' | 'error', title: string, message: string) => {
    setFeedbackToast({ type, title, message });
    if (feedbackToastTimeoutRef.current) clearTimeout(feedbackToastTimeoutRef.current);
    feedbackToastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  }, []);

  // Trigger floating saved toast
  const triggerSavedToast = () => {
    setShowSavedToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowSavedToast(false);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (feedbackToastTimeoutRef.current) clearTimeout(feedbackToastTimeoutRef.current);
    };
  }, []);

  // Local draft scores map: key = `${studentId}_${itemId}`
  const [draftScores, setDraftScores] = useState<
    Record<string, { studentId: string; itemId: string; score: number | null; status: ScoreStatus; note?: string }>
  >({});
  const draftScoresRef = useRef(draftScores);
  const isDirtyRef = useRef(false);

  // Input refs for keyboard navigation: key = `${studentIndex}_${itemIndex}`
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Current subject's items for current term (memoized)
  const currentSubjectItems = useMemo(() => {
    return allScoreItems.filter(
      (i) => i.subject_id === selectedSubjectId && i.term_id === currentTerm.id
    );
  }, [allScoreItems, selectedSubjectId, currentTerm.id]);

  // Default selected item
  useEffect(() => {
    if (currentSubjectItems.length > 0) {
      if (!selectedItemId || !currentSubjectItems.some((i) => i.id === selectedItemId)) {
        setSelectedItemId(currentSubjectItems[0].id);
      }
    } else {
      setSelectedItemId('');
    }
  }, [selectedSubjectId, currentTerm.id, currentSubjectItems, selectedItemId]);

  // Refresh draft scores from latest storage data
  const refreshDraftScores = useCallback(() => {
    const latestScores = storage.getScores();
    const draft: Record<string, { studentId: string; itemId: string; score: number | null; status: ScoreStatus; note?: string }> = {};
    for (const stu of students) {
      for (const item of currentSubjectItems) {
        const found = latestScores.find(
          (s) => s.student_id === stu.id && s.score_item_id === item.id
        );
        draft[`${stu.id}_${item.id}`] = {
          studentId: stu.id,
          itemId: item.id,
          score: found ? found.score : null,
          status: found ? found.status : 'normal',
          note: found?.note || '',
        };
      }
    }
    setDraftScores(draft);
    draftScoresRef.current = draft;
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
  }, [students, currentSubjectItems]);

  // Load scores into draft state when term, subject, or student list changes
  useEffect(() => {
    // If there were pending dirty changes, flush them to storage first
    if (isDirtyRef.current) {
      const currentDraft = draftScoresRef.current;
      const updates: Array<Omit<Score, 'id'>> = [];
      Object.values(currentDraft).forEach((val) => {
        if (val && val.studentId && val.itemId) {
          updates.push({
            student_id: val.studentId,
            score_item_id: val.itemId,
            score: val.score,
            status: val.status,
            note: val.note,
          });
        }
      });
      if (updates.length > 0) {
        storage.batchUpsertScores(updates);
        isDirtyRef.current = false;
      }
    }

    refreshDraftScores();
  }, [selectedSubjectId, currentTerm.id, refreshDraftScores]);

  // Sync draft if external allScores prop updates and there are no dirty local edits
  useEffect(() => {
    if (!isDirtyRef.current) {
      refreshDraftScores();
    }
  }, [allScores, refreshDraftScores]);

  const activeItem = currentSubjectItems.find((i) => i.id === selectedItemId);

  // Active subject
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // LINE Notify Stats and Message generation
  const notifyStats = useMemo(() => {
    if (!activeSubject) return null;
    const items = allScoreItems.filter(
      (i) => i.subject_id === activeSubject.id && i.term_id === currentTerm.id
    );

    let recorded = 0;
    let sumScore = 0;
    const scoreArr: number[] = [];
    const atRisk: Array<{ studentNo: number; studentName: string; reason: string }> = [];

    students.forEach((stu) => {
      let stuTotal = 0;
      let hasAbsent = false;
      let hasMissing = false;
      let hasScore = false;

      items.forEach((it) => {
        const d = draftScores[`${stu.id}_${it.id}`];
        if (d) {
          if (d.status === 'absent') hasAbsent = true;
          if (d.status === 'missing') hasMissing = true;
          if (typeof d.score === 'number') {
            stuTotal += d.score;
            hasScore = true;
          }
        }
      });

      if (hasScore || hasAbsent || hasMissing) {
        recorded++;
        sumScore += stuTotal;
        scoreArr.push(stuTotal);
      }

      if (hasAbsent) {
        atRisk.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: 'ติด ร (ขาดสอบเก็บคะแนน)',
        });
      } else if (hasMissing) {
        atRisk.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: 'ติด มส (ค้างส่งงาน/ชิ้นงาน)',
        });
      } else if (stuTotal < 25 && hasScore) {
        atRisk.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: `คะแนนรวมต่ำกว่าเกณฑ์ (${stuTotal}/50 คะแนน)`,
        });
      }
    });

    return {
      recordedCount: recorded,
      totalStudents: students.length,
      average: scoreArr.length > 0 ? sumScore / scoreArr.length : 0,
      maxScore: scoreArr.length > 0 ? Math.max(...scoreArr) : 0,
      minScore: scoreArr.length > 0 ? Math.min(...scoreArr) : 0,
      atRisk,
    };
  }, [activeSubject, currentTerm.id, allScoreItems, draftScores, students]);

  // Computed modal message
  const modalMessage = useMemo(() => {
    if (!activeSubject) return '';
    const schoolName = user?.school_name || 'โรงเรียนบ้านป่าส่าน';
    const teacherName = user?.full_name || 'ครูสมศรี จิตเมตตา';
    const classRoomStr = classroomName || 'ป.5/1';

    if (notifyMode === 'score_saved') {
      return lineNotifyService.buildScoreSavedMessage({
        classroomName: classRoomStr,
        subject: activeSubject,
        term: currentTerm,
        scoreItem: activeItem,
        totalStudents: students.length,
        recordedCount: notifyStats?.recordedCount || students.length,
        teacherName,
        schoolName,
      });
    }

    if (notifyMode === 'midterm_final') {
      return lineNotifyService.buildExamAnnouncementMessage({
        classroomName: classRoomStr,
        subject: activeSubject,
        term: currentTerm,
        examType: 'midterm',
        averageScore: notifyStats?.average || 0,
        maxScoreObtained: notifyStats?.maxScore || 0,
        minScoreObtained: notifyStats?.minScore || 0,
        fullScore: 50,
        totalStudents: notifyStats?.recordedCount || students.length,
        teacherName,
        schoolName,
      });
    }

    // At risk mode
    const risks = notifyStats?.atRisk && notifyStats.atRisk.length > 0
      ? notifyStats.atRisk
      : [{ studentNo: 1, studentName: 'นักเรียนทุกคนส่งงานครบถ้วน', reason: 'ไม่มีงานค้างส่ง' }];

    return lineNotifyService.buildLowScoreAndMissingAlertMessage({
      classroomName: classRoomStr,
      subject: activeSubject,
      term: currentTerm,
      studentsAtRisk: risks,
      teacherName,
      schoolName,
    });
  }, [activeSubject, currentTerm, activeItem, classroomName, user, notifyMode, notifyStats, students.length]);

  // Handle Send LINE Notification
  const handleSendNotification = async () => {
    setIsSendingNotify(true);
    setNotifyFeedback(null);

    const title =
      notifyMode === 'score_saved'
        ? `บันทึกคะแนนวิชา${activeSubject.name}`
        : notifyMode === 'midterm_final'
        ? `ประกาศผลสอบกลาง/ปลายภาควิชา${activeSubject.name}`
        : `แจ้งเตือนติดตามงานค้างส่งวิชา${activeSubject.name}`;

    const res = await lineNotifyService.sendMessage(modalMessage, {
      type: notifyMode === 'at_risk' ? 'low_score_alert' : notifyMode,
      title,
      classroom: classroomName || 'ป.5/1',
      subjectName: activeSubject.name,
      termName: currentTerm.name,
      studentCount: students.length,
    });

    setIsSendingNotify(false);
    setNotifyFeedback({
      success: res.success,
      message: res.message,
      simulated: res.simulated,
    });
  };

  // Save changes to storage immediately and reliably
  const flushAndSaveScores = useCallback(() => {
    const currentDraft = draftScoresRef.current;
    const updates: Array<Omit<Score, 'id'>> = [];
    Object.values(currentDraft).forEach((val) => {
      if (val && val.studentId && val.itemId) {
        updates.push({
          student_id: val.studentId,
          score_item_id: val.itemId,
          score: val.score,
          status: val.status,
          note: val.note,
        });
      }
    });

    if (updates.length > 0) {
      onAutoSaveStatusChange?.('saving');
      storage.batchUpsertScores(updates);
      isDirtyRef.current = false;
      setAutoSaveStatus('saved');
      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      onAutoSaveStatusChange?.('saved', timeStr);
      onScoresUpdated();
    }
  }, [onScoresUpdated, onAutoSaveStatusChange]);

  // Flush pending scores immediately on component unmount (when switching to other tabs)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        flushAndSaveScores();
      }
    };
  }, [flushAndSaveScores]);

  // Debounced auto-save effect
  useEffect(() => {
    if (autoSaveStatus !== 'dirty') return;

    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      flushAndSaveScores();
      triggerSavedToast();
    }, 500);

    return () => clearTimeout(timer);
  }, [draftScores, autoSaveStatus, flushAndSaveScores]);

  const handleManualSave = () => {
    isDirtyRef.current = true;
    flushAndSaveScores();
    triggerSavedToast();
  };

  // Score value change handler with immediate synchronous storage persistence
  const handleScoreChange = (studentId: string, itemId: string, rawVal: string, maxScore: number) => {
    const key = `${studentId}_${itemId}`;
    let numVal: number | null = null;

    if (rawVal.trim() !== '') {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed)) {
        numVal = Math.max(0, parsed);
      }
    }

    const currentItem = draftScoresRef.current[key];
    const prevStatus = currentItem?.status || 'normal';
    const newStatus: ScoreStatus = (prevStatus === 'absent' || prevStatus === 'missing') ? 'normal' : prevStatus;
    const note = currentItem?.note || '';

    const updated = {
      ...draftScoresRef.current,
      [key]: {
        studentId,
        itemId,
        score: numVal,
        status: newStatus,
        note,
      },
    };
    draftScoresRef.current = updated;
    setDraftScores(updated);

    // Save immediately into storage synchronously so switching pages or reloading never loses scores!
    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores([
      {
        student_id: studentId,
        score_item_id: itemId,
        score: numVal,
        status: newStatus,
        note,
      },
    ]);
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(timeStr);
    onAutoSaveStatusChange?.('saved', timeStr);
    onScoresUpdated();
  };

  // Status toggle handler (normal / absent / missing) with immediate persistence
  const handleStatusToggle = (studentId: string, itemId: string, status: ScoreStatus) => {
    const key = `${studentId}_${itemId}`;
    const current = draftScoresRef.current[key] || { studentId, itemId, score: null, status: 'normal' };
    const newStatus: ScoreStatus = current.status === status ? 'normal' : status;
    const scoreVal = newStatus !== 'normal' ? null : current.score;
    const note = current.note || '';

    const updated = {
      ...draftScoresRef.current,
      [key]: {
        ...current,
        studentId,
        itemId,
        status: newStatus,
        score: scoreVal,
        note,
      },
    };
    draftScoresRef.current = updated;
    setDraftScores(updated);

    // Save immediately to storage
    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores([
      {
        student_id: studentId,
        score_item_id: itemId,
        status: newStatus,
        score: scoreVal,
        note,
      },
    ]);
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(timeStr);
    onAutoSaveStatusChange?.('saved', timeStr);
    onScoresUpdated();
  };

  // Keyboard navigation for spreadsheet feel
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    itemIdx: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRef = inputRefs.current[`${studentIdx + 1}_${itemIdx}`];
      if (nextRef) {
        nextRef.focus();
        nextRef.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRef = inputRefs.current[`${studentIdx - 1}_${itemIdx}`];
      if (prevRef) {
        prevRef.focus();
        prevRef.select();
      }
    } else if (e.key === 'ArrowRight' && viewMode === 'all') {
      const nextColRef = inputRefs.current[`${studentIdx}_${itemIdx + 1}`];
      if (nextColRef && e.currentTarget.selectionStart === e.currentTarget.value.length) {
        e.preventDefault();
        nextColRef.focus();
        nextColRef.select();
      }
    } else if (e.key === 'ArrowLeft' && viewMode === 'all') {
      const prevColRef = inputRefs.current[`${studentIdx}_${itemIdx - 1}`];
      if (prevColRef && e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        prevColRef.focus();
        prevColRef.select();
      }
    }
  };

  // Quick fill maximum score for all students
  const handleFillMaxScore = (itemId: string, maxScore: number) => {
    if (!window.confirm(`ต้องการใส่คะแนนเต็ม (${maxScore} คะแนน) ให้นักเรียนทุกคนในรายการนี้ใช่หรือไม่?`)) {
      return;
    }
    const updated = { ...draftScoresRef.current };
    const updates: Array<Omit<Score, 'id'>> = [];
    for (const stu of filteredStudents) {
      const key = `${stu.id}_${itemId}`;
      const note = updated[key]?.note || '';
      updated[key] = {
        studentId: stu.id,
        itemId,
        score: maxScore,
        status: 'normal',
        note,
      };
      updates.push({
        student_id: stu.id,
        score_item_id: itemId,
        score: maxScore,
        status: 'normal',
        note,
      });
    }
    setDraftScores(updated);
    draftScoresRef.current = updated;
    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores(updates);
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(timeStr);
    onAutoSaveStatusChange?.('saved', timeStr);
    triggerSavedToast();
    onScoresUpdated();
  };

  // Quick clear column scores
  const handleClearScores = (itemId: string) => {
    if (!window.confirm(`ต้องการล้างคะแนนในรายการนี้ทั้งหมดใช่หรือไม่?`)) {
      return;
    }
    const updated = { ...draftScoresRef.current };
    const updates: Array<Omit<Score, 'id'>> = [];
    for (const stu of filteredStudents) {
      const key = `${stu.id}_${itemId}`;
      updated[key] = {
        studentId: stu.id,
        itemId,
        score: null,
        status: 'normal',
        note: '',
      };
      updates.push({
        student_id: stu.id,
        score_item_id: itemId,
        score: null,
        status: 'normal',
        note: '',
      });
    }
    setDraftScores(updated);
    draftScoresRef.current = updated;
    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores(updates);
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(timeStr);
    onAutoSaveStatusChange?.('saved', timeStr);
    triggerSavedToast();
    onScoresUpdated();
  };

  // Filter students by query
  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      s.student_no.toString().includes(searchQuery) ||
      s.student_code.includes(searchQuery)
  );

  // Active item targeted for Quick Fill
  const activeQuickFillItem = useMemo(() => {
    return (
      currentSubjectItems.find((i) => i.id === quickFillItemId) ||
      currentSubjectItems.find((i) => i.id === selectedItemId) ||
      currentSubjectItems[0] ||
      null
    );
  }, [currentSubjectItems, quickFillItemId, selectedItemId]);

  // Sync quickFillItemId when selectedItemId or items change
  useEffect(() => {
    if (activeItem && (!quickFillItemId || !currentSubjectItems.some((i) => i.id === quickFillItemId))) {
      setQuickFillItemId(activeItem.id);
    }
  }, [activeItem, currentSubjectItems, quickFillItemId]);

  // Target students calculation for Quick Fill based on active filter
  const targetStudents = useMemo(() => {
    if (!activeQuickFillItem) return [];
    return filteredStudents.filter((stu) => {
      if (quickFillFilter === 'selected') {
        return selectedStudentIds.has(stu.id);
      }
      const key = `${stu.id}_${activeQuickFillItem.id}`;
      const cur = draftScores[key];
      if (quickFillFilter === 'empty_only') {
        return cur === undefined || cur.score === null || cur.score === undefined;
      }
      if (quickFillFilter === 'failing_only') {
        return cur && typeof cur.score === 'number' && cur.score < activeQuickFillItem.max_score * 0.5;
      }
      return true; // 'all'
    });
  }, [filteredStudents, activeQuickFillItem, quickFillFilter, selectedStudentIds, draftScores]);

  // Metrics for quick fill filters
  const emptyScoresCount = useMemo(() => {
    if (!activeQuickFillItem) return 0;
    return filteredStudents.filter((stu) => {
      const key = `${stu.id}_${activeQuickFillItem.id}`;
      const cur = draftScores[key];
      return cur === undefined || cur.score === null || cur.score === undefined;
    }).length;
  }, [filteredStudents, activeQuickFillItem, draftScores]);

  const failingScoresCount = useMemo(() => {
    if (!activeQuickFillItem) return 0;
    return filteredStudents.filter((stu) => {
      const key = `${stu.id}_${activeQuickFillItem.id}`;
      const cur = draftScores[key];
      return cur && typeof cur.score === 'number' && cur.score < activeQuickFillItem.max_score * 0.5;
    }).length;
  }, [filteredStudents, activeQuickFillItem, draftScores]);

  // Selection handlers
  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const handleSelectOddStudents = () => {
    const oddIds = filteredStudents.filter((s) => s.student_no % 2 !== 0).map((s) => s.id);
    setSelectedStudentIds(new Set(oddIds));
  };

  const handleSelectEvenStudents = () => {
    const evenIds = filteredStudents.filter((s) => s.student_no % 2 === 0).map((s) => s.id);
    setSelectedStudentIds(new Set(evenIds));
  };

  const handleInvertStudentSelection = () => {
    const inverted = filteredStudents
      .filter((s) => !selectedStudentIds.has(s.id))
      .map((s) => s.id);
    setSelectedStudentIds(new Set(inverted));
  };

  // Keyboard shortcut listener: Alt+Q to toggle Quick Fill, Escape to exit
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        setIsQuickFillMode((prev) => {
          const next = !prev;
          if (next && selectedStudentIds.size === 0) {
            setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
          }
          return next;
        });
      } else if (e.key === 'Escape' && isQuickFillMode) {
        setIsQuickFillMode(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isQuickFillMode, filteredStudents, selectedStudentIds.size]);

  // Apply Quick Fill handler
  const handleApplyQuickFill = (specificStudentId?: string) => {
    if (!activeQuickFillItem) {
      showNotification('warning', 'กรุณาเลือกชิ้นงาน / ภาระงาน', 'โปรดเลือกชิ้นงานหรือภาระงานที่ต้องการใส่คะแนนก่อน');
      return;
    }

    const studentsToUpdate = specificStudentId
      ? filteredStudents.filter((s) => s.id === specificStudentId)
      : targetStudents;

    if (studentsToUpdate.length === 0) {
      showNotification('warning', 'ไม่พบนักเรียนตามเงื่อนไข', 'ไม่พบนักเรียนตามตัวกรองที่เลือก กรุณาเลือกนักเรียนหรือเปลี่ยนกลุ่มเป้าหมาย');
      return;
    }

    let parsedScore: number | null = null;
    if (quickFillStatus === 'normal') {
      if (quickFillScore.trim() !== '') {
        const val = parseFloat(quickFillScore);
        if (isNaN(val)) {
          showNotification('error', 'คะแนนไม่ถูกต้อง', 'กรุณาระบุคะแนนเป็นตัวเลข');
          return;
        }
        if (val < 0) {
          showNotification('error', 'คะแนนต้องไม่ติดลบ', 'กรุณาระบุคะแนนตั้งแต่ 0 ขึ้นไป');
          return;
        }
        if (val > activeQuickFillItem.max_score) {
          showNotification(
            'warning',
            'คะแนนเกินคะแนนเต็ม',
            `คะแนน (${val}) เกินคะแนนเต็ม (${activeQuickFillItem.max_score}) ระบบได้ปรับเป็นคะแนนเต็ม (${activeQuickFillItem.max_score}) ให้อัตโนมัติ`
          );
          parsedScore = activeQuickFillItem.max_score;
        } else {
          parsedScore = val;
        }
      } else {
        parsedScore = null;
      }
    } else {
      parsedScore = null;
    }

    const updated = { ...draftScoresRef.current };
    const updates: Array<Omit<Score, 'id'>> = [];

    for (const stu of studentsToUpdate) {
      const key = `${stu.id}_${activeQuickFillItem.id}`;
      const note = updated[key]?.note || '';
      updated[key] = {
        studentId: stu.id,
        itemId: activeQuickFillItem.id,
        score: parsedScore,
        status: quickFillStatus,
        note,
      };
      updates.push({
        student_id: stu.id,
        score_item_id: activeQuickFillItem.id,
        score: parsedScore,
        status: quickFillStatus,
        note,
      });
    }

    setDraftScores(updated);
    draftScoresRef.current = updated;
    onAutoSaveStatusChange?.('saving');
    storage.batchUpsertScores(updates);
    isDirtyRef.current = false;
    setAutoSaveStatus('saved');
    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedTime(timeStr);
    onAutoSaveStatusChange?.('saved', timeStr);
    triggerSavedToast();
    onScoresUpdated();

    const scoreDescription =
      quickFillStatus === 'absent'
        ? 'สถานะ: ขาดสอบ (ร)'
        : quickFillStatus === 'missing'
        ? 'สถานะ: ไม่ส่งงาน (มส)'
        : parsedScore === null
        ? 'ล้างเป็นค่าว่าง'
        : `${parsedScore} / ${activeQuickFillItem.max_score} คะแนน`;

    showNotification(
      'success',
      'บันทึกคะแนนด่วนสำเร็จ (Quick Fill)',
      `บันทึกให้ ${studentsToUpdate.length} คน ในภาระงาน "${activeQuickFillItem.name}" (${scoreDescription})`
    );
  };

  // Compute live student term total based on draft scores
  const calculateStudentDraftTermTotal = (studentId: string) => {
    let total = 0;
    let hasAbsent = false;
    let hasMissing = false;

    for (const item of currentSubjectItems) {
      const val = draftScores[`${studentId}_${item.id}`];
      if (val) {
        if (val.status === 'absent') hasAbsent = true;
        if (val.status === 'missing') hasMissing = true;
        if (typeof val.score === 'number') {
          total += val.score;
        }
      }
    }

    const rounded = Math.round(total * 10) / 10;
    return {
      total: rounded,
      isExceeded: rounded > 50,
      hasAbsent,
      hasMissing,
    };
  };

  const handleCopyModalText = () => {
    navigator.clipboard.writeText(modalMessage);
    setCopiedNotifyText(true);
    setTimeout(() => setCopiedNotifyText(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Subtle Floating 'Saved' Toast Notification in the Top Right Corner */}
      <div
        className={`fixed top-4 right-4 sm:top-5 sm:right-6 z-50 transition-all duration-300 ease-out transform ${
          showSavedToast
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/90 text-white rounded-xl shadow-xl backdrop-blur-md border border-slate-700/60 text-xs sm:text-sm">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex flex-col pr-1">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span>บันทึกแล้ว</span>
              <span className="text-[10px] font-medium text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                Saved
              </span>
            </div>
            <span className="text-[11px] text-slate-300">
              บันทึกคะแนนอัตโนมัติแล้ว {lastSavedTime ? `เวลา ${lastSavedTime}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSavedToast(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Feedback Notification Toast (Quick Fill, Warnings, Confirmations) */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out transform ${
          feedbackToast
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-3 scale-95 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        {feedbackToast && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-xs sm:text-sm max-w-lg ${
              feedbackToast.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-400/50'
                : feedbackToast.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-400/50'
                : 'bg-rose-950/95 text-rose-100 border-rose-400/50'
            }`}
          >
            <div className="shrink-0">
              {feedbackToast.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                </div>
              ) : feedbackToast.type === 'warning' ? (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 font-bold">
                  <X className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 pr-1">
              <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>{feedbackToast.title}</span>
              </div>
              <p className="text-[11px] sm:text-xs opacity-90 mt-0.5 leading-snug">
                {feedbackToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="ปิด"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Top Filter and Selectors Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex flex-wrap items-center gap-2">
              <span>บันทึกคะแนนนักเรียน</span>
              {classroomName && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  ห้อง {classroomName}
                </span>
              )}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {currentTerm.name} (ปีการศึกษา {currentTerm.academic_year})
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              พิมพ์คะแนนแล้วกด Enter หรือลูกศรลงเพื่อเลื่อนไปนักเรียนคนถัดไปได้ทันที
            </p>
          </div>

          {/* Auto-save & Manual Save bar */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <div className="flex items-center gap-1.5 text-xs">
              {autoSaveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  บันทึกอัตโนมัติแล้ว {lastSavedTime && `(${lastSavedTime})`}
                </span>
              )}
              {autoSaveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
                  กำลังบันทึก...
                </span>
              )}
              {autoSaveStatus === 'dirty' && (
                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  มีการแก้ไข (รอกลางจังหวะ)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowWeightingModal(true)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="ตั้งค่าสัดส่วนคะแนน (เก็บ : กลางภาค : ปลายภาค)"
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>สัดส่วนคะแนน</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsQuickFillMode((prev) => {
                  const next = !prev;
                  if (next && selectedStudentIds.size === 0) {
                    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
                  }
                  return next;
                });
              }}
              className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isQuickFillMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
              title="เปิด/ปิดโหมดใส่คะแนนด่วนสำหรับนักเรียนหลายคนพร้อมกัน (Alt+Q)"
            >
              <Zap
                className={`w-4 h-4 ${
                  isQuickFillMode ? 'fill-slate-950 text-slate-950' : 'text-amber-600'
                }`}
              />
              <span>{isQuickFillMode ? 'โหมด Quick Fill (เปิด)' : 'โหมด Quick Fill'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  isQuickFillMode ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {isQuickFillMode ? 'ON' : 'ใหม่'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowQuickTextEntryModal(true)}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="กรอกคะแนนแบบข้อความรวดเร็ว (CSV-style Text Area) วางครั้งเดียวได้ทั้งห้อง"
            >
              <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
              <span>กรอกด่วน (CSV/Text)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCsvModalTab('export');
                setShowCsvModal(true);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="นำเข้าหรือส่งออกคะแนนเป็นไฟล์ Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>นำเข้า/ส่งออก CSV</span>
            </button>

            {onNavigateToSchoolMis && (
              <button
                type="button"
                onClick={onNavigateToSchoolMis}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="ส่งออกข้อมูลเชื่อมต่อ SchoolMIS สพฐ."
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>ส่งออก SchoolMIS</span>
              </button>
            )}

            {onNavigateToRemedial && (
              <button
                type="button"
                onClick={onNavigateToRemedial}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="จัดการสอนซ่อมเสริมและสอบแก้ตัว"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>สอนซ่อมเสริม & แก้ตัว</span>
              </button>
            )}

            {onNavigateToSheets && (
              <button
                type="button"
                onClick={onNavigateToSheets}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="ซิงค์คะแนนกับ Google Sheets"
              >
                <Table className="w-4 h-4 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNotifyFeedback(null);
                setShowNotifyModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="ส่งการแจ้งเตือนไปยังผู้ปกครองผ่าน LINE Notify"
            >
              <MessageSquare className="w-4 h-4 text-emerald-200" />
              <span>แจ้งเตือน LINE</span>
            </button>

            <button
              onClick={handleManualSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Control Controls (Term, Subject, Item, View Mode) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
          {/* Term Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              1. เลือกภาคเรียน
            </label>
            <select
              value={currentTerm.id}
              onChange={(e) => {
                if (isDirtyRef.current) {
                  flushAndSaveScores();
                }
                const term = terms.find((t) => t.id === e.target.value);
                if (term) onSelectTerm(term);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (เต็ม {t.max_score} คะแนน)
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              2. เลือกรายวิชา
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                if (isDirtyRef.current) {
                  flushAndSaveScores();
                }
                setSelectedSubjectId(e.target.value);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-indigo-900"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          {/* Score Item Selector (Single Mode) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              3. เลือกรายการคะแนน
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                if (isDirtyRef.current) {
                  flushAndSaveScores();
                }
                setSelectedItemId(e.target.value);
              }}
              disabled={viewMode === 'all'}
              className={`w-full px-3 py-2 text-sm border rounded-xl font-semibold ${
                viewMode === 'all'
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500'
              }`}
            >
              {currentSubjectItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (เต็ม {item.max_score} คะแนน)
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              มุมมองตาราง
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  viewMode === 'single'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>เฉพาะรายการ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  viewMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>รวมทุกรายการ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tools & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือเลขที่..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setIsQuickFillMode((prev) => {
                  const next = !prev;
                  if (next && selectedStudentIds.size === 0) {
                    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
                  }
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isQuickFillMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
              title="เปิด/ปิดโหมดใส่คะแนนด่วน (Alt+Q)"
            >
              <Zap className={`w-3.5 h-3.5 ${isQuickFillMode ? 'fill-slate-950' : 'text-amber-600'}`} />
              <span>{isQuickFillMode ? 'โหมด Quick Fill (เปิดอยู่)' : 'โหมด Quick Fill'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  isQuickFillMode ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {isQuickFillMode ? 'ON' : 'Alt+Q'}
              </span>
            </button>

            {viewMode === 'single' && activeItem && (
              <>
                <button
                  type="button"
                  onClick={() => handleFillMaxScore(activeItem.id, activeItem.max_score)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="ใส่คะแนนเต็มให้นักเรียนทุกคนในรายการนี้"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ให้เต็ม {activeItem.max_score} ทุกคน</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleClearScores(activeItem.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="ล้างคะแนนคอลัมน์นี้"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างคะแนน</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Fill Control Panel (Interactive Banner when mode is active) */}
        {isQuickFillMode && activeQuickFillItem && (
          <div className="mt-4 pt-4 border-t border-amber-200 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-sm space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Zap className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>โหมดใส่คะแนนด่วน (Quick Fill Mode)</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      เปิดใช้งานอยู่
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    กำหนดคะแนนเดียวกันให้กับนักเรียนหลายคนพร้อมกันในครั้งเดียว สำหรับการบ้าน/งาน/ข้อสอบ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[11px] text-slate-400 hidden md:inline">กด Esc เพื่อปิด</span>
                <button
                  type="button"
                  onClick={() => setIsQuickFillMode(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ปิดโหมดนี้</span>
                </button>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
              {/* 1. Target Assignment Selector (4 cols) */}
              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>1. เลือกชิ้นงาน / ภาระงาน:</span>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    เต็ม {activeQuickFillItem.max_score} คะแนน
                  </span>
                </label>
                <select
                  value={activeQuickFillItem.id}
                  onChange={(e) => {
                    setQuickFillItemId(e.target.value);
                    setSelectedItemId(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                >
                  {currentSubjectItems.map((item, idx) => (
                    <option key={item.id} value={item.id}>
                      {idx + 1}. {item.name} (เต็ม {item.max_score})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Target Score Input & Presets (5 cols) */}
              <div className="md:col-span-5 space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>2. ระบุคะแนนที่ต้องการใส่:</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {quickFillStatus !== 'normal'
                      ? quickFillStatus === 'absent'
                        ? 'สถานะ: ขาดสอบ (ร)'
                        : 'สถานะ: ไม่ส่งงาน (มส)'
                      : quickFillScore === ''
                      ? 'คะแนน: ล้าง/เว้นว่าง'
                      : `คะแนน: ${quickFillScore}`}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={activeQuickFillItem.max_score}
                      disabled={quickFillStatus !== 'normal'}
                      value={quickFillStatus !== 'normal' ? '' : quickFillScore}
                      onChange={(e) => {
                        setQuickFillStatus('normal');
                        setQuickFillScore(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyQuickFill();
                        }
                      }}
                      placeholder={
                        quickFillStatus === 'absent'
                          ? 'ร (ขาดสอบ)'
                          : quickFillStatus === 'missing'
                          ? 'มส (ไม่ส่งงาน)'
                          : 'ใส่คะแนน เช่น 8.5'
                      }
                      className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs text-center"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                      / {activeQuickFillItem.max_score}
                    </span>
                  </div>

                  {/* Quick status dropdown */}
                  <select
                    value={quickFillStatus}
                    onChange={(e) => setQuickFillStatus(e.target.value as ScoreStatus)}
                    className="px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-700 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <option value="normal">คะแนนปกติ</option>
                    <option value="absent">ติด ร (ขาดสอบ)</option>
                    <option value="missing">ติด มส (ไม่ส่ง)</option>
                  </select>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold mr-0.5">ลัด:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('normal');
                      setQuickFillScore(activeQuickFillItem.max_score.toString());
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                  >
                    เต็ม ({activeQuickFillItem.max_score})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('normal');
                      setQuickFillScore(
                        (Math.round(activeQuickFillItem.max_score * 0.8 * 10) / 10).toString()
                      );
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md border border-indigo-300 transition-colors cursor-pointer"
                  >
                    80% ({Math.round(activeQuickFillItem.max_score * 0.8 * 10) / 10})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('normal');
                      setQuickFillScore(
                        (Math.round(activeQuickFillItem.max_score * 0.5 * 10) / 10).toString()
                      );
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md border border-amber-300 transition-colors cursor-pointer"
                  >
                    50% ({Math.round(activeQuickFillItem.max_score * 0.5 * 10) / 10})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('normal');
                      setQuickFillScore('0');
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors cursor-pointer"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('normal');
                      setQuickFillScore('');
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md border border-slate-300 transition-colors cursor-pointer"
                  >
                    ล้าง/เว้นว่าง
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('absent');
                      setQuickFillScore('');
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md border border-amber-300 transition-colors cursor-pointer"
                  >
                    ร
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFillStatus('missing');
                      setQuickFillScore('');
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md border border-rose-300 transition-colors cursor-pointer"
                  >
                    มส
                  </button>
                </div>
              </div>

              {/* 3. Execute Button (3 cols) */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => handleApplyQuickFill()}
                  disabled={targetStudents.length === 0}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>บันทึกคะแนนด่วน ({targetStudents.length} คน)</span>
                </button>
              </div>
            </div>

            {/* 4. Target Students Filter Bar */}
            <div className="pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700 mr-1">กลุ่มเป้าหมาย:</span>
                <button
                  type="button"
                  onClick={() => setQuickFillFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    quickFillFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ทุกคนในห้อง ({filteredStudents.length} คน)
                </button>

                <button
                  type="button"
                  onClick={() => setQuickFillFilter('selected')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    quickFillFilter === 'selected'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  เฉพาะคนที่ติ๊กเลือก ({selectedStudentIds.size} คน)
                </button>

                <button
                  type="button"
                  onClick={() => setQuickFillFilter('empty_only')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    quickFillFilter === 'empty_only'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  เฉพาะคนที่ยังไม่มีคะแนน ({emptyScoresCount} คน)
                </button>

                <button
                  type="button"
                  onClick={() => setQuickFillFilter('failing_only')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    quickFillFilter === 'failing_only'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  เฉพาะคนได้ &lt; 50% ({failingScoresCount} คน)
                </button>
              </div>

              {/* Selection Helpers */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">เลือกด่วน:</span>
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  เลือกทุกคน
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllStudents}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  ไม่เลือกเลย
                </button>
                <button
                  type="button"
                  onClick={handleSelectOddStudents}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  เลขคี่
                </button>
                <button
                  type="button"
                  onClick={handleSelectEvenStudents}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  เลขคู่
                </button>
                <button
                  type="button"
                  onClick={handleInvertStudentSelection}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  สลับการเลือก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grading Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table info banner */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">รายชื่อนักเรียน:</span>
            <span className="text-slate-500">
              พบ {filteredStudents.length} คน (จากทั้งหมด {students.length} คน)
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              แถบสีแดง = คะแนนเกิน 50
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">ร</span>
              ขาดสอบ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">มส</span>
              ไม่ส่งงาน
            </span>
          </div>
        </div>

        {/* Single Item Mode Table */}
        {viewMode === 'single' ? (
          activeItem ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    {isQuickFillMode && (
                      <th className="py-3 px-3 text-center w-12 bg-amber-100/80 border-r border-amber-300">
                        <input
                          type="checkbox"
                          checked={
                            filteredStudents.length > 0 &&
                            filteredStudents.every((s) => selectedStudentIds.has(s.id))
                          }
                          ref={(el) => {
                            if (el) {
                              const all =
                                filteredStudents.length > 0 &&
                                filteredStudents.every((s) => selectedStudentIds.has(s.id));
                              const some = selectedStudentIds.size > 0 && !all;
                              el.indeterminate = some;
                            }
                          }}
                          onChange={() => {
                            const all =
                              filteredStudents.length > 0 &&
                              filteredStudents.every((s) => selectedStudentIds.has(s.id));
                            if (all) {
                              handleDeselectAllStudents();
                            } else {
                              handleSelectAllStudents();
                            }
                          }}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                          title="เลือกนักเรียนทุกคนสำหรับ Quick Fill"
                        />
                      </th>
                    )}
                    <th className="py-3 px-3 sm:px-4 text-center w-16">เลขที่</th>
                    <th className="py-3 px-3 sm:px-4 w-28">รหัส</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th
                      className={`py-3 px-4 text-center w-48 sm:w-56 transition-colors ${
                        isQuickFillMode && activeQuickFillItem?.id === activeItem.id
                          ? 'bg-amber-100 text-amber-950 border-x-2 border-amber-400'
                          : 'bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>คะแนนที่ได้ (เต็ม {activeItem.max_score})</span>
                        {isQuickFillMode && activeQuickFillItem?.id === activeItem.id && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded shadow-2xs">
                            ⚡ QUICK FILL
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 sm:px-4 text-center w-36">สถานะพิเศษ</th>
                    <th className="py-3 px-4 text-center w-40">
                      คะแนนรวมเทอมนี้ (เต็ม 50)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.map((stu, studentIdx) => {
                    const key = `${stu.id}_${activeItem.id}`;
                    const scoreData = draftScores[key] || { score: null, status: 'normal' };
                    const termCalc = calculateStudentDraftTermTotal(stu.id);
                    const isSelected = selectedStudentIds.has(stu.id);

                    return (
                      <tr
                        key={stu.id}
                        className={`transition-colors ${
                          isQuickFillMode && isSelected
                            ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                            : termCalc.isExceeded
                            ? 'bg-rose-50/60 hover:bg-rose-50/80'
                            : 'hover:bg-indigo-50/30'
                        }`}
                      >
                        {isQuickFillMode && (
                          <td className="py-3 px-3 text-center w-12 bg-amber-50/20 border-r border-amber-100">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudentSelection(stu.id)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* เลขที่ */}
                        <td className="py-3 px-3 sm:px-4 text-center font-bold text-slate-600">
                          {stu.student_no}
                        </td>

                        {/* รหัสนักเรียน */}
                        <td className="py-3 px-3 sm:px-4 text-xs font-mono text-slate-500">
                          {stu.student_code}
                        </td>

                        {/* ชื่อ-สกุล */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{stu.name}</div>
                          <div className="text-[11px] text-slate-400">ห้อง {stu.classroom}</div>
                        </td>

                        {/* ช่องกรอกคะแนน (Focus Target) */}
                        <td
                          className={`py-3 px-4 text-center transition-colors ${
                            isQuickFillMode && activeQuickFillItem?.id === activeItem.id
                              ? 'bg-amber-50/40 border-x border-amber-300'
                              : 'bg-indigo-50/30'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <input
                              ref={(el) => {
                                inputRefs.current[`${studentIdx}_0`] = el;
                              }}
                              type="number"
                              step="0.5"
                              min="0"
                              max={activeItem.max_score}
                              value={scoreData.score !== null ? scoreData.score : ''}
                              onChange={(e) =>
                                handleScoreChange(
                                  stu.id,
                                  activeItem.id,
                                  e.target.value,
                                  activeItem.max_score
                                )
                              }
                              onKeyDown={(e) => handleKeyDown(e, studentIdx, 0)}
                              onBlur={() => {
                                if (isDirtyRef.current) {
                                  flushAndSaveScores();
                                }
                              }}
                              disabled={scoreData.status !== 'normal'}
                              placeholder="-"
                              className={`w-24 text-center py-2 px-3 text-lg font-bold rounded-xl border transition-all ${
                                scoreData.status !== 'normal'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : typeof scoreData.score === 'number' && scoreData.score > activeItem.max_score
                                  ? 'bg-rose-100 text-rose-700 border-rose-400 ring-2 ring-rose-300'
                                  : isQuickFillMode && activeQuickFillItem?.id === activeItem.id
                                  ? 'bg-white text-amber-950 border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-400 shadow-inner'
                                  : 'bg-white text-indigo-900 border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-400 shadow-inner'
                              }`}
                            />
                            <span className="text-xs text-slate-400 font-medium">
                              / {activeItem.max_score}
                            </span>
                          </div>

                          {typeof scoreData.score === 'number' && scoreData.score > activeItem.max_score && (
                            <div className="text-[11px] text-rose-600 font-bold mt-1">
                              ⚠️ เกินคะแนนเต็ม!
                            </div>
                          )}

                          {isQuickFillMode && activeQuickFillItem?.id === activeItem.id && (
                            <button
                              type="button"
                              onClick={() => handleApplyQuickFill(stu.id)}
                              className="text-[10px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded border border-amber-300 transition-colors shadow-2xs mt-1.5 cursor-pointer inline-flex items-center gap-1"
                              title={`ใส่ค่านี้ให้ ${stu.name}`}
                            >
                              <Zap className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                              <span>
                                ใส่{' '}
                                {quickFillStatus !== 'normal'
                                  ? quickFillStatus === 'absent'
                                    ? 'ร'
                                    : 'มส'
                                  : quickFillScore === ''
                                  ? 'ว่าง'
                                  : quickFillScore}
                              </span>
                            </button>
                          )}
                        </td>

                        {/* ปุ่มสถานะพิเศษ: ขาดสอบ (ร), ไม่ส่งงาน (มส) */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(stu.id, activeItem.id, 'absent')}
                              title="ขาดสอบ (ร)"
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                scoreData.status === 'absent'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                              }`}
                            >
                              ร (ขาดสอบ)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(stu.id, activeItem.id, 'missing')}
                              title="ไม่ส่งงาน (มส)"
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                scoreData.status === 'missing'
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                              }`}
                            >
                              มส
                            </button>
                          </div>
                        </td>

                        {/* คะแนนสะสมรวมเทอมนี้ (Real-time gauge) */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span
                                className={`text-base ${
                                  termCalc.isExceeded
                                    ? 'text-rose-600'
                                    : termCalc.total >= 40
                                    ? 'text-emerald-700'
                                    : 'text-slate-800'
                                }`}
                              >
                                {termCalc.total}
                              </span>
                              <span className="text-xs text-slate-400">/ 50</span>
                            </div>

                            {/* Status tags / Warning */}
                            {termCalc.isExceeded ? (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                คะแนนเกิน 50!
                              </span>
                            ) : (
                              <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    termCalc.total >= 40
                                      ? 'bg-emerald-500'
                                      : termCalc.total >= 25
                                      ? 'bg-indigo-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (termCalc.total / 50) * 100)}%` }}
                                ></div>
                              </div>
                            )}

                            {(termCalc.hasAbsent || termCalc.hasMissing) && (
                              <div className="flex gap-1 mt-1">
                                {termCalc.hasAbsent && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded font-bold">
                                    ติด ร
                                  </span>
                                )}
                                {termCalc.hasMissing && (
                                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 rounded font-bold">
                                    ติด มส
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              ไม่มีรายการคะแนนในวิชาและเทอมนี้ กรุณาไปที่เมนู "วิชาและสัดส่วนคะแนน" เพื่อสร้างรายการคะแนน
            </div>
          )
        ) : (
          /* All Items Matrix Mode (Full Spreadsheet View) */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
                  {isQuickFillMode && (
                    <th className="py-2.5 px-2 text-center w-10 sticky left-0 bg-amber-100 z-20 border-r border-amber-300">
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents.every((s) => selectedStudentIds.has(s.id))
                        }
                        ref={(el) => {
                          if (el) {
                            const all =
                              filteredStudents.length > 0 &&
                              filteredStudents.every((s) => selectedStudentIds.has(s.id));
                            const some = selectedStudentIds.size > 0 && !all;
                            el.indeterminate = some;
                          }
                        }}
                        onChange={() => {
                          const all =
                            filteredStudents.length > 0 &&
                            filteredStudents.every((s) => selectedStudentIds.has(s.id));
                          if (all) {
                            handleDeselectAllStudents();
                          } else {
                            handleSelectAllStudents();
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                        title="เลือกนักเรียนทุกคนสำหรับ Quick Fill"
                      />
                    </th>
                  )}
                  <th
                    className={`py-2.5 px-2 text-center w-12 sticky z-10 ${
                      isQuickFillMode ? 'left-10 bg-amber-50/70 border-r border-amber-200' : 'left-0 bg-slate-100'
                    }`}
                  >
                    เลขที่
                  </th>
                  <th
                    className={`py-2.5 px-3 min-w-[160px] sticky z-10 border-r ${
                      isQuickFillMode ? 'left-22 bg-amber-50/70 border-amber-200' : 'left-12 bg-slate-100 border-slate-200'
                    }`}
                  >
                    ชื่อ - นามสกุล
                  </th>
                  {currentSubjectItems.map((item, itemIdx) => {
                    const isTargetItem = isQuickFillMode && activeQuickFillItem?.id === item.id;
                    return (
                      <th
                        key={item.id}
                        onClick={() => {
                          if (isQuickFillMode) {
                            setQuickFillItemId(item.id);
                            setSelectedItemId(item.id);
                          }
                        }}
                        className={`py-2.5 px-2 text-center min-w-[110px] border-r border-slate-200 transition-colors select-none ${
                          isTargetItem
                            ? 'bg-amber-100 text-amber-950 border-x-2 border-amber-400 ring-2 ring-amber-300 ring-inset cursor-pointer'
                            : isQuickFillMode
                            ? 'bg-slate-50 hover:bg-amber-50/80 text-slate-800 cursor-pointer'
                            : 'bg-indigo-50/40 text-slate-800'
                        }`}
                        title={
                          isQuickFillMode
                            ? isTargetItem
                              ? `เป้าหมาย Quick Fill ปัจจุบัน (เต็ม ${item.max_score})`
                              : `คลิกเพื่อเลือก "${item.name}" ในโหมด Quick Fill`
                            : item.name
                        }
                      >
                        <div className="font-bold truncate max-w-[120px] mx-auto flex items-center justify-center gap-1">
                          <span>{item.name}</span>
                          {isTargetItem && (
                            <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1 py-0.2 rounded shadow-2xs">
                              ⚡ QUICK
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] font-medium ${
                            isTargetItem ? 'text-amber-900 font-bold' : 'text-indigo-600'
                          }`}
                        >
                          (เต็ม {item.max_score})
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-3 text-center min-w-[120px] bg-emerald-50 text-emerald-900 font-bold">
                    รวมเทอมนี้ (50)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stu, studentIdx) => {
                  const termCalc = calculateStudentDraftTermTotal(stu.id);
                  const isSelected = selectedStudentIds.has(stu.id);

                  return (
                    <tr
                      key={stu.id}
                      className={`transition-colors ${
                        isQuickFillMode && isSelected
                          ? 'bg-amber-50/60 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                          : termCalc.isExceeded
                          ? 'bg-rose-50/50 hover:bg-rose-50/70'
                          : 'hover:bg-indigo-50/20'
                      }`}
                    >
                      {isQuickFillMode && (
                        <td
                          className={`py-2 px-2 text-center w-10 sticky left-0 z-20 border-r border-amber-200 transition-colors ${
                            isSelected ? 'bg-amber-100/90' : 'bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudentSelection(stu.id)}
                            className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                          />
                        </td>
                      )}
                      <td
                        className={`py-2 px-2 text-center font-bold text-slate-600 sticky transition-colors ${
                          isQuickFillMode
                            ? `left-10 border-r border-amber-100 ${isSelected ? 'bg-amber-50' : 'bg-white'}`
                            : 'left-0 bg-white'
                        }`}
                      >
                        {stu.student_no}
                      </td>
                      <td
                        className={`py-2 px-3 sticky border-r transition-colors ${
                          isQuickFillMode
                            ? `left-22 border-amber-200 ${isSelected ? 'bg-amber-50' : 'bg-white'}`
                            : 'left-12 bg-white border-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-slate-800 text-sm truncate max-w-[180px]">
                          {stu.name}
                        </div>
                      </td>

                      {currentSubjectItems.map((item, itemIdx) => {
                        const key = `${stu.id}_${item.id}`;
                        const scoreData = draftScores[key] || { score: null, status: 'normal' };
                        const isTargetItem = isQuickFillMode && activeQuickFillItem?.id === item.id;

                        return (
                          <td
                            key={item.id}
                            className={`py-2 px-2 text-center border-r border-slate-100 transition-colors ${
                              isTargetItem ? 'bg-amber-50/70 border-x-2 border-amber-300' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <input
                                ref={(el) => {
                                  inputRefs.current[`${studentIdx}_${itemIdx}`] = el;
                                }}
                                type="number"
                                step="0.5"
                                min="0"
                                max={item.max_score}
                                value={scoreData.score !== null ? scoreData.score : ''}
                                onChange={(e) =>
                                  handleScoreChange(stu.id, item.id, e.target.value, item.max_score)
                                }
                                onKeyDown={(e) => handleKeyDown(e, studentIdx, itemIdx)}
                                onBlur={() => {
                                  if (isDirtyRef.current) {
                                    flushAndSaveScores();
                                  }
                                }}
                                disabled={scoreData.status !== 'normal'}
                                placeholder="-"
                                className={`w-16 text-center py-1 px-1 text-sm font-bold rounded-lg border transition-all ${
                                  scoreData.status !== 'normal'
                                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                                    : typeof scoreData.score === 'number' && scoreData.score > item.max_score
                                    ? 'bg-rose-100 text-rose-700 border-rose-400'
                                    : isTargetItem
                                    ? 'bg-white text-amber-950 border-amber-400 focus:ring-2 focus:ring-amber-400'
                                    : 'bg-white text-indigo-950 border-slate-300 focus:ring-1 focus:ring-indigo-500'
                                }`}
                              />

                              {/* Tiny status indicator/toggle or Quick Fill single apply */}
                              <div className="flex items-center gap-0.5">
                                {isTargetItem ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyQuickFill(stu.id)}
                                    className="text-[9px] px-1.5 py-0.2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded border border-amber-300 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-0.5"
                                    title={`ใส่ค่านี้ให้ ${stu.name}`}
                                  >
                                    <Zap className="w-2 h-2 fill-amber-700 text-amber-700" />
                                    <span>ใส่</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(stu.id, item.id, 'absent')}
                                      title="ขาดสอบ (ร)"
                                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                        scoreData.status === 'absent'
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-slate-100 text-slate-500 hover:bg-amber-100'
                                      }`}
                                    >
                                      ร
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(stu.id, item.id, 'missing')}
                                      title="ไม่ส่งงาน (มส)"
                                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                        scoreData.status === 'missing'
                                          ? 'bg-rose-500 text-white'
                                          : 'bg-slate-100 text-slate-500 hover:bg-rose-100'
                                      }`}
                                    >
                                      มส
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Term total column */}
                      <td className="py-2 px-3 text-center bg-slate-50 font-bold">
                        <div
                          className={`text-sm ${
                            termCalc.isExceeded
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-800'
                          }`}
                        >
                          {termCalc.total} / 50
                        </div>
                        {termCalc.isExceeded && (
                          <div className="text-[10px] text-rose-600">เกิน 50!</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Quick Fill Dock for Large Classes (Sticky Bottom Bar) */}
      {isQuickFillMode && activeQuickFillItem && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-slate-950/95 backdrop-blur-md text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-xs text-amber-300">Quick Fill:</span>
                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[180px] sm:max-w-[240px]">
                  {activeQuickFillItem.name}
                </span>
                <span className="text-[10px] sm:text-[11px] text-amber-200/80 font-medium">
                  (เต็ม {activeQuickFillItem.max_score})
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
                <span>กลุ่ม:</span>
                <span className="font-bold text-amber-300">
                  {quickFillFilter === 'all'
                    ? 'ทุกคน'
                    : quickFillFilter === 'selected'
                    ? `ที่ติ๊ก (${selectedStudentIds.size})`
                    : quickFillFilter === 'empty_only'
                    ? `ยังไม่มี (${emptyScoresCount})`
                    : `ตก <50% (${failingScoresCount})`}
                </span>
                <span>• ค่าที่จะใส่:</span>
                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                  {quickFillStatus === 'absent'
                    ? 'ร (ขาด)'
                    : quickFillStatus === 'missing'
                    ? 'มส (ไม่ส่ง)'
                    : quickFillScore === ''
                    ? 'เว้นว่าง'
                    : `${quickFillScore} คะแนน`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleApplyQuickFill()}
              disabled={targetStudents.length === 0}
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>บันทึกด่วน ({targetStudents.length} คน)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickFillMode(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="ปิดโหมดใส่คะแนนด่วน (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Quick Action / Tip Bar */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>
            เคล็ดลับ: ใช้ปุ่ม <strong>Tab</strong> เพื่อเลื่อนช่อง หรือปุ่ม <strong>Enter</strong> เพื่อลงมายังนักเรียนคนถัดไปได้ทันที
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setNotifyFeedback(null);
              setShowNotifyModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>ส่งแจ้งเตือนผลการเรียนทาง LINE</span>
          </button>
          <span className="font-semibold text-indigo-700 hidden md:inline">
            ระบบคำนวณคะแนนรวมเทอม (50) และตัดเกรดให้อัตโนมัติ
          </span>
        </div>
      </div>

      {/* LINE Notify Dialog Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-4 my-8 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                    <span>ส่งแจ้งเตือนผ่าน LINE Notify</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      ห้อง {classroomName || 'ป.5/1'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    วิชา{activeSubject.name} ({activeSubject.code}) • {currentTerm.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Mode Tabs */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                เลือกรูปแบบข้อความแจ้งเตือน:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyMode('score_saved')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    notifyMode === 'score_saved'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs">📝 บันทึกคะแนนเสร็จ</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    แจ้งว่าครูลงคะแนนครบแล้ว
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifyMode('midterm_final')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    notifyMode === 'midterm_final'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs">🎯 ประกาศผลคะแนนสอบ</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    รายงานสถิติ สูงสุด-เฉลี่ย
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifyMode('at_risk')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    notifyMode === 'at_risk'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 text-amber-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs">⚠️ ติดตามงาน/ติด ร-มส</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    เตือนนักเรียนที่ต้องส่งงาน
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Stats Pill */}
            {notifyStats && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">บันทึกแล้ว</div>
                  <div className="font-bold text-slate-800">
                    {notifyStats.recordedCount} / {notifyStats.totalStudents} คน
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">คะแนนเฉลี่ย</div>
                  <div className="font-bold text-indigo-700">
                    {notifyStats.average.toFixed(1)} / 50
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ต้องติดตาม</div>
                  <div className="font-bold text-amber-600">
                    {notifyStats.atRisk.length} คน
                  </div>
                </div>
              </div>
            )}

            {/* Live Message Preview Screen */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>ตัวอย่างข้อความที่จะส่งไปยัง LINE:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ความยาว {modalMessage.length} ตัวอักษร
                </span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-3.5 sm:p-4 rounded-2xl font-sans text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-800 shadow-inner">
                {modalMessage}
              </div>
            </div>

            {/* Feedback notification banner */}
            {notifyFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                  notifyFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {notifyFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {notifyFeedback.success ? 'ส่งข้อความสำเร็จ!' : 'ไม่สามารถส่งข้อความได้'}
                  </div>
                  <div className="text-[11px] mt-0.5">{notifyFeedback.message}</div>
                </div>
              </div>
            )}

            {/* Notice about LINE Notify and Direct Share */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>LINE Notify ปิดบริการแล้ว แนะนำกดปุ่ม <strong>"แชร์เข้า LINE ทันที"</strong> ส่งเข้ากลุ่มผู้ปกครองได้ฟรีโดยไม่ต้องใช้ Token</span>
              </div>
              {onNavigateToNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifyModal(false);
                    onNavigateToNotifications();
                  }}
                  className="underline text-amber-800 font-bold whitespace-nowrap cursor-pointer hover:text-amber-950"
                >
                  ดูช่องทางอื่น
                </button>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyModalText}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  {copiedNotifyText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNotifyText ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
                </button>

                <a
                  href={lineNotifyService.getLineShareUrl(modalMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-[#06C755] hover:bg-[#05963F] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs w-full sm:w-auto"
                  title="เปิดแอป LINE แล้วเลือกกลุ่มผู้ปกครองเพื่อส่งข้อความทันที"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>แชร์เข้า LINE ทันที (ไม่ต้องใช้ Token)</span>
                </a>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onNavigateToNotifications && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifyModal(false);
                      onNavigateToNotifications();
                    }}
                    className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>ตั้งค่าช่องทาง</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={isSendingNotify}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                  title="ส่งผ่านช่องทางที่ตั้งค่าไว้ (Telegram, Discord, LINE OA, หรือ Webhook)"
                >
                  {isSendingNotify ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSendingNotify ? 'กำลังส่ง...' : 'ส่งแจ้งเตือนอัตโนมัติ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score CSV Import/Export Modal */}
      <ScoreCsvImportExportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        subjects={subjects}
        terms={terms}
        students={students}
        allScoreItems={allScoreItems}
        allScores={allScores}
        currentSubject={activeSubject}
        currentTerm={currentTerm}
        classroomName={classroomName}
        defaultTab={csvModalTab}
        onScoresImported={() => {
          refreshDraftScores();
          onScoresUpdated();
          triggerSavedToast();
        }}
      />

      {/* Custom Score Weighting Modal */}
      <ScoreWeightingModal
        isOpen={showWeightingModal}
        onClose={() => setShowWeightingModal(false)}
        subjects={subjects}
        currentSubjectId={selectedSubjectId}
        terms={terms}
        currentTermId={currentTerm.id}
        onWeightingApplied={() => {
          refreshDraftScores();
          onScoresUpdated();
          triggerSavedToast();
        }}
      />

      {/* Quick Score Text Entry Modal (Fast CSV-style Text Area Batch Update) */}
      {showQuickTextEntryModal && activeSubject && (
        <QuickScoreTextEntryModal
          isOpen={showQuickTextEntryModal}
          onClose={() => setShowQuickTextEntryModal(false)}
          subject={activeSubject}
          term={currentTerm}
          students={students}
          scoreItems={currentSubjectItems}
          currentScores={allScores}
          defaultItemId={selectedItemId}
          classroomName={classroomName}
          onScoresSaved={() => {
            refreshDraftScores();
            onScoresUpdated();
            triggerSavedToast();
          }}
          onAutoSaveStatusChange={onAutoSaveStatusChange}
        />
      )}
    </div>
  );
};
