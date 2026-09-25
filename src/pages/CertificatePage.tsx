import React, { useState, useMemo, useRef } from 'react';
import {
  Student,
  Subject,
  ScoreItem,
  Score,
  Term,
  Classroom,
  User,
  Certificate,
  CertificateType,
  CertificateSettings,
} from '../types';
import { getStudentFullReport, getClassroomRankings } from '../utils/gradeCalculator';
import { storage } from '../services/storage';
import {
  Award,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Search,
  Filter,
  Download,
  School,
  UserCheck,
  Star,
  Settings,
  X,
  ChevronRight,
  BookOpen,
  Trophy,
  Heart,
  Compass,
  FileCheck,
} from 'lucide-react';

interface CertificatePageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  activeClassroom: Classroom;
  user: User | null;
  onNavigateToStudentPortal?: (student: Student) => void;
}

export const CertificatePage: React.FC<CertificatePageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  activeClassroom,
  user,
}) => {
  // State for certificates & settings
  const [certificates, setCertificates] = useState<Certificate[]>(() =>
    storage.getCertificates(activeClassroom.id)
  );
  const [settings, setSettings] = useState<CertificateSettings>(() =>
    storage.getCertificateSettings()
  );

  const [activeTab, setActiveTab] = useState<'ranking' | 'issued' | 'auto_detect' | 'manual_issue' | 'settings'>('ranking');
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<Certificate | null>(
    certificates[0] || null
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isBatchPrintMode, setIsBatchPrintMode] = useState(false);

  // Compute classroom rankings
  const rankedStudents = useMemo(() => {
    return getClassroomRankings(students, subjects, allScoreItems, allScores, terms);
  }, [students, subjects, allScoreItems, allScores, terms]);

  // Ranking & Honor statistics
  const rankingStats = useMemo(() => {
    const total = rankedStudents.length;
    if (total === 0) return { avgGpa: 0, highHonorCount: 0, honorCount: 0, goodCount: 0, topStudent: null };
    const avgGpa = Math.round((rankedStudents.reduce((sum, s) => sum + s.gpa, 0) / total) * 100) / 100;
    const highHonorCount = rankedStudents.filter((s) => s.gpa >= 3.8).length;
    const honorCount = rankedStudents.filter((s) => s.gpa >= 3.5 && s.gpa < 3.8).length;
    const goodCount = rankedStudents.filter((s) => s.gpa >= 3.0 && s.gpa < 3.5).length;
    const topStudent = rankedStudents[0] || null;
    return { avgGpa, highHonorCount, honorCount, goodCount, topStudent };
  }, [rankedStudents]);

  // Manual Issue Form State
  const [formStudentId, setFormStudentId] = useState(students[0]?.id || '');
  const [formType, setFormType] = useState<CertificateType>('academic_excellence');
  const [formTitle, setFormTitle] = useState('เกียรติบัตรผลการเรียนดีเยี่ยมยอด');
  const [formSubtitle, setFormSubtitle] = useState('ได้รับผลการเรียนเฉลี่ยสะสมระดับดีเด่น');
  const [formSubjectName, setFormSubjectName] = useState(subjects[0]?.name || '');
  const [formTheme, setFormTheme] = useState<'gold' | 'blue' | 'emerald' | 'crimson'>('gold');
  const [formNotes, setFormNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Reload certificates from storage
  const reloadCertificates = () => {
    const list = storage.getCertificates(activeClassroom.id);
    setCertificates(list);
    if (list.length > 0 && (!selectedCertForPreview || !list.some(c => c.id === selectedCertForPreview.id))) {
      setSelectedCertForPreview(list[0]);
    }
  };

  // 1. Calculate Auto-Eligible Candidates
  const autoCandidates = useMemo(() => {
    // Generate full reports for all students in current room
    const reports = students.map((stu) =>
      getStudentFullReport(stu, subjects, allScoreItems, allScores, terms)
    );

    // Sort by GPA descending
    const sortedByGpa = [...reports].sort((a, b) => b.gpa - a.gpa);

    const candidates: Array<{
      student: Student;
      type: CertificateType;
      title: string;
      subtitle: string;
      subject_name?: string;
      theme: 'gold' | 'blue' | 'emerald' | 'crimson';
      reason: string;
      gpa?: number;
    }> = [];

    // Criteria 1: Academic Excellence (GPA >= 3.50)
    sortedByGpa.forEach((r, idx) => {
      if (r.gpa >= 3.8) {
        candidates.push({
          student: r.student,
          type: 'academic_excellence',
          title: 'เกียรติบัตรผลการเรียนดีเยี่ยมยอด',
          subtitle: `ได้รับผลการเรียนเฉลี่ยสะสม ${r.gpa.toFixed(2)} (เกียรตินิยมอันดับ 1 อันดับที่ ${idx + 1} ของห้อง)`,
          theme: 'gold',
          reason: `เกรดเฉลี่ย ${r.gpa.toFixed(2)} (ดีเยี่ยมยอด)`,
          gpa: r.gpa,
        });
      } else if (r.gpa >= 3.5) {
        candidates.push({
          student: r.student,
          type: 'academic_excellence',
          title: 'เกียรติบัตรผลการเรียนดีเด่น',
          subtitle: `ได้รับผลการเรียนเฉลี่ยสะสม ${r.gpa.toFixed(2)} (เกียรตินิยมอันดับ 2)`,
          theme: 'gold',
          reason: `เกรดเฉลี่ย ${r.gpa.toFixed(2)} (ดีเด่น)`,
          gpa: r.gpa,
        });
      }
    });

    // Criteria 2: Top in Subject (Highest total score in each subject)
    subjects.forEach((subj) => {
      let highestScore = -1;
      let topStudent: Student | null = null;

      reports.forEach((r) => {
        const subjData = r.subjects.find((s) => s.subject.id === subj.id);
        if (subjData && subjData.total_score > highestScore && subjData.total_score >= 80) {
          highestScore = subjData.total_score;
          topStudent = r.student;
        }
      });

      if (topStudent && highestScore > 0) {
        candidates.push({
          student: topStudent,
          type: 'top_subject',
          title: 'เกียรติบัตรคะแนนยอดเยี่ยมประจำกลุ่มสาระ',
          subtitle: `ได้คะแนนรวมสูงสุด ${highestScore.toFixed(1)} คะแนน ในกลุ่มสาระการเรียนรู้${subj.name}`,
          subject_name: subj.name,
          theme: 'blue',
          reason: `คะแนนสูงสุดวิชา${subj.name} (${highestScore} คะแนน)`,
        });
      }
    });

    // Criteria 3: Outstanding Improvement (Term 2 score significantly higher than Term 1)
    reports.forEach((r) => {
      let term1Sum = 0;
      let term2Sum = 0;
      r.subjects.forEach((s) => {
        term1Sum += s.term1_score;
        term2Sum += s.term2_score;
      });
      const diff = term2Sum - term1Sum;
      if (diff >= 5 && term2Sum >= 35) {
        candidates.push({
          student: r.student,
          type: 'outstanding_improvement',
          title: 'เกียรติบัตรพัฒนาการเรียนรู้ยอดเยี่ยม',
          subtitle: `มีความมุ่งมั่นและมีพัฒนาการผลการเรียนสูงขึ้นอย่างต่อเนื่อง (+${diff.toFixed(1)} คะแนน)`,
          theme: 'emerald',
          reason: `คะแนนภาคเรียนที่ 2 พัฒนาขึ้น +${diff.toFixed(1)} คะแนน`,
        });
      }
    });

    // Criteria 4: Desirable Conduct / Spirit of Goodness
    // Select students with high effort and no missing work
    reports.slice(0, 5).forEach((r) => {
      const hasMissing = r.subjects.some((s) => s.status === 'มส' || s.status === 'ร');
      if (!hasMissing) {
        candidates.push({
          student: r.student,
          type: 'desirable_conduct',
          title: 'เกียรติบัตรคุณธรรม จริยธรรม และคุณลักษณะอันพึงประสงค์',
          subtitle: 'ประพฤติตนเป็นแบบอย่างที่ดี มีวินัย ใฝ่เรียนรู้ และมีจิตสาธารณะ',
          theme: 'emerald',
          reason: 'คุณลักษณะอันพึงประสงค์ดีเยี่ยม ไม่มีค้างส่งงาน',
        });
      }
    });

    return candidates;
  }, [students, subjects, allScoreItems, allScores]);

  // Handler to auto-generate all candidates
  const handleAutoGenerateAll = () => {
    if (autoCandidates.length === 0) {
      alert('ไม่พบนักเรียนที่เข้าเกณฑ์ในขณะนี้');
      return;
    }

    const existingKeys = new Set(
      certificates.map((c) => `${c.student_id}_${c.type}_${c.subject_name || ''}`)
    );

    const newToCreate: Array<Omit<Certificate, 'id'>> = [];
    autoCandidates.forEach((cand) => {
      const key = `${cand.student.id}_${cand.type}_${cand.subject_name || ''}`;
      if (!existingKeys.has(key)) {
        newToCreate.push({
          student_id: cand.student.id,
          student_name: cand.student.name,
          student_code: cand.student.student_code,
          classroom_id: activeClassroom.id,
          classroom_name: activeClassroom.name,
          type: cand.type,
          title: cand.title,
          subtitle: cand.subtitle,
          subject_name: cand.subject_name,
          academic_year: settings.academic_year || '2568',
          issue_date: settings.issue_date || '๒๕ มีนาคม ๒๕๖๘',
          school_name: settings.school_name || 'โรงเรียนอนุบาลพัฒนาการศึกษา',
          homeroom_teacher: settings.homeroom_teacher || activeClassroom.homeroom_teacher || 'ครูสมศรี จิตเมตตา',
          principal_name: settings.principal_name || 'นายประเสริฐ สุขสวัสดิ์',
          theme_color: cand.theme,
          notes: cand.reason,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (newToCreate.length === 0) {
      alert('ได้สร้างเกียรติบัตรสำหรับนักเรียนที่ผ่านเกณฑ์ครบถ้วนแล้ว');
      setActiveTab('issued');
      return;
    }

    storage.batchAddCertificates(newToCreate);
    reloadCertificates();
    setActiveTab('issued');
    alert(`สร้างเกียรติบัตรสำเร็จ ${newToCreate.length} ใบ! สามารถสั่งพิมพ์ได้ทันที`);
  };

  // Handler to add a single auto candidate
  const handleAddSingleCandidate = (cand: (typeof autoCandidates)[0]) => {
    storage.addCertificate({
      student_id: cand.student.id,
      student_name: cand.student.name,
      student_code: cand.student.student_code,
      classroom_id: activeClassroom.id,
      classroom_name: activeClassroom.name,
      type: cand.type,
      title: cand.title,
      subtitle: cand.subtitle,
      subject_name: cand.subject_name,
      academic_year: settings.academic_year || '2568',
      issue_date: settings.issue_date || '๒๕ มีนาคม ๒๕๖๘',
      school_name: settings.school_name || 'โรงเรียนอนุบาลพัฒนาการศึกษา',
      homeroom_teacher: settings.homeroom_teacher || activeClassroom.homeroom_teacher || 'ครูสมศรี จิตเมตตา',
      principal_name: settings.principal_name || 'นายประเสริฐ สุขสวัสดิ์',
      theme_color: cand.theme,
      notes: cand.reason,
      createdAt: new Date().toISOString(),
    });
    reloadCertificates();
    alert(`ออกเกียรติบัตรให้ ${cand.student.name} เรียบร้อยแล้ว`);
  };

  // Handler for manual issue
  const handleManualIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id === formStudentId);
    if (!stu) return;

    const newCert = storage.addCertificate({
      student_id: stu.id,
      student_name: stu.name,
      student_code: stu.student_code,
      classroom_id: activeClassroom.id,
      classroom_name: activeClassroom.name,
      type: formType,
      title: formTitle,
      subtitle: formSubtitle,
      subject_name: formType === 'top_subject' ? formSubjectName : undefined,
      academic_year: settings.academic_year || '2568',
      issue_date: settings.issue_date || '๒๕ มีนาคม ๒๕๖๘',
      school_name: settings.school_name || 'โรงเรียนอนุบาลพัฒนาการศึกษา',
      homeroom_teacher: settings.homeroom_teacher || activeClassroom.homeroom_teacher || 'ครูสมศรี จิตเมตตา',
      principal_name: settings.principal_name || 'นายประเสริฐ สุขสวัสดิ์',
      theme_color: formTheme,
      notes: formNotes,
      createdAt: new Date().toISOString(),
    });

    reloadCertificates();
    setSelectedCertForPreview(newCert);
    setFormSuccessMessage(`ออกเกียรติบัตรให้ ${stu.name} สำเร็จแล้ว!`);
    setTimeout(() => setFormSuccessMessage(''), 3500);
    setActiveTab('issued');
  };

  // Handler to delete certificate
  const handleDeleteCert = (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบเกียรติบัตรของ "${name}" หรือไม่?`)) {
      storage.deleteCertificate(id);
      reloadCertificates();
    }
  };

  // Filtered certificates list
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.student_code && c.student_code.includes(searchQuery));
      const matchFilter = filterType === 'all' || c.type === filterType;
      return matchSearch && matchFilter;
    });
  }, [certificates, searchQuery, filterType]);

  // Handler to save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveCertificateSettings(settings);
    alert('บันทึกการตั้งค่าเกียรติบัตรเรียบร้อยแล้ว');
  };

  // Quick preset loader for manual issue form
  const handleSelectPresetType = (type: CertificateType) => {
    setFormType(type);
    if (type === 'academic_excellence') {
      setFormTitle('เกียรติบัตรผลการเรียนดีเยี่ยมยอด');
      setFormSubtitle('ได้รับผลการเรียนเฉลี่ยสะสมระดับดีเด่น (เกียรตินิยมอันดับ 1)');
      setFormTheme('gold');
    } else if (type === 'top_subject') {
      setFormTitle('เกียรติบัตรคะแนนยอดเยี่ยมประจำกลุ่มสาระ');
      setFormSubtitle(`ได้คะแนนสูงสุดอันดับ 1 ในกลุ่มสาระการเรียนรู้${formSubjectName || 'ภาษาไทย'}`);
      setFormTheme('blue');
    } else if (type === 'outstanding_improvement') {
      setFormTitle('เกียรติบัตรพัฒนาการเรียนรู้ยอดเยี่ยม');
      setFormSubtitle('มีความตั้งใจ ขยันหมั่นเพียร และมีพัฒนาการผลการเรียนสูงขึ้นอย่างโดดเด่น');
      setFormTheme('emerald');
    } else if (type === 'desirable_conduct') {
      setFormTitle('เกียรติบัตรคุณธรรม จริยธรรม และคุณลักษณะอันพึงประสงค์');
      setFormSubtitle('ประพฤติตนเป็นแบบอย่างที่ดี มีวินัย ซื่อสัตย์สุจริต และมีจิตสาธารณะ');
      setFormTheme('emerald');
    } else if (type === 'student_activity') {
      setFormTitle('เกียรติบัตรกิจกรรมพัฒนาผู้เรียนดีเด่น');
      setFormSubtitle('ผ่านการประเมินกิจกรรมลูกเสือ-เนตรนารีและบำเพ็ญประโยชน์ต่อสังคม');
      setFormTheme('crimson');
    } else {
      setFormTitle('เกียรติบัตรเชิดชูเกียรติ');
      setFormSubtitle('เพื่อแสดงว่าเป็นผู้มีความรู้ความสามารถและสร้างชื่อเสียงให้แก่สถานศึกษา');
      setFormTheme('gold');
    }
  };

  // Print single certificate
  const handlePrintSingle = () => {
    setIsBatchPrintMode(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print batch all certificates
  const handlePrintBatch = () => {
    if (filteredCertificates.length === 0) {
      alert('ไม่มีรายการเกียรติบัตรให้พิมพ์');
      return;
    }
    setIsBatchPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrintMode(false);
    }, 200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header (Hidden on Print) */}
      <div className="no-print bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                ระบบ 4 • Student Recognition & Honors
              </span>
              <span className="text-xs text-slate-500 font-medium">ห้อง {classroom}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
              <Award className="w-7 h-7 text-amber-500" />
              ระบบออกเกียรติบัตรและใบประกาศนียบัตรนักเรียน
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              ระบบคัดกรองอัตโนมัติ ออกใบประกาศนียบัตรนักเรียนเรียนดีเยี่ยม คะแนนยอดเยี่ยมรายวิชา พัฒนาการดีเด่น และคุณลักษณะอันพึงประสงค์ พิมพ์ A4 แนวนอน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoGenerateAll}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-amber-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              คัดเลือก & สร้างอัตโนมัติ ({autoCandidates.length} รางวัล)
            </button>

            <button
              onClick={handlePrintBatch}
              disabled={filteredCertificates.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ทั้งหมด ({filteredCertificates.length} ใบ)
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ranking'
                ? 'bg-amber-500 text-white shadow-xs shadow-amber-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            ระบบจัดอันดับ (Ranking) & สถิติ
          </button>

          <button
            onClick={() => setActiveTab('auto_detect')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'auto_detect'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            นักเรียนที่ผ่านเกณฑ์รับรางวัล ({autoCandidates.length})
          </button>

          <button
            onClick={() => setActiveTab('issued')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'issued'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            เกียรติบัตรที่ออกแล้ว ({certificates.length})
          </button>

          <button
            onClick={() => setActiveTab('manual_issue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'manual_issue'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            ออกเกียรติบัตรรายบุคคล
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            ตั้งค่าชื่อโรงเรียน & ลายเซ็น
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {formSuccessMessage && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {formSuccessMessage}
        </div>
      )}

      {/* =========================================================================
          TAB 0: RANKING & LEADERBOARD (ระบบจัดอันดับและสถิติเกียรติบัตร)
          ========================================================================= */}
      {activeTab === 'ranking' && (
        <div className="no-print space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rank 2 (Silver) */}
            {rankedStudents[1] && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between order-2 md:order-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-100 rounded-bl-3xl flex items-start justify-end p-2 text-slate-400 font-black text-lg">
                  🥈
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    อันดับที่ 2 ของห้อง
                  </span>
                  <div className="font-bold text-slate-900 text-lg">
                    {rankedStudents[1].student.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    เลขที่ {rankedStudents[1].student.student_no} • รหัส {rankedStudents[1].student.student_code}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">เกรดเฉลี่ย (GPA)</span>
                    <span className="text-xl font-black text-slate-800">{rankedStudents[1].gpa.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">คะแนนดิบรวม</span>
                    <span className="text-sm font-bold text-slate-700">{rankedStudents[1].totalRawScore} คะแนน</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold - Highlighted) */}
            {rankedStudents[0] && (
              <div className="bg-gradient-to-b from-amber-50 to-white p-6 rounded-2xl border-2 border-amber-400 shadow-md flex flex-col justify-between order-1 md:order-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/20 rounded-bl-3xl flex items-start justify-end p-2.5 text-2xl">
                  🥇
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs flex items-center gap-1 w-fit">
                    <Trophy className="w-3.5 h-3.5 text-amber-900" />
                    อันดับที่ 1 (ยอดเยี่ยม)
                  </span>
                  <div className="font-extrabold text-slate-900 text-xl pt-1">
                    {rankedStudents[0].student.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    เลขที่ {rankedStudents[0].student.student_no} • รหัส {rankedStudents[0].student.student_code}
                  </div>
                  <div className="text-xs font-bold text-amber-800 bg-amber-100/60 px-2 py-1 rounded-lg w-fit">
                    🌟 {rankedStudents[0].honorTitle || 'เกียรตินิยมอันดับ 1'}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-amber-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-amber-700 font-semibold block">เกรดเฉลี่ย (GPA)</span>
                    <span className="text-2xl font-black text-amber-900">{rankedStudents[0].gpa.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">คะแนนดิบรวม</span>
                    <span className="text-base font-black text-slate-800">{rankedStudents[0].totalRawScore} / {rankedStudents[0].maxPossibleRawScore}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {rankedStudents[2] && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between order-3 md:order-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/40 rounded-bl-3xl flex items-start justify-end p-2 text-amber-700 font-black text-lg">
                  🥉
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    อันดับที่ 3 ของห้อง
                  </span>
                  <div className="font-bold text-slate-900 text-lg">
                    {rankedStudents[2].student.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    เลขที่ {rankedStudents[2].student.student_no} • รหัส {rankedStudents[2].student.student_code}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">เกรดเฉลี่ย (GPA)</span>
                    <span className="text-xl font-black text-slate-800">{rankedStudents[2].gpa.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">คะแนนดิบรวม</span>
                    <span className="text-sm font-bold text-slate-700">{rankedStudents[2].totalRawScore} คะแนน</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Generate Action Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md shadow-amber-200">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="w-5 h-5 text-amber-200" />
                <h3 className="font-black text-base sm:text-lg">ออกเกียรติบัตรเรียนดีอัตโนมัติ (Honor Roll Certificates)</h3>
              </div>
              <p className="text-xs text-amber-100 max-w-xl">
                ระบบคำนวณและพร้อมออกเกียรติบัตรสำหรับนักเรียนที่ได้เกรดเฉลี่ย GPA &ge; 3.50 ({autoCandidates.length} รายการ) สามารถคลิกเพื่อสร้างและสั่งพิมพ์ PDF ได้ทันที
              </p>
            </div>
            <button
              onClick={handleAutoGenerateAll}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-amber-900 rounded-xl text-sm font-black shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0"
            >
              <Award className="w-4 h-4 text-amber-600" />
              <span>ออกเกียรติบัตรทุกคน ({autoCandidates.length} ใบ)</span>
            </button>
          </div>

          {/* Full Classroom Leaderboard Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  ตารางจัดอันดับผลการเรียนทั้งห้อง (Classroom Ranking Table)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เรียงลำดับตามเกรดเฉลี่ย (GPA) และคะแนนรวมทุกรายวิชา • ห้อง {classroom}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                รวมทั้งหมด <strong>{rankedStudents.length}</strong> คน
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-16">อันดับ</th>
                    <th className="py-3 px-3 text-center w-16">เลขที่</th>
                    <th className="py-3 px-3 w-28">รหัสประจำตัว</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-3 text-center w-28">คะแนนรวมดิบ</th>
                    <th className="py-3 px-3 text-center w-28">หน่วยกิต</th>
                    <th className="py-3 px-3 text-center w-28 font-black text-indigo-900">เกรดเฉลี่ย (GPA)</th>
                    <th className="py-3 px-3 text-center w-40">เกียรตินิยม / สถานะ</th>
                    <th className="py-3 px-3 text-center w-28">เกียรติบัตร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedStudents.map((item) => {
                    const isIssued = certificates.some((c) => c.student_id === item.student.id);

                    return (
                      <tr
                        key={item.student.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          item.rank === 1
                            ? 'bg-amber-50/30'
                            : item.rank === 2
                            ? 'bg-slate-50/50'
                            : item.rank === 3
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-black text-slate-800">
                          {item.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs">
                              2
                            </span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold">{item.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600">
                          {item.student.student_no}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-500">
                          {item.student.student_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.student.name}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {item.totalRawScore} <span className="text-[10px] text-slate-400 font-normal">/ {item.maxPossibleRawScore}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.total_credits}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-indigo-900 text-base">
                          {item.gpa.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center text-xs">
                          {item.honorTitle ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold ${
                                item.gpa >= 3.8
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : item.gpa >= 3.5
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {item.honorTitle}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">ผ่านเกณฑ์</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isIssued ? (
                            <button
                              onClick={() => {
                                const found = certificates.find((c) => c.student_id === item.student.id);
                                if (found) setSelectedCertForPreview(found);
                                setActiveTab('issued');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                            >
                              ✓ ออกแล้ว
                            </button>
                          ) : item.gpa >= 3.5 ? (
                            <button
                              onClick={() => {
                                const cand = autoCandidates.find((c) => c.student.id === item.student.id);
                                if (cand) handleAddSingleCandidate(cand);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                            >
                              + ออกเกียรติบัตร
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: ISSUED CERTIFICATES & PREVIEW
          ========================================================================= */}
      {activeTab === 'issued' && (
        <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Certificate List & Controls */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  รายการเกียรติบัตรห้อง {classroom}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filteredCertificates.length} ใบ
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อนักเรียน / ชื่อรางวัล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'academic_excellence', label: 'เรียนดี' },
                  { id: 'top_subject', label: 'ยอดเยี่ยมวิชา' },
                  { id: 'outstanding_improvement', label: 'พัฒนาการ' },
                  { id: 'desirable_conduct', label: 'คุณธรรม' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      filterType === f.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Certificates */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredCertificates.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  ไม่พบเกียรติบัตรที่ตรงกับเงื่อนไข
                  <div className="mt-2">
                    <button
                      onClick={handleAutoGenerateAll}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      กดสร้างอัตโนมัติจากคะแนนสอบ
                    </button>
                  </div>
                </div>
              ) : (
                filteredCertificates.map((cert) => {
                  const isSelected = selectedCertForPreview?.id === cert.id;
                  const themeBadge =
                    cert.theme_color === 'gold'
                      ? 'bg-amber-100 text-amber-800'
                      : cert.theme_color === 'blue'
                      ? 'bg-blue-100 text-blue-800'
                      : cert.theme_color === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800';

                  return (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedCertForPreview(cert)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${themeBadge}`}>
                            {cert.type === 'academic_excellence'
                              ? 'เรียนดีเยี่ยม'
                              : cert.type === 'top_subject'
                              ? `ยอดเยี่ยม: ${cert.subject_name || ''}`
                              : cert.type === 'outstanding_improvement'
                              ? 'พัฒนาการดี'
                              : cert.type === 'desirable_conduct'
                              ? 'คุณธรรม'
                              : 'กิจกรรม'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {cert.student_code}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 text-sm truncate">
                          {cert.student_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{cert.title}</div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCertForPreview(cert);
                            handlePrintSingle();
                          }}
                          title="พิมพ์ใบนี้"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCert(cert.id, cert.student_name);
                          }}
                          title="ลบเกียรติบัตร"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Certificate Visual Preview */}
          <div className="xl:col-span-8 space-y-4">
            {selectedCertForPreview ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      ตัวอย่างเกียรติบัตร (Live Preview - มาตรฐาน A4 แนวนอน)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ผู้รับ: {selectedCertForPreview.student_name} • {selectedCertForPreview.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintSingle}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-200 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      สั่งพิมพ์เกียรติบัตรใบนี้
                    </button>
                  </div>
                </div>

                {/* Single Certificate Screen Render */}
                <div className="overflow-x-auto p-2 bg-slate-100/70 rounded-xl flex justify-center">
                  <div className="transform scale-95 sm:scale-100 origin-top shadow-lg">
                    <CertificateCard
                      certificate={selectedCertForPreview}
                      settings={settings}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <Award className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-700 text-base">ยังไม่ได้เลือกเกียรติบัตร</h4>
                <p className="text-xs text-slate-400 mt-1">
                  เลือกเกียรติบัตรจากรายการทางด้านซ้ายเพื่อดูตัวอย่างและสั่งพิมพ์
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUTO-DETECT CANDIDATES
          ========================================================================= */}
      {activeTab === 'auto_detect' && (
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Smart Detection
              </span>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                ผลการคัดกรองนักเรียนที่ผ่านเกณฑ์รับรางวัลอัตโนมัติ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบคำนวณจากคะแนนสอบจริง เกรดเฉลี่ย (GPA) และความก้าวหน้าทางการเรียนรู้ของห้อง {classroom}
              </p>
            </div>

            <button
              onClick={handleAutoGenerateAll}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-amber-200 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              อนุมัติและสร้างเกียรติบัตรทั้งหมด ({autoCandidates.length} ใบ)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoCandidates.map((cand, idx) => {
              const alreadyIssued = certificates.some(
                (c) =>
                  c.student_id === cand.student.id &&
                  c.type === cand.type &&
                  c.subject_name === cand.subject_name
              );

              return (
                <div
                  key={`${cand.student.id}-${cand.type}-${idx}`}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {cand.type === 'academic_excellence'
                          ? '🏆 เรียนดีเด่น'
                          : cand.type === 'top_subject'
                          ? `🥇 สูงสุด: ${cand.subject_name}`
                          : cand.type === 'outstanding_improvement'
                          ? '🌟 พัฒนาการดี'
                          : '🎖️ คุณธรรม'}
                      </span>
                      {alreadyIssued && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ออกแล้ว
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {cand.student.student_no}. {cand.student.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        เลขประจำตัว: {cand.student.student_code}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-indigo-900">{cand.title}</div>
                      <div className="text-[11px] text-slate-500">{cand.subtitle}</div>
                      <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 pt-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        เกณฑ์: {cand.reason}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <button
                      onClick={() => handleAddSingleCandidate(cand)}
                      disabled={alreadyIssued}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        alreadyIssued
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs'
                      }`}
                    >
                      {alreadyIssued ? 'ออกเกียรติบัตรแล้ว' : '➕ ออกเกียรติบัตรนี้'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MANUAL ISSUE FORM
          ========================================================================= */}
      {activeTab === 'manual_issue' && (
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-600" />
              ออกเกียรติบัตรรายบุคคล (Custom Certificate)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดชื่อรางวัล ข้อความเชิดชูเกียรติ และเลือกธีมสีได้ตามต้องการ
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600">เลือกประเภทรางวัลสำเร็จรูป</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'academic_excellence' as CertificateType, label: '🏆 เรียนดีเด่น (GPA)' },
                { type: 'top_subject' as CertificateType, label: '🥇 ยอดเยี่ยมรายวิชา' },
                { type: 'outstanding_improvement' as CertificateType, label: '🌟 พัฒนาการดีเด่น' },
                { type: 'desirable_conduct' as CertificateType, label: '🎖️ คุณธรรม จริยธรรม' },
                { type: 'student_activity' as CertificateType, label: '⛺ กิจกรรมพัฒนาผู้เรียน' },
                { type: 'custom' as CertificateType, label: '✏️ กำหนดเอง' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.type}
                  onClick={() => handleSelectPresetType(p.type)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    formType === p.type
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleManualIssue} className="space-y-4">
            {/* Student selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เลือกนักเรียนผู้รับเกียรติบัตร *
              </label>
              <select
                value={formStudentId}
                onChange={(e) => setFormStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                required
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    เลขที่ {stu.student_no} - {stu.name} (รหัส {stu.student_code})
                  </option>
                ))}
              </select>
            </div>

            {/* If Top Subject, choose which subject */}
            {formType === 'top_subject' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กลุ่มสาระการเรียนรู้ / รายวิชา
                </label>
                <select
                  value={formSubjectName}
                  onChange={(e) => {
                    setFormSubjectName(e.target.value);
                    setFormSubtitle(`ได้คะแนนสูงสุดอันดับ 1 ในกลุ่มสาระการเรียนรู้${e.target.value}`);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อเกียรติบัตร / รางวัล *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="เช่น เกียรติบัตรผลการเรียนดีเยี่ยมยอด"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Subtitle / Citation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อความประกาศเกียรติคุณ (คำบรรยายใต้ชื่อเกียรติบัตร)
              </label>
              <input
                type="text"
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                placeholder="เช่น ได้รับผลการเรียนเฉลี่ยสะสม 4.00 (เกียรตินิยมอันดับ 1)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                โทนสีและสไตล์กรอบเกียรติบัตร
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'gold', label: 'สีทองเกียรติยศ (Classic Gold)', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
                  { id: 'blue', label: 'สีน้ำเงินสถาบัน (Royal Blue)', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
                  { id: 'emerald', label: 'สีเขียวมรกต (Emerald)', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
                  { id: 'crimson', label: 'สีกรมท่าเข้ม (Crimson)', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
                ].map((th) => (
                  <button
                    type="button"
                    key={th.id}
                    onClick={() => setFormTheme(th.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formTheme === th.id
                        ? `${th.bg} ring-2 ring-indigo-500 shadow-xs`
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หมายเหตุบันทึกภายในสำหรับครู (ไม่พิมพ์ลงบนเกียรติบัตร)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เช่น มอบในพิธีปัจฉิมนิเทศ ป.6"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('issued')}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm shadow-indigo-200 cursor-pointer"
              >
                บันทึกและออกเกียรติบัตร
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SETTINGS & SIGNATURES
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-700" />
              ตั้งค่าโรงเรียน ลายมือชื่อ และข้อความทางการ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลเหล่านี้จะถูกพิมพ์ลงบนเกียรติบัตรทุกใบโดยอัตโนมัติ
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อสถานศึกษา (School Name) *
              </label>
              <input
                type="text"
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ปีการศึกษา
                </label>
                <input
                  type="text"
                  value={settings.academic_year}
                  onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                  placeholder="เช่น 2568"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่มอบเกียรติบัตร (ภาษาไทยทางการ)
                </label>
                <input
                  type="text"
                  value={settings.issue_date}
                  onChange={(e) => setSettings({ ...settings, issue_date: e.target.value })}
                  placeholder="เช่น ๒๕ มีนาคม ๒๕๖๘"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อครูประจำชั้น (Homeroom Teacher)
                </label>
                <input
                  type="text"
                  value={settings.homeroom_teacher}
                  onChange={(e) => setSettings({ ...settings, homeroom_teacher: e.target.value })}
                  placeholder="เช่น ครูสมศรี จิตเมตตา"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้อำนวยการโรงเรียน (Principal / Director)
                </label>
                <input
                  type="text"
                  value={settings.principal_name}
                  onChange={(e) => setSettings({ ...settings, principal_name: e.target.value })}
                  placeholder="เช่น นายประเสริฐ สุขสวัสดิ์"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ตราสัญลักษณ์บนหัวเกียรติบัตร
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'garuda', label: 'ตราครุฑทางการ' },
                  { id: 'education', label: 'ตราคบเพลิงการศึกษา' },
                  { id: 'seal', label: 'ตราสัญลักษณ์ช่อชัยพฤกษ์' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSettings({ ...settings, school_logo_type: s.id as any })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      settings.school_logo_type === s.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          PRINT-ONLY / BATCH-PRINT CONTAINER
          Will be rendered during print
          ========================================================================= */}
      <div className="print-only">
        {isBatchPrintMode ? (
          filteredCertificates.map((cert) => (
            <div key={`print-${cert.id}`} className="print-page-break">
              <CertificateCard certificate={cert} settings={settings} />
            </div>
          ))
        ) : (
          selectedCertForPreview && (
            <div className="print-page-break">
              <CertificateCard certificate={selectedCertForPreview} settings={settings} />
            </div>
          )
        )}
      </div>
    </div>
  );
};

// =========================================================================
// HIGH-ELEGANCE CERTIFICATE COMPONENT (A4 Landscape Print-Ready)
// =========================================================================
interface CertificateCardProps {
  certificate: Certificate;
  settings: CertificateSettings;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  settings,
}) => {
  const theme = certificate.theme_color || 'gold';

  // Theme styling configurations
  const styles = {
    gold: {
      outerBorder: 'border-amber-600/70',
      innerBorder: 'border-amber-500/40',
      corner: 'text-amber-600',
      accentText: 'text-amber-800',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
      sealColor: 'text-amber-600',
      ribbonBg: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600',
    },
    blue: {
      outerBorder: 'border-blue-700/70',
      innerBorder: 'border-blue-500/40',
      corner: 'text-blue-700',
      accentText: 'text-blue-900',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-300',
      sealColor: 'text-blue-700',
      ribbonBg: 'bg-gradient-to-r from-blue-700 via-indigo-500 to-blue-700',
    },
    emerald: {
      outerBorder: 'border-emerald-700/70',
      innerBorder: 'border-emerald-500/40',
      corner: 'text-emerald-700',
      accentText: 'text-emerald-900',
      badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      sealColor: 'text-emerald-700',
      ribbonBg: 'bg-gradient-to-r from-emerald-700 via-teal-500 to-emerald-700',
    },
    crimson: {
      outerBorder: 'border-rose-800/70',
      innerBorder: 'border-rose-600/40',
      corner: 'text-rose-800',
      accentText: 'text-rose-950',
      badgeBg: 'bg-rose-50 text-rose-950 border-rose-300',
      sealColor: 'text-rose-800',
      ribbonBg: 'bg-gradient-to-r from-rose-800 via-red-600 to-rose-800',
    },
  }[theme];

  const schoolName = certificate.school_name || settings.school_name || 'โรงเรียนอนุบาลพัฒนาการศึกษา';
  const issueDate = certificate.issue_date || settings.issue_date || '๒๕ มีนาคม ๒๕๖๘';
  const homeroomTeacher = certificate.homeroom_teacher || settings.homeroom_teacher || 'ครูสมศรี จิตเมตตา';
  const principalName = certificate.principal_name || settings.principal_name || 'นายประเสริฐ สุขสวัสดิ์';

  return (
    <div
      className={`certificate-container bg-[#fffef9] text-slate-800 relative select-none box-border mx-auto overflow-hidden p-6 sm:p-8 flex flex-col justify-between`}
      style={{
        width: '1000px',
        height: '700px',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Outer Decorative Double Border */}
      <div
        className={`absolute inset-3 sm:inset-4 border-4 ${styles.outerBorder} pointer-events-none`}
      >
        <div className={`absolute inset-1 sm:inset-1.5 border ${styles.innerBorder}`} />

        {/* 4 Corner Ornaments */}
        <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 ${styles.outerBorder}`} />
        <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 ${styles.outerBorder}`} />
        <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 ${styles.outerBorder}`} />
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 ${styles.outerBorder}`} />
      </div>

      {/* Background Watermark Crest */}
      <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none">
        <SchoolCrestSvg className="w-96 h-96" />
      </div>

      {/* TOP SECTION: Header & Emblem */}
      <div className="relative z-10 text-center pt-2 sm:pt-4">
        {/* Emblem */}
        <div className="flex justify-center mb-2">
          {settings.school_logo_type === 'garuda' ? (
            <GarudaSvg className="w-16 h-16 drop-shadow-xs" />
          ) : settings.school_logo_type === 'seal' ? (
            <WreathSealSvg className="w-16 h-16 drop-shadow-xs text-amber-600" />
          ) : (
            <EducationFlameSvg className="w-16 h-16 drop-shadow-xs text-amber-600" />
          )}
        </div>

        {/* School Name */}
        <div className="text-xl sm:text-2xl font-bold tracking-wide text-slate-800 font-['Sarabun',sans-serif]">
          {schoolName}
        </div>

        {/* Certificate Title */}
        <div className="mt-1">
          <span
            className={`inline-block text-xs uppercase tracking-widest font-bold px-4 py-0.5 rounded-full ${styles.badgeBg}`}
          >
            เกียรติบัตรนี้มอบให้ไว้เพื่อแสดงว่า
          </span>
        </div>
      </div>

      {/* MIDDLE SECTION: Student Name & Award Description */}
      <div className="relative z-10 text-center my-auto py-2 space-y-3">
        {/* Recipient Name */}
        <div>
          <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-wide font-['Prompt',sans-serif] text-shadow-xs">
            {certificate.student_name}
          </div>
          <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            เลขประจำตัว {certificate.student_code || '-'} • ชั้น{certificate.classroom_name || 'ประถมศึกษา'}
          </div>
        </div>

        {/* Award Ribbon / Banner */}
        <div className="max-w-xl mx-auto py-1">
          <div className="text-lg sm:text-2xl font-black text-slate-800 tracking-normal">
            {certificate.title}
          </div>
          {certificate.subtitle && (
            <div className={`text-xs sm:text-sm font-semibold ${styles.accentText} mt-1 leading-relaxed`}>
              {certificate.subtitle}
            </div>
          )}
        </div>

        {/* Formal Citation Text */}
        <div className="max-w-lg mx-auto text-[11px] sm:text-xs text-slate-500 italic leading-relaxed pt-1">
          ขอให้มีความเจริญก้าวหน้า มีความมานะอุตสาหะ และรักษาคุณงามความดีตลอดไป
        </div>
      </div>

      {/* BOTTOM SECTION: Date & Dual Signatures */}
      <div className="relative z-10 pt-2 pb-2">
        {/* Issue Date */}
        <div className="text-center text-xs text-slate-600 font-medium mb-5">
          ให้ไว้ ณ วันที่ {issueDate}
        </div>

        {/* Signatures & Seal Grid */}
        <div className="grid grid-cols-3 items-end px-4 sm:px-8 text-center text-xs">
          {/* Left Signature: Homeroom Teacher */}
          <div className="space-y-1">
            <div className="font-['Brush_Script_MT',cursive] italic text-lg sm:text-xl text-slate-700 h-7 flex items-center justify-center">
              {homeroomTeacher}
            </div>
            <div className="w-40 mx-auto border-b border-slate-400" />
            <div className="font-bold text-slate-800 text-xs mt-1">({homeroomTeacher})</div>
            <div className="text-[11px] text-slate-500">ครูประจำชั้น</div>
          </div>

          {/* Center Official Gold Seal Stamp */}
          <div className="flex flex-col items-center justify-center">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed ${styles.sealColor} flex flex-col items-center justify-center p-1 opacity-80`}
            >
              <Trophy className="w-5 h-5 mb-0.5" />
              <div className="text-[8px] font-bold uppercase tracking-tighter">OFFICIAL SEAL</div>
              <div className="text-[7px] text-slate-400">โรงเรียนพัฒนาการ</div>
            </div>
          </div>

          {/* Right Signature: School Principal */}
          <div className="space-y-1">
            <div className="font-['Brush_Script_MT',cursive] italic text-lg sm:text-xl text-slate-700 h-7 flex items-center justify-center">
              {principalName}
            </div>
            <div className="w-40 mx-auto border-b border-slate-400" />
            <div className="font-bold text-slate-800 text-xs mt-1">({principalName})</div>
            <div className="text-[11px] text-slate-500">ผู้อำนวยการสถานศึกษา</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SVG VECTOR EMBLEMS FOR PRINT AND CRISP HIGH-RES
// =========================================================================
function GarudaSvg({ className }: { className?: string }) {
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

function EducationFlameSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
      <path
        d="M50 20 C50 20 62 34 62 48 C62 56 56 62 50 62 C44 62 38 56 38 48 C38 34 50 20 50 20 Z"
        fill="#F59E0B"
      />
      <path
        d="M50 32 C50 32 56 40 56 48 C56 52 53 56 50 56 C47 56 44 52 44 48 C44 40 50 32 50 32 Z"
        fill="#EF4444"
      />
      <path d="M32 72 H68 V76 H32 Z" fill="#2563EB" />
      <path d="M38 64 L50 72 L62 64" stroke="#2563EB" strokeWidth="3" fill="none" />
    </svg>
  );
}

function WreathSealSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#F0FDF4" stroke="#059669" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" />
      <path
        d="M50 30 L54 42 L66 42 L56 50 L60 62 L50 54 L40 62 L44 50 L34 42 L46 42 Z"
        fill="#059669"
      />
      <path
        d="M26 62 C26 74 38 82 50 82 C62 82 74 74 74 62"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SchoolCrestSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="currentColor">
      <path d="M100 20 L160 50 V110 C160 150 100 185 100 185 C100 185 40 150 40 110 V50 L100 20 Z" />
    </svg>
  );
}
