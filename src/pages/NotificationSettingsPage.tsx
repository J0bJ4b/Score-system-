import React, { useState, useEffect, useMemo } from 'react';
import {
  LineNotifySettings,
  NotificationLog,
  NotificationType,
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
  User,
  Classroom,
} from '../types';
import { storage } from '../services/storage';
import { lineNotifyService } from '../services/lineNotify';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Key,
  MessageSquare,
  History,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Smartphone,
  ShieldCheck,
  Sparkles,
  School,
  Users,
  Eye,
  EyeOff,
  Share2,
  AlertTriangle,
} from 'lucide-react';

interface NotificationSettingsPageProps {
  students: Student[];
  subjects: Subject[];
  terms: Term[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  classroom: string;
  activeClassroom?: Classroom;
  user: User;
}

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({
  students,
  subjects,
  terms,
  allScoreItems,
  allScores,
  classroom,
  activeClassroom,
  user,
}) => {
  // Active subtab
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'broadcast' | 'logs' | 'guide'>('settings');

  // Settings State
  const [settings, setSettings] = useState<LineNotifySettings>(() => storage.getLineNotifySettings());
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test & Sending State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null);

  // Broadcast Builder State
  const [broadcastType, setBroadcastType] = useState<NotificationType>('score_saved');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState<string>(terms[0]?.id || '');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<NotificationLog[]>(() => storage.getNotificationLogs());
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTerm = terms.find((t) => t.id === selectedTermId) || terms[0];

  const classroomDisplayName = activeClassroom?.name || classroom || 'ป.5/1';
  const schoolDisplayName = user?.school_name || settings.school_signature || 'โรงเรียนบ้านป่าส่าน';

  // Save Settings
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    storage.saveLineNotifySettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!settings.token.trim()) {
      setTestResult({
        success: false,
        message: 'กรุณากรอก LINE Notify Token ก่อนกดทดสอบ',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testMsg = `\n🔔 [ทดสอบการเชื่อมต่อ LINE Notify สำเร็จ]\n🏫 ${schoolDisplayName}\n👥 เป้าหมาย: ${settings.target_group_name || 'กลุ่มผู้ปกครอง'}\n⏰ เวลา: ${new Date().toLocaleTimeString('th-TH')} น.\n✨ ระบบพร้อมส่งการแจ้งเตือนผลการเรียนแล้วครับ/ค่ะ`;

    const res = await lineNotifyService.sendMessage(testMsg, {
      type: 'test_ping',
      title: 'ทดสอบการเชื่อมต่อ LINE Notify',
      classroom: classroomDisplayName,
      studentCount: students.length,
      tokenOverride: settings.token,
    });

    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.message,
      simulated: res.simulated,
    });
    setLogs(storage.getNotificationLogs());
  };

  // Calculate stats for preview
  const previewStats = useMemo(() => {
    if (!activeSubject || !activeTerm) return null;
    const items = allScoreItems.filter(
      (i) => i.subject_id === activeSubject.id && i.term_id === activeTerm.id
    );
    const itemIds = items.map((i) => i.id);

    let recordedCount = 0;
    let totalScoreObtained = 0;
    let scoresList: number[] = [];
    let atRiskList: Array<{ studentNo: number; studentName: string; reason: string }> = [];

    students.forEach((stu) => {
      let stuSum = 0;
      let hasAbsent = false;
      let hasMissing = false;
      let hasAnyScore = false;

      items.forEach((it) => {
        const sc = allScores.find(
          (s) => s.student_id === stu.id && s.score_item_id === it.id
        );
        if (sc) {
          if (sc.status === 'absent') hasAbsent = true;
          if (sc.status === 'missing') hasMissing = true;
          if (typeof sc.score === 'number') {
            stuSum += sc.score;
            hasAnyScore = true;
          }
        }
      });

      if (hasAnyScore || hasAbsent || hasMissing) {
        recordedCount++;
        totalScoreObtained += stuSum;
        scoresList.push(stuSum);
      }

      // Check risk
      const maxPossible = 50;
      const threshold = (settings.low_score_threshold_percent / 100) * maxPossible;

      if (hasAbsent) {
        atRiskList.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: 'ติด ร (ขาดสอบเก็บคะแนน)',
        });
      } else if (hasMissing) {
        atRiskList.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: 'ติด มส (ค้างส่งงาน/ชิ้นงาน)',
        });
      } else if (stuSum < threshold && hasAnyScore) {
        atRiskList.push({
          studentNo: stu.student_no,
          studentName: stu.name,
          reason: `คะแนนเก็บต่ำกว่าเกณฑ์ (${stuSum}/${maxPossible} คะแนน)`,
        });
      }
    });

    const avg = scoresList.length > 0 ? totalScoreObtained / scoresList.length : 0;
    const maxSc = scoresList.length > 0 ? Math.max(...scoresList) : 0;
    const minSc = scoresList.length > 0 ? Math.min(...scoresList) : 0;

    return {
      totalStudents: students.length,
      recordedCount,
      average: avg,
      maxScore: maxSc,
      minScore: minSc,
      atRiskList,
    };
  }, [students, activeSubject, activeTerm, allScoreItems, allScores, settings.low_score_threshold_percent]);

  // Generate dynamic live preview text
  const livePreviewText = useMemo(() => {
    if (!activeSubject || !activeTerm) return '';

    if (broadcastType === 'score_saved') {
      return lineNotifyService.buildScoreSavedMessage({
        classroomName: classroomDisplayName,
        subject: activeSubject,
        term: activeTerm,
        totalStudents: students.length,
        recordedCount: previewStats?.recordedCount || students.length,
        teacherName: user.full_name || 'ครูสมศรี จิตเมตตา',
        schoolName: schoolDisplayName,
      });
    }

    if (broadcastType === 'midterm_final') {
      return lineNotifyService.buildExamAnnouncementMessage({
        classroomName: classroomDisplayName,
        subject: activeSubject,
        term: activeTerm,
        examType: 'midterm',
        averageScore: previewStats?.average || 38.5,
        maxScoreObtained: previewStats?.maxScore || 48,
        minScoreObtained: previewStats?.minScore || 24,
        fullScore: 50,
        totalStudents: previewStats?.recordedCount || students.length,
        teacherName: user.full_name,
        schoolName: schoolDisplayName,
      });
    }

    if (broadcastType === 'low_score_alert' || broadcastType === 'missing_work_alert') {
      const risks =
        previewStats?.atRiskList && previewStats.atRiskList.length > 0
          ? previewStats.atRiskList
          : [
              { studentNo: 5, studentName: 'เด็กชายธนภัทร', reason: 'ติด ร (ขาดสอบ)' },
              { studentNo: 14, studentName: 'เด็กหญิงปรียาภรณ์', reason: 'ค้างส่งใบงานที่ 2' },
            ];
      return lineNotifyService.buildLowScoreAndMissingAlertMessage({
        classroomName: classroomDisplayName,
        subject: activeSubject,
        term: activeTerm,
        studentsAtRisk: risks,
        teacherName: user.full_name,
        schoolName: schoolDisplayName,
      });
    }

    // Custom Broadcast
    let msg = `\n📢 [ประกาศด่วนจากครูประจำชั้น]\n`;
    msg += `🏫 ${schoolDisplayName}\n`;
    msg += `👥 ห้องเรียน: ${classroomDisplayName}\n`;
    msg += `หัวข้อ: ${customTitle || 'แจ้งข่าวสารประจำสัปดาห์'}\n\n`;
    msg += `${customMessage || 'ขอเรียนเชิญผู้ปกครองติดตามผลการเรียนและกิจกรรมของนักเรียนตามที่แจ้งในระบบครับ/ค่ะ'}\n\n`;
    msg += `ครูประจำชั้น: ${user.full_name || 'ครูสมศรี จิตเมตตา'}\nขอบคุณครับ/ค่ะ 🙏`;
    return msg;
  }, [
    broadcastType,
    activeSubject,
    activeTerm,
    classroomDisplayName,
    schoolDisplayName,
    previewStats,
    user.full_name,
    customTitle,
    customMessage,
    students.length,
  ]);

  // Execute Broadcast
  const handleSendBroadcast = async () => {
    if (!settings.token.trim()) {
      alert('กรุณากรอกและบันทึก LINE Notify Token ในแท็บ "ตั้งค่าการเชื่อมต่อ" ก่อนส่ง');
      setActiveSubTab('settings');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastResult(null);

    const titleMap: Record<NotificationType, string> = {
      score_saved: `บันทึกคะแนนวิชา${activeSubject.name}`,
      midterm_final: `ประกาศผลสอบกลางภาค/ปลายภาควิชา${activeSubject.name}`,
      low_score_alert: `แจ้งเตือนติดตามคะแนน/งานค้างส่งวิชา${activeSubject.name}`,
      missing_work_alert: `แจ้งเตือนนักเรียนติด ร/มส วิชา${activeSubject.name}`,
      custom_broadcast: customTitle || 'ประกาศข่าวสารจากครูประจำชั้น',
      test_ping: 'ทดสอบการส่งข้อความ',
    };

    const res = await lineNotifyService.sendMessage(livePreviewText, {
      type: broadcastType,
      title: titleMap[broadcastType],
      classroom: classroomDisplayName,
      subjectName: activeSubject.name,
      termName: activeTerm.name,
      studentCount: students.length,
    });

    setIsBroadcasting(false);
    setBroadcastResult({
      success: res.success,
      message: res.message,
    });
    setLogs(storage.getNotificationLogs());
  };

  // Copy Preview Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(livePreviewText);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-3 border border-white/20">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>โมดูลการสื่อสารและแจ้งเตือนผู้ปกครอง (LINE Notify API)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>เชื่อมต่อ LINE Notify</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-mono font-bold">
                v2.0
              </span>
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              ส่งการแจ้งเตือนผลสอบกลางภาค/ปลายภาค บันทึกคะแนนเก็บ และแจ้งเตือนติดตามงานค้างส่ง (ติด "ร" หรือ "มส") ไปยังกลุ่ม LINE ผู้ปกครองได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveSubTab('broadcast')}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>ส่งข้อความด่วน</span>
            </button>
            <button
              onClick={() => setActiveSubTab('guide')}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-semibold text-xs sm:text-sm backdrop-blur-sm border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-200" />
              <span>วิธีขอ Token</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>การตั้งค่า API Token & สิทธิ์</span>
        </button>

        <button
          onClick={() => setActiveSubTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'broadcast'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ส่งแจ้งเตือน / สรุปคะแนน</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            พรีวิว
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติการส่ง ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'guide'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>คู่มือติดตั้ง LINE Notify</span>
        </button>
      </div>

      {/* Tab 1: Settings & Token Management */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-600" />
                    <span>จัดการ LINE Notify API Token</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    นำ Token จากระบบ LINE Notify ของท่านมากรอกเพื่อใช้ส่งข้อความไปยังกลุ่มไลน์
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    settings.token.trim()
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {settings.token.trim() ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      พร้อมใช้งาน
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      ยังไม่ระบุ Token
                    </>
                  )}
                </span>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* API Token Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    LINE Notify Access Token <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={settings.token}
                      onChange={(e) =>
                        setSettings({ ...settings, token: e.target.value })
                      }
                      placeholder="วาง Token เช่น 4abcDefGhIjKLmnOpQRStuvWxyz123456789..."
                      className="w-full pl-3 pr-20 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-2 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showToken ? 'ซ่อน' : 'แสดง'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>Token จะถูกเก็บรักษาในเบราว์เซอร์อย่างปลอดภัย</span>
                    <a
                      href="https://notify-bot.line.me/my/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>ขอ Token ที่ notify-bot.line.me</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Target Group & School Signature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อกลุ่มผู้รับการแจ้งเตือน
                    </label>
                    <input
                      type="text"
                      value={settings.target_group_name}
                      onChange={(e) =>
                        setSettings({ ...settings, target_group_name: e.target.value })
                      }
                      placeholder="เช่น กลุ่มผู้ปกครอง ป.5/1"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อโรงเรียน / ลายเซ็นลงท้าย
                    </label>
                    <input
                      type="text"
                      value={settings.school_signature}
                      onChange={(e) =>
                        setSettings({ ...settings, school_signature: e.target.value })
                      }
                      placeholder="โรงเรียนบ้านป่าส่าน"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Triggers & Rules Checkboxes */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-3">
                    เงื่อนไขและรูปแบบการแจ้งเตือน
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notify_on_score_saved}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_score_saved: e.target.checked })
                        }
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                          แจ้งเตือนเมื่อครูบันทึกผลการเรียนเสร็จสิ้นในหน้าบันทึกคะแนน
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          แสดงปุ่มส่งสรุปคะแนนอัตโนมัติไปยัง LINE ทันทีหลังกดบันทึกคะแนนรายวิชา
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notify_on_midterm_final}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_midterm_final: e.target.checked })
                        }
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                          แจ้งเตือนเมื่อครูประกาศคะแนนสอบกลางภาค / ปลายภาค
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ส่งสถิติคะแนนเต็ม, คะแนนเฉลี่ย, คะแนนสูงสุด-ต่ำสุด เพื่อให้ผู้ปกครองทราบผลการประเมิน
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notify_on_missing_or_absent}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notify_on_missing_or_absent: e.target.checked,
                          })
                        }
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                          แจ้งเตือนกรณีมีงานค้างส่ง หรือขาดสอบ (ติด "ร" หรือ "มส")
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ระบุรายชื่อนักเรียนและรายการที่ยังไม่ส่ง เพื่อให้ผู้ปกครองช่วยติดตามดูแล
                        </div>
                      </div>
                    </label>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                          เกณฑ์คะแนนต่ำกว่าเกณฑ์สำหรับแจ้งเตือน
                        </div>
                        <div className="text-[11px] text-slate-500">
                          หากคะแนนเก็บต่ำกว่าเปอร์เซ็นต์นี้ จะแสดงในรายการที่ต้องติดตาม
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="10"
                          max="90"
                          step="5"
                          value={settings.low_score_threshold_percent}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              low_score_threshold_percent: parseInt(e.target.value) || 50,
                            })
                          }
                          className="w-20 px-2.5 py-1.5 text-center text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-600">% (เช่น 50%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save & Test Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Send className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบส่งข้อความไปยัง LINE'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {savedSuccess && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        บันทึกการตั้งค่าแล้ว
                      </span>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>บันทึกการตั้งค่า</span>
                    </button>
                  </div>
                </div>

                {/* Test Result Box */}
                {testResult && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testResult.success ? 'ทดสอบเชื่อมต่อสำเร็จ!' : 'ทดสอบไม่สำเร็จ'}
                      </div>
                      <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                      {testResult.simulated && (
                        <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                          💡 หมายเหตุ: ระบบจำลองการส่งและบันทึกลงประวัติเรียบร้อยแล้ว (คุณครูสามารถแชร์ลงกลุ่ม LINE ได้โดยตรง)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Quick Info & LINE Preview Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-4 uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>จำลองการแสดงผลบน LINE App</span>
              </div>

              {/* Chat bubble */}
              <div className="bg-[#85c977]/20 p-3 rounded-2xl border border-emerald-500/20 mb-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">
                    L
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">LINE Notify</div>
                    <div className="text-[10px] text-emerald-300">บอทแจ้งเตือนอัตโนมัติ</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  {`📢 [ประกาศผลสอบอย่างเป็นทางการ]
🏫 ${schoolDisplayName}
👥 ระดับชั้น: ห้อง ${classroomDisplayName}
📚 วิชา: ${activeSubject?.name || 'ภาษาไทย'}
🗓️ ${activeTerm?.name || 'ภาคเรียนที่ 1'} ปีการศึกษา ${activeTerm?.academic_year || '2569'}

📊 สถิติ: เข้าสอบครบ ${students.length} คน
🌟 นักเรียนและผู้ปกครองสามารถตรวจสอบผลคะแนนได้ที่ระบบออนไลน์`}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                ข้อความจะถูกส่งตรงเข้ากลุ่มไลน์ผู้ปกครองทันทีที่ครูกดส่งจากหน้าบันทึกคะแนน
              </div>
            </div>

            {/* Step Check Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ข้อกำหนดการใช้งาน LINE Notify</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800/90 leading-relaxed">
                <li>ฟรี ไม่มีค่าใช้จ่าย และไม่จำกัดจำนวนครั้งในการส่ง</li>
                <li>ต้องเชิญบัญชี <strong>LINE Notify</strong> เข้ากลุ่มไลน์ที่ต้องการรับข้อความ</li>
                <li>สามารถตั้ง Token แยกแต่ละห้องเรียนหรือใช้ร่วมกันทั้งโรงเรียนได้</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Broadcast & Custom Notification */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>สร้างข้อความแจ้งเตือน / สรุปผลการเรียน</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกประเภทข้อความและวิชาที่ต้องการส่ง ระบบจะจัดฟอร์แมตข้อความให้อัตโนมัติ
                </p>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. เลือกประเภทข้อความ
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastType('score_saved')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      broadcastType === 'score_saved'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">📝 สรุปการบันทึกคะแนนเก็บ</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      แจ้งว่าครูลงคะแนนเสร็จสิ้นแล้ว
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastType('midterm_final')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      broadcastType === 'midterm_final'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">🎯 ประกาศผลสอบกลาง/ปลายภาค</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ส่งสถิติ คะแนนเฉลี่ย สูงสุด-ต่ำสุด
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastType('low_score_alert')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      broadcastType === 'low_score_alert'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">⚠️ ติดตามงาน / คะแนนต่ำกว่าเกณฑ์</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      แจ้งเตือนนักเรียนติด ร/มส หรือตก
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastType('custom_broadcast')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      broadcastType === 'custom_broadcast'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">💬 ประกาศข่าวสารทั่วไป</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      พิมพ์ข้อความอิสระส่งถึงผู้ปกครอง
                    </div>
                  </button>
                </div>
              </div>

              {/* Subject & Term Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. เลือกรายวิชา
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. เลือกภาคเรียน
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ปีการศึกษา {t.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom fields if custom type */}
              {broadcastType === 'custom_broadcast' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      หัวข้อประกาศ
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="เช่น แจ้งกำหนดการสอบปลายภาคและส่งงานวันสุดท้าย"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เนื้อหาข้อความ
                    </label>
                    <textarea
                      rows={4}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="พิมพ์รายละเอียดที่ต้องการแจ้งให้ผู้ปกครองทราบ..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPreview ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}</span>
                  </button>

                  <a
                    href={lineNotifyService.getLineShareUrl(livePreviewText)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#05963F] border border-[#06C755]/30 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>แชร์ลง LINE</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isBroadcasting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isBroadcasting ? 'กำลังส่ง...' : 'ส่งผ่าน LINE Notify'}</span>
                </button>
              </div>

              {/* Broadcast Result */}
              {broadcastResult && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                    broadcastResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {broadcastResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {broadcastResult.success ? 'ส่งข้อความสำเร็จ!' : 'เกิดข้อผิดพลาดในการส่ง'}
                    </div>
                    <p className="mt-0.5">{broadcastResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-300 ml-2">ตัวอย่างข้อความที่จะส่ง</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  {settings.target_group_name || 'กลุ่มผู้ปกครอง'}
                </span>
              </div>

              {/* Message Screen */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner min-h-[300px]">
                {livePreviewText}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800">
                <span>ความยาวข้อความ: {livePreviewText.length} ตัวอักษร</span>
                <span className="text-emerald-400 font-medium">✨ พร้อมจัดส่ง</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History & Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>ประวัติการส่งการแจ้งเตือน</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                บันทึกประวัติการส่งข้อความแจ้งเตือนทั้งหมด ({logs.length} รายการล่าสุด)
              </p>
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('ต้องการล้างประวัติการส่งทั้งหมดใช่หรือไม่?')) {
                    storage.clearNotificationLogs();
                    setLogs([]);
                  }
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างประวัติทั้งหมด</span>
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              ยังไม่มีประวัติการส่งข้อความแจ้งเตือน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">วัน-เวลา</th>
                    <th className="py-2.5 px-3">ประเภท</th>
                    <th className="py-2.5 px-3">หัวข้อ</th>
                    <th className="py-2.5 px-3">กลุ่มผู้รับ</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                    <th className="py-2.5 px-3 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {log.type === 'score_saved' && '📝 บันทึกคะแนน'}
                        {log.type === 'midterm_final' && '🎯 ผลสอบกลาง/ปลายภาค'}
                        {log.type === 'low_score_alert' && '⚠️ ติดตามงาน/คะแนน'}
                        {log.type === 'missing_work_alert' && '⚠️ ติด ร/มส'}
                        {log.type === 'custom_broadcast' && '💬 ประกาศทั่วไป'}
                        {log.type === 'test_ping' && '🔔 ทดสอบระบบ'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 max-w-xs truncate">
                        {log.title}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {log.recipient_group}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            สำเร็จ
                          </span>
                        )}
                        {log.status === 'simulated' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                            <Sparkles className="w-3 h-3" />
                            จำลองสำเร็จ
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" />
                            ล้มเหลว
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-semibold text-[11px] cursor-pointer"
                        >
                          ดูข้อความ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Setup Guide */}
      {activeSubTab === 'guide' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <span>ขั้นตอนการขอ LINE Notify Token เพื่อเชื่อมต่อระบบ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ทำตาม 4 ขั้นตอนง่ายๆ ด้านล่างนี้เพื่อเปิดใช้งานระบบแจ้งเตือนผลการเรียนอัตโนมัติ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-emerald-950">เข้าสู่ระบบ LINE Notify</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เปิดเว็บไซต์{' '}
                  <a
                    href="https://notify-bot.line.me/my/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 underline"
                  >
                    notify-bot.line.me
                  </a>{' '}
                  และเข้าสู่ระบบด้วยบัญชี LINE ของคุณครู
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-emerald-950">ออก Access Token</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ไปที่ <strong>My page (หน้าของฉัน)</strong> เลื่อนลงมาด้านล่างแล้วกดปุ่ม <strong>"Generate token (ออก Token)"</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-emerald-950">ตั้งชื่อและเลือกกลุ่ม</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  พิมพ์ชื่อบอท เช่น <strong>"แจ้งผลการเรียน ป.5/1"</strong> และเลือกกลุ่มไลน์ผู้ปกครองที่ต้องการรับข้อความ แล้วกดออก Token
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-emerald-950">เชิญบอทเข้ากลุ่มไลน์</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  คัดลอก Token มาวางในแท็บ "การตั้งค่า" และ <strong>เชิญบัญชี 'LINE Notify' เข้ากลุ่มไลน์ผู้ปกครอง</strong> เพื่อเริ่มรับข้อความ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                รายละเอียดข้อความแจ้งเตือน
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>ส่งเมื่อ: {new Date(selectedLog.timestamp).toLocaleString('th-TH')}</span>
                <span>ผู้รับ: {selectedLog.recipient_group}</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {selectedLog.message}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedLog.message);
                  alert('คัดลอกข้อความแล้ว');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                คัดลอกข้อความ
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
