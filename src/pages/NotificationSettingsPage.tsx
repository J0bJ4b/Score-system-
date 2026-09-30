import React, { useState, useEffect, useMemo } from 'react';
import {
  LineNotifySettings,
  NotificationChannel,
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
  Radio,
  Globe,
  Info,
  ChevronRight,
  Zap,
  ArrowRight,
  MessageCircle,
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

  // Active channel
  const activeChannel: NotificationChannel = settings.channel || 'line_share';

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

  // Switch Channel Helper
  const handleSelectChannel = (channel: NotificationChannel) => {
    const updated = { ...settings, channel };
    setSettings(updated);
    storage.saveLineNotifySettings(updated);
    setTestResult(null);
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testMsg = `\n🔔 [ทดสอบการเชื่อมต่อระบบแจ้งเตือนสำเร็จ]\n🏫 ${schoolDisplayName}\n👥 เป้าหมาย: ${settings.target_group_name || 'กลุ่มผู้ปกครอง'}\n⏰ เวลา: ${new Date().toLocaleTimeString('th-TH')} น.\n✨ ระบบพร้อมส่งการแจ้งเตือนผลการเรียนแล้วครับ/ค่ะ`;

    if (activeChannel === 'line_share') {
      setIsTesting(false);
      const shareUrl = lineNotifyService.getLineShareUrl(testMsg);
      // Open in window or simulate
      window.open(shareUrl, '_blank');
      setTestResult({
        success: true,
        message: 'เปิดหน้าต่างแชร์เข้า LINE เรียบร้อยแล้ว! (คุณครูสามารถเลือกส่งเข้ากลุ่มผู้ปกครองหรือบันทึกใน Keep ได้ทันที)',
        simulated: false,
      });
      storage.addNotificationLog({
        type: 'test_ping',
        title: 'ทดสอบส่งข้อความผ่าน LINE Direct Share',
        message: testMsg,
        recipient_group: settings.target_group_name || 'กลุ่มผู้ปกครอง',
        classroom: classroomDisplayName,
        subject_name: activeSubject?.name,
        term_name: activeTerm?.name,
        status: 'success',
        timestamp: new Date().toISOString(),
        student_count: students.length,
      });
      setLogs(storage.getNotificationLogs());
      return;
    }

    if (activeChannel === 'line_notify') {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: '⚠️ ระบบ LINE Notify ปิดให้บริการทั่วโลกแล้ว (ตั้งแต่ 31 มี.ค. 2025) กรุณาเปลี่ยนไปใช้ "แชร์เข้า LINE โดยตรง" หรือ "Telegram" แทน',
      });
      return;
    }

    const res = await lineNotifyService.sendMessage(testMsg, {
      type: 'test_ping',
      title: `ทดสอบการเชื่อมต่อ (${activeChannel.toUpperCase()})`,
      classroom: classroomDisplayName,
      studentCount: students.length,
      channelOverride: activeChannel,
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
    setIsBroadcasting(true);
    setBroadcastResult(null);

    const titleMap: Record<NotificationType, string> = {
      score_saved: `บันทึกคะแนนวิชา${activeSubject.name}`,
      midterm_final: `ประกาศผลสอบกลางภาค/ปลายภาควิชา${activeSubject.name}`,
      low_score_alert: `แจ้งเตือนติดตามคะแนน/งานค้างส่งวิชา${activeSubject.name}`,
      missing_work_alert: `แจ้งเตือนนักเรียนติด ร/มส วิชา${activeSubject.name}`,
      remedial_scheduled: `แจ้งนัดหมายการสอนซ่อมเสริมวิชา${activeSubject.name}`,
      remedial_passed: `แจ้งผลการสอบแก้ตัวผ่านเกณฑ์วิชา${activeSubject.name}`,
      custom_broadcast: customTitle || 'ประกาศข่าวสารจากครูประจำชั้น',
      test_ping: 'ทดสอบการส่งข้อความ',
    };

    if (activeChannel === 'line_share') {
      window.open(lineNotifyService.getLineShareUrl(livePreviewText), '_blank');
      storage.addNotificationLog({
        type: broadcastType,
        title: titleMap[broadcastType],
        message: livePreviewText,
        recipient_group: settings.target_group_name || 'กลุ่มผู้ปกครอง',
        classroom: classroomDisplayName,
        subject_name: activeSubject.name,
        term_name: activeTerm.name,
        status: 'success',
        timestamp: new Date().toISOString(),
        student_count: students.length,
      });
      setIsBroadcasting(false);
      setBroadcastResult({
        success: true,
        message: 'เปิดหน้าต่างแชร์เข้าแอป LINE เรียบร้อยแล้ว! (เลือกกลุ่มเพื่อส่งต่อได้ทันที)',
      });
      setLogs(storage.getNotificationLogs());
      return;
    }

    const res = await lineNotifyService.sendMessage(livePreviewText, {
      type: broadcastType,
      title: titleMap[broadcastType],
      classroom: classroomDisplayName,
      subjectName: activeSubject.name,
      termName: activeTerm.name,
      studentCount: students.length,
      channelOverride: activeChannel,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Sarabun',sans-serif]">
      {/* ⚠️ Prominent Notice Banner about LINE Notify Sunset & Alternatives */}
      <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-amber-300">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-black/20 text-white text-xs font-bold backdrop-blur-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
              <span>บริการ LINE Notify ยุติการให้บริการทั่วโลกแล้ว (31 มี.ค. 2025)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              ระบบได้เพิ่มช่องทางทดแทนที่ใช้งานได้จริง 100% ฟรี & ไม่จำกัด
            </h2>
            <p className="text-amber-50 text-xs sm:text-sm leading-relaxed">
              คุณครูสามารถใช้ <strong>"แชร์เข้ากลุ่ม LINE โดยตรง (LINE Direct Share)"</strong> ได้ทันทีโดยไม่ต้องใช้ Token หรือจะเชื่อมต่อ <strong>"Telegram Bot ฟรี 100%"</strong> เพื่อแจ้งเตือนอัตโนมัติเข้ากลุ่มผู้ปกครองได้ตลอดไป
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectChannel('line_share')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                activeChannel === 'line_share'
                  ? 'bg-white text-amber-900 ring-2 ring-white'
                  : 'bg-black/20 text-white hover:bg-black/30'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>ใช้ LINE แชร์ตรง (แนะนำ)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectChannel('telegram')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                activeChannel === 'telegram'
                  ? 'bg-white text-sky-900 ring-2 ring-white'
                  : 'bg-black/20 text-white hover:bg-black/30'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>ใช้ Telegram Bot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-3 border border-white/20">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>ศูนย์การแจ้งเตือนและการสื่อสารผู้ปกครองหลายช่องทาง (Multi-Channel Notification Hub)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>ระบบแจ้งเตือนผลการเรียน</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-mono font-bold">
                {activeChannel === 'line_share' && 'LINE Direct'}
                {activeChannel === 'telegram' && 'Telegram API'}
                {activeChannel === 'line_oa' && 'LINE OA'}
                {activeChannel === 'discord' && 'Discord'}
                {activeChannel === 'webhook' && 'Webhook'}
                {activeChannel === 'line_notify' && 'LINE Notify'}
              </span>
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              ส่งการแจ้งเตือนผลสอบกลางภาค/ปลายภาค บันทึกคะแนนเก็บ และแจ้งเตือนติดตามงานค้างส่ง (ติด "ร" หรือ "มส") ไปยังกลุ่มผู้ปกครองได้แบบเรียลไทม์
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
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-semibold text-xs sm:text-sm backdrop-blur-xs border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-200" />
              <span>คู่มือเปรียบเทียบช่องทาง</span>
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
          <span>ตั้งค่าช่องทางการแจ้งเตือน</span>
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
          <span>คู่มือทางเลือกทดแทน LINE Notify</span>
        </button>
      </div>

      {/* Tab 1: Settings & Multi-Channel Management */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Channel Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>เลือกช่องทางที่ต้องการส่งการแจ้งเตือน</span>
                </h3>
                <p className="text-xs text-slate-500">
                  คลิกเลือกช่องทางที่โรงเรียนหรือชั้นเรียนของท่านสะดวกใช้งานที่สุด
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Option 1: LINE Direct Share */}
              <div
                onClick={() => handleSelectChannel('line_share')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activeChannel === 'line_share'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#06C755] text-white flex items-center justify-center font-bold shadow-xs">
                      <Share2 className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      แนะนำมากที่สุด ⭐ ฟรี 100%
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">แชร์เข้ากลุ่ม LINE โดยตรง</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ไม่ต้องใช้ Token ไม่ต้องสร้างบอท กดปุ่มเดียวเปิดแอป LINE เลือกส่งเข้ากลุ่มผู้ปกครองหรือแชทนักเรียนได้ทันที
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold flex items-center justify-between text-emerald-700">
                  <span>ไม่ต้องตั้งค่าใดๆ</span>
                  {activeChannel === 'line_share' && <span className="font-bold text-emerald-600">✓ กำลังใช้งาน</span>}
                </div>
              </div>

              {/* Option 2: Telegram Bot */}
              <div
                onClick={() => handleSelectChannel('telegram')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activeChannel === 'telegram'
                    ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center font-bold shadow-xs">
                      <Radio className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      อัตโนมัติ 🚀 ฟรีตลอดชีพ
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Telegram Bot API</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ส่งข้อความอัตโนมัติเข้ากลุ่ม ไม่จำกัดจำนวนข้อความ สร้างบอทง่ายใน 1 นาทีผ่าน @BotFather ไม่มีค่าบริการ
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold flex items-center justify-between text-sky-700">
                  <span>ใช้ Bot Token & Chat ID</span>
                  {activeChannel === 'telegram' && <span className="font-bold text-sky-600">✓ กำลังใช้งาน</span>}
                </div>
              </div>

              {/* Option 3: LINE Official Account */}
              <div
                onClick={() => handleSelectChannel('line_oa')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activeChannel === 'line_oa'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#00B900] text-white flex items-center justify-center font-bold shadow-xs">
                      <MessageCircle className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      ทางการของ LINE 🏢
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">LINE Official Account (LINE OA)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ใช้ Messaging API ส่ง Broadcast ไปยังผู้ติดตาม LINE Official Account ของโรงเรียน
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold flex items-center justify-between text-emerald-700">
                  <span>ใช้ Channel Access Token</span>
                  {activeChannel === 'line_oa' && <span className="font-bold text-emerald-600">✓ กำลังใช้งาน</span>}
                </div>
              </div>

              {/* Option 4: Discord Webhook */}
              <div
                onClick={() => handleSelectChannel('discord')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activeChannel === 'discord'
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#5865F2] text-white flex items-center justify-center font-bold shadow-xs">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      ฟรี 100% 🎮 ติดตั้งง่าย
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Discord Webhook</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    แจ้งเตือนเข้าห้อง Discord ของครูหรือชมรมผู้ปกครอง จัดรูปแบบสวยงาม แค่วาง Webhook URL
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold flex items-center justify-between text-indigo-700">
                  <span>ใช้ Discord Webhook URL</span>
                  {activeChannel === 'discord' && <span className="font-bold text-indigo-600">✓ กำลังใช้งาน</span>}
                </div>
              </div>

              {/* Option 5: Custom Webhook / Google Apps Script */}
              <div
                onClick={() => handleSelectChannel('webhook')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activeChannel === 'webhook'
                    ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-2 ring-purple-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Globe className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      ยืดหยุ่นสูง 🌐 เชื่อมต่อได้ทุกระบบ
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Custom Webhook / Google Apps Script</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ส่งต่อข้อมูลไปยัง Google Apps Script เพื่อส่งอีเมล, SMS หรือระบบฐานข้อมูลของโรงเรียน
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold flex items-center justify-between text-purple-700">
                  <span>รองรับ HTTP POST JSON</span>
                  {activeChannel === 'webhook' && <span className="font-bold text-purple-600">✓ กำลังใช้งาน</span>}
                </div>
              </div>

              {/* Option 6: LINE Notify (Discontinued Status) */}
              <div
                onClick={() => handleSelectChannel('line_notify')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between opacity-70 ${
                  activeChannel === 'line_notify'
                    ? 'border-rose-400 bg-rose-50/40 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-slate-400 text-white flex items-center justify-center font-bold shadow-xs">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      ปิดบริการแล้ว ❌ (มี.ค. 2025)
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">LINE Notify เดิม</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    บริการนี้ปิดตัวอย่างเป็นทางการแล้ว แนะนำให้เปลี่ยนไปใช้ LINE Direct Share หรือ Telegram แทน
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] font-semibold text-rose-700">
                  <span>ไม่สามารถออก Token ใหม่ได้แล้ว</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Key className="w-5 h-5 text-emerald-600" />
                      <span>
                        ตั้งค่าช่องทาง:{' '}
                        {activeChannel === 'line_share' && 'แชร์เข้ากลุ่ม LINE โดยตรง'}
                        {activeChannel === 'telegram' && 'Telegram Bot'}
                        {activeChannel === 'line_oa' && 'LINE Official Account'}
                        {activeChannel === 'discord' && 'Discord Webhook'}
                        {activeChannel === 'webhook' && 'Custom Webhook'}
                        {activeChannel === 'line_notify' && 'LINE Notify (ปิดบริการ)'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      กำหนดค่าเชื่อมต่อและรายละเอียดข้อมูลผู้รับการแจ้งเตือน
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      activeChannel === 'line_share' ||
                      (activeChannel === 'telegram' && settings.telegram_bot_token && settings.telegram_chat_id) ||
                      (activeChannel === 'discord' && settings.discord_webhook_url) ||
                      (activeChannel === 'line_oa' && settings.line_oa_channel_access_token) ||
                      (activeChannel === 'webhook' && settings.custom_webhook_url)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    พร้อมใช้งาน
                  </span>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-5">
                  {/* Dynamic inputs based on activeChannel */}

                  {/* Channel: line_share */}
                  {activeChannel === 'line_share' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-emerald-950 text-sm">
                            ไม่ต้องกรอก Token หรือลงทะเบียนใดๆ ทั้งสิ้น!
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            เมื่อบันทึกคะแนนเสร็จสิ้น คุณครูสามารถคลิกปุ่ม <strong>"แชร์เข้า LINE"</strong> ได้ทันที ระบบจะเปิดแอป LINE บนมือถือหรือคอมพิวเตอร์ แล้วให้คุณครูเลือกกลุ่มผู้ปกครองหรือแชทที่ต้องการส่งต่อได้โดยตรง สะดวก รวดเร็ว และไม่มีวันหมดอายุ
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          className="px-3.5 py-2 bg-[#06C755] hover:bg-[#05963F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>ทดสอบเปิดแชร์เข้าแอป LINE</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Channel: Telegram */}
                  {activeChannel === 'telegram' && (
                    <div className="space-y-4 p-4 rounded-2xl bg-sky-50/50 border border-sky-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Telegram Bot Token <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={settings.telegram_bot_token || ''}
                            onChange={(e) =>
                              setSettings({ ...settings, telegram_bot_token: e.target.value })
                            }
                            placeholder="เช่น 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                            className="w-full pl-3 pr-20 py-2.5 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2 top-2 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showToken ? 'ซ่อน' : 'แสดง'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>สร้างบอทฟรีได้ใน 1 นาทีผ่าน</span>
                          <a
                            href="https://t.me/BotFather"
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-700 font-bold underline inline-flex items-center gap-0.5"
                          >
                            <span>@BotFather บน Telegram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Telegram Chat ID / Group ID <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={settings.telegram_chat_id || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, telegram_chat_id: e.target.value })
                          }
                          placeholder="เช่น -100123456789 (สำหรับกลุ่ม) หรือ 123456789 (แชทส่วนตัว)"
                          className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 คำแนะนำ: ดึงบอทเข้ากลุ่ม แล้วเชิญ <code>@userinfobot</code> หรือพิมพ์ข้อความเข้ากลุ่มเพื่อดู Chat ID
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Channel: LINE OA */}
                  {activeChannel === 'line_oa' && (
                    <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Channel Access Token (Long-lived) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={settings.line_oa_channel_access_token || ''}
                            onChange={(e) =>
                              setSettings({ ...settings, line_oa_channel_access_token: e.target.value })
                            }
                            placeholder="วาง Channel Access Token จาก LINE Developers Console..."
                            className="w-full pl-3 pr-20 py-2.5 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2 top-2 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showToken ? 'ซ่อน' : 'แสดง'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          รับ Token ได้ที่{' '}
                          <a
                            href="https://developers.line.biz/console/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                          >
                            <span>LINE Developers Console</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>{' '}
                          (แท็บ Messaging API)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Channel: Discord */}
                  {activeChannel === 'discord' && (
                    <div className="space-y-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Discord Webhook URL <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={settings.discord_webhook_url || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, discord_webhook_url: e.target.value })
                          }
                          placeholder="https://discord.com/api/webhooks/1234567890/..."
                          className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 ใน Discord: คลิกขวาที่ห้องแชท &gt; Edit Channel &gt; Integrations &gt; Webhooks &gt; Copy Webhook URL
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Channel: Custom Webhook */}
                  {activeChannel === 'webhook' && (
                    <div className="space-y-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Custom Webhook Endpoint URL <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={settings.custom_webhook_url || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, custom_webhook_url: e.target.value })
                          }
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          ระบบจะส่งข้อมูลแบบ HTTP POST (JSON Payload: <code>&#123; message, meta, school, timestamp &#125;</code>)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Channel: LINE Notify Legacy */}
                  {activeChannel === 'line_notify' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>LINE Notify ปิดบริการแล้ว</span>
                      </div>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        LINE Corporation ได้ยุติการให้บริการ LINE Notify อย่างเป็นทางการตั้งแต่วันที่ 31 มีนาคม 2025 เป็นต้นไป คุณครูจะไม่สามารถรับการแจ้งเตือนผ่านช่องทางนี้ได้ กรุณากดปุ่มด้านล่างเพื่อสลับไปใช้ <strong>LINE Direct Share</strong> หรือ <strong>Telegram</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSelectChannel('line_share')}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        สลับไปใช้ LINE Direct Share ทันที
                      </button>
                    </div>
                  )}

                  {/* Target Group & School Signature */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                            แสดงปุ่มส่งสรุปคะแนนอัตโนมัติไปยังกลุ่มผู้ปกครองทันทีหลังกดบันทึกคะแนนรายวิชา
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
                      <span>{isTesting ? 'กำลังทดสอบ...' : `ทดสอบส่งข้อความ (${activeChannel.toUpperCase()})`}</span>
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
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Quick Info & Preview Card */}
            <div className="space-y-6">
              <div className="bg-linear-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-4 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>จำลองการแจ้งเตือนผู้ปกครอง</span>
                </div>

                <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      🔔
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ถึง: {settings.target_group_name || 'กลุ่มผู้ปกครอง ป.5/1'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                    {`📝 [แจ้งเตือนการบันทึกคะแนนเก็บ]\n👥 ชั้นเรียน: ห้อง ${classroomDisplayName}\n📚 วิชา: ภาษาไทย (ท15101)\n📊 สถานะ: บันทึกคะแนนเรียบร้อยแล้ว (${students.length}/${students.length} คน)\n📲 ผู้ปกครองสามารถเปิดดูผลสอบได้ผ่านระบบผลการเรียน`}
                  </div>

                  <div className="text-[10px] text-slate-400 text-right">
                    {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>ช่องทางที่ใช้งาน:</span>
                    <span className="font-bold text-emerald-400">
                      {activeChannel === 'line_share' && 'แชร์เข้า LINE โดยตรง'}
                      {activeChannel === 'telegram' && 'Telegram Bot'}
                      {activeChannel === 'line_oa' && 'LINE Official Account'}
                      {activeChannel === 'discord' && 'Discord Webhook'}
                      {activeChannel === 'webhook' && 'Custom Webhook'}
                      {activeChannel === 'line_notify' && 'LINE Notify (ปิดบริการ)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>สถานะความพร้อม:</span>
                    <span className="text-emerald-400 font-medium">✓ เปิดใช้งาน</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Guide Callout */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>ทำไมแนะนำ "LINE Direct Share"?</span>
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เนื่องจาก LINE ปิดบริการบอท Notify ทั้งหมด การแชร์ตรง (Direct Share) เป็นวิธีเดียวที่ใช้งานได้ 100% ไม่เสียค่าบริการ ไม่เสี่ยงโดนบล็อก และผู้ปกครองในไทยคุ้นเคยกับกลุ่ม LINE มากที่สุดครับ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Broadcast / Manual Send */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Builder Form */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>สร้างข้อความแจ้งเตือนผู้ปกครอง</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกเทมเพลตข้อมูลผลการเรียน หรือพิมพ์ข้อความประกาศตามต้องการ
                  </p>
                </div>
              </div>

              {/* Message Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รูปแบบข้อความที่ต้องการส่ง
                </label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value as NotificationType)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                >
                  <option value="score_saved">📝 แจ้งเตือนการบันทึกคะแนนเก็บประจำวิชา</option>
                  <option value="midterm_final">🎯 ประกาศผลสอบกลางภาค / ปลายภาค</option>
                  <option value="low_score_alert">⚠️ แจ้งเตือนติดตามคะแนนต่ำกว่าเกณฑ์ / งานค้างส่ง</option>
                  <option value="missing_work_alert">⚠️ แจ้งเตือนนักเรียนติด "ร" หรือ "มส"</option>
                  <option value="custom_broadcast">💬 ประกาศข่าวสารทั่วไปจากครูประจำชั้น</option>
                </select>
              </div>

              {/* Subject & Term Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รายวิชา</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ภาคเรียน</label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ปีการศึกษา {t.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Broadcast Extra Fields */}
              {broadcastType === 'custom_broadcast' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      หัวข้อประกาศ
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="เช่น แจ้งกำหนดการประชุมผู้ปกครองภาคเรียนที่ 1"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
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
                      placeholder="พิมพ์รายละเอียดที่ต้องการส่งถึงผู้ปกครอง..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPreview ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
                  </button>

                  <a
                    href={lineNotifyService.getLineShareUrl(livePreviewText)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-[#06C755]/15 hover:bg-[#06C755]/25 text-[#05963F] border border-[#06C755]/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>แชร์ลง LINE ทันที</span>
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
                  <span>
                    {isBroadcasting
                      ? 'กำลังส่ง...'
                      : activeChannel === 'line_share'
                      ? 'เปิดแชร์เข้า LINE'
                      : `ส่งผ่าน ${activeChannel.toUpperCase()}`}
                  </span>
                </button>
              </div>

              {/* Broadcast Result Banner */}
              {broadcastResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
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

      {/* Tab 4: Comprehensive Migration & Setup Guide */}
      {activeSubTab === 'guide' && (
        <div className="space-y-6">
          {/* Comparison Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>ตารางเปรียบเทียบช่องทางทดแทน LINE Notify สำหรับโรงเรียน</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">
                LINE Notify ปิดแล้ว ใช้อะไรแทนดี? สรุปจุดเด่นของแต่ละทางเลือก
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                LINE Notify ได้ยุติการให้บริการอย่างเป็นทางการเมื่อวันที่ 31 มีนาคม 2025 นี่คือทางเลือกที่ดีที่สุดสำหรับคุณครู
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 rounded-l-xl">ช่องทาง</th>
                    <th className="py-3 px-3">ค่าใช้จ่าย</th>
                    <th className="py-3 px-3">ขีดจำกัดข้อความ</th>
                    <th className="py-3 px-3">ความยากในการติดตั้ง</th>
                    <th className="py-3 px-3 rounded-r-xl">ความเหมาะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-emerald-50/50 bg-emerald-50/20">
                    <td className="py-3.5 px-3 font-bold text-emerald-950 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center text-xs">
                        <Share2 className="w-3.5 h-3.5" />
                      </span>
                      <span>แชร์เข้า LINE โดยตรง (Direct Share)</span>
                    </td>
                    <td className="py-3.5 px-3 text-emerald-700 font-bold">ฟรี 100% ตลอดชีพ</td>
                    <td className="py-3.5 px-3 text-emerald-700 font-bold">ไม่จำกัด</td>
                    <td className="py-3.5 px-3 text-slate-600">ง่ายมาก (ไม่ต้องตั้งค่า)</td>
                    <td className="py-3.5 px-3 text-emerald-800 font-bold">
                      ⭐ เหมาะกับคุณครูทุกคน ส่งเข้ากลุ่มผู้ปกครองทันที
                    </td>
                  </tr>

                  <tr className="hover:bg-sky-50/50">
                    <td className="py-3.5 px-3 font-bold text-sky-950 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#229ED9] text-white flex items-center justify-center text-xs">
                        <Radio className="w-3.5 h-3.5" />
                      </span>
                      <span>Telegram Bot API</span>
                    </td>
                    <td className="py-3.5 px-3 text-sky-700 font-bold">ฟรี 100% ตลอดชีพ</td>
                    <td className="py-3.5 px-3 text-sky-700 font-bold">ไม่จำกัด (Unlimited)</td>
                    <td className="py-3.5 px-3 text-slate-600">ปานกลาง (สร้างบอท 1 นาที)</td>
                    <td className="py-3.5 px-3 text-sky-800 font-bold">
                      🚀 เหมาะที่สุดสำหรับแจ้งเตือนแบบอัตโนมัติ
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#00B900] text-white flex items-center justify-center text-xs">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </span>
                      <span>LINE Official Account (LINE OA)</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">ฟรีตามแพ็กเกจ (มีโควต้าจำกัด)</td>
                    <td className="py-3.5 px-3 text-slate-600">300-500 ข้อความ/เดือน (เกินมีค่าใช้จ่าย)</td>
                    <td className="py-3.5 px-3 text-slate-600">ยาก (ต้องสมัคร Developers Console)</td>
                    <td className="py-3.5 px-3 text-slate-700">เหมาะกับโรงเรียนขนาดใหญ่ที่มี LINE OA อยู่แล้ว</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#5865F2] text-white flex items-center justify-center text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </span>
                      <span>Discord Webhook</span>
                    </td>
                    <td className="py-3.5 px-3 text-indigo-700 font-bold">ฟรี 100%</td>
                    <td className="py-3.5 px-3 text-indigo-700 font-bold">ไม่จำกัด</td>
                    <td className="py-3.5 px-3 text-slate-600">ง่าย (คัดลอก URL)</td>
                    <td className="py-3.5 px-3 text-slate-700">เหมาะกับกลุ่มครูหรือฝ่ายวิชาการ</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs">
                        <Globe className="w-3.5 h-3.5" />
                      </span>
                      <span>Custom Webhook / Google Apps Script</span>
                    </td>
                    <td className="py-3.5 px-3 text-purple-700 font-bold">ฟรี (บน Google Workspace)</td>
                    <td className="py-3.5 px-3 text-purple-700 font-bold">ไม่จำกัด</td>
                    <td className="py-3.5 px-3 text-slate-600">ต้องมีความรู้เขียนสคริปต์</td>
                    <td className="py-3.5 px-3 text-slate-700">เหมาะกับการส่งเข้าอีเมล หรือระบบฐานข้อมูล</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Guides for Top 2 Alternatives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guide 1: LINE Direct Share */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-10 h-10 rounded-2xl bg-[#06C755] text-white flex items-center justify-center shadow-xs">
                  <Share2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    วิธีที่ 1: แชร์เข้ากลุ่ม LINE โดยตรง (ง่ายที่สุด)
                  </h3>
                  <p className="text-xs text-emerald-700 font-bold">
                    ไม่ต้องสมัครบอท ไม่ต้องกรอก Token ใช้งานได้ทันที
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-800">เลือกช่องทาง "แชร์เข้ากลุ่ม LINE โดยตรง":</strong> ในหน้าตั้งค่านี้ ตรวจสอบให้แน่ใจว่าเลือกกล่อง <strong>"แชร์เข้ากลุ่ม LINE โดยตรง"</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-800">กดปุ่ม "แชร์ลง LINE":</strong> ในหน้าบันทึกคะแนน เมื่อกรอกคะแนนเสร็จ จะมีปุ่ม <strong>"แชร์ลง LINE"</strong> หรือในหน้าส่งข้อความด่วน ให้กดปุ่มแชร์
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-800">เลือกกลุ่มห้องเรียนใน LINE:</strong> แอป LINE จะเปิดขึ้นมาอัตโนมัติ คุณครูเพียงเลือกกลุ่มผู้ปกครอง ป.5/1 แล้วกดยืนยันส่ง ข้อความรายงานผลจะถูกส่งเข้าห้องแชททันที!
                  </div>
                </div>
              </div>
            </div>

            {/* Guide 2: Telegram Bot Setup */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-xs">
                  <Radio className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    วิธีที่ 2: ตั้งค่า Telegram Bot (แจ้งเตือนอัตโนมัติ)
                  </h3>
                  <p className="text-xs text-sky-700 font-bold">
                    ฟรี 100% ตลอดชีพ ไม่จำกัดจำนวนครั้ง สร้างง่ายใน 1 นาที
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-800">สร้างบอทผ่าน @BotFather:</strong> เปิดแอป Telegram ค้นหา <code>@BotFather</code> แล้วพิมพ์คำสั่ง <code>/newbot</code> ตั้งชื่อบอท จะได้รับ <strong>HTTP API Token</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-800">ดึงบอทเข้ากลุ่ม:</strong> สร้างกลุ่มผู้ปกครองหรือครูใน Telegram แล้วดึงบอทที่เราเพิ่งสร้างเข้าไปในกลุ่ม และตั้งบอทเป็น Admin
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-800">หา Group Chat ID:</strong> เชิญ <code>@userinfobot</code> เข้ากลุ่ม หรือดู ID กลุ่ม (ขึ้นต้นด้วยเครื่องหมายลบ เช่น <code>-1001234567890</code>)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-800">กรอกในหน้าตั้งค่า:</strong> นำ Bot Token และ Chat ID มากรอกในแท็บ <strong>"การตั้งค่า"</strong> แล้วกดทดสอบส่งได้ทันที
                  </div>
                </div>
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
                className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold cursor-pointer"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                คัดลอกข้อความ
              </button>
              <a
                href={lineNotifyService.getLineShareUrl(selectedLog.message)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#06C755] hover:bg-[#05963F] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>แชร์ลง LINE</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
