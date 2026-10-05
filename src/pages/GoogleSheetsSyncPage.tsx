import React, { useState, useEffect } from 'react';
import { Student, Subject, ScoreItem, Score, Term, User, Classroom, SchoolSettings } from '../types';
import {
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
  initGoogleAuth,
} from '../services/googleAuth';
import {
  createAllClassroomsSpreadsheet,
  exportAllClassroomsToExcel,
  updateExistingSpreadsheetAllClassrooms,
  createClassroomSpreadsheet,
  updateExistingSpreadsheet,
  importStudentsFromGoogleSheet,
  extractSpreadsheetId,
  getSpreadsheetDetails,
} from '../services/googleSheets';
import { storage } from '../services/storage';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Link as LinkIcon,
  HelpCircle,
  ShieldCheck,
  Check,
  Sparkles,
  School,
  Layers,
  Users,
  BookOpen,
  Award,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleSheetsSyncPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  classrooms?: Classroom[];
  activeClassroom?: Classroom;
  allStudents?: Student[];
  user: User;
  schoolSettings?: SchoolSettings;
  onDataUpdated: () => void;
}

const STORAGE_LAST_SHEET_KEY = 'gradebook_last_synced_sheet_v1';

export const GoogleSheetsSyncPage: React.FC<GoogleSheetsSyncPageProps> = ({
  students,
  subjects,
  allScoreItems,
  allScores,
  terms,
  classroom,
  classrooms = [],
  activeClassroom,
  allStudents = [],
  user,
  schoolSettings,
  onDataUpdated,
}) => {
  // Resolved complete school data
  const resolvedClassrooms = classrooms.length > 0 ? classrooms : storage.getClassrooms();
  const resolvedAllStudents = allStudents.length > 0 ? allStudents : storage.getAllStudents();
  const academicYear = schoolSettings?.academic_year || '2569';
  const schoolName = schoolSettings?.school_name || user.school_name || 'โรงเรียนบ้านป่าส่าน';

  // Google Auth state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sync state
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingCurrent, setIsExportingCurrent] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Scope toggle for updating existing sheet: 'all' = all classrooms, 'current' = current classroom
  const [updateScope, setUpdateScope] = useState<'all' | 'current'>('all');

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Linked spreadsheet state
  const [linkedSheet, setLinkedSheet] = useState<{
    id: string;
    url: string;
    title: string;
    lastSynced?: string;
    type?: 'all' | 'single';
  } | null>(() => {
    const raw = localStorage.getItem(STORAGE_LAST_SHEET_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  // Custom spreadsheet ID / URL input for existing sheet
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [importSheetInput, setImportSheetInput] = useState('');
  const [importRangeInput, setImportRangeInput] = useState('');
  const [importTargetClassroom, setImportTargetClassroom] = useState(classroom);
  const [importedPreview, setImportedPreview] = useState<Omit<Student, 'id'>[]>([]);

  // Init Google Auth listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (fbUser, token) => {
        setGoogleUser(fbUser);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save linked sheet to local storage
  const saveLinkedSheet = (sheet: {
    id: string;
    url: string;
    title: string;
    lastSynced?: string;
    type?: 'all' | 'single';
  }) => {
    setLinkedSheet(sheet);
    localStorage.setItem(STORAGE_LAST_SHEET_KEY, JSON.stringify(sheet));
  };

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setSuccessMsg(`เข้าสู่ระบบ Google สำเร็จ: ${res.user.email}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเข้าสู่ระบบ Google ได้');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Google Sign Out handler
  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setSuccessMsg('ออกจากระบบ Google เรียบร้อยแล้ว');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // 1. PRIMARY HERO ACTION: Export ALL classrooms to a new Google Spreadsheet
  const handleExportAllToGoogleSheets = async () => {
    let token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ก่อนดำเนินการส่งออก');
      return;
    }

    setIsExportingAll(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const title = `สมุดบันทึกคะแนนทุกชั้นเรียน_ปีการศึกษา${academicYear}_${schoolName}`;
      const result = await createAllClassroomsSpreadsheet({
        accessToken: token,
        title,
        classrooms: resolvedClassrooms,
        allStudents: resolvedAllStudents,
        subjects,
        allScoreItems,
        allScores,
        terms,
        schoolName,
        academicYear,
      });

      const newLinked = {
        id: result.spreadsheetId,
        url: result.spreadsheetUrl,
        title,
        lastSynced: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        type: 'all' as const,
      };
      saveLinkedSheet(newLinked);

      setSuccessMsg(
        `สร้างและส่งออก Google Sheet ครบทุกชั้นเรียนสำเร็จ! (${result.classroomsCount} ห้อง, ${result.totalStudents} คน, รวม ${result.sheetsCount} แผ่นงาน)`
      );
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสร้าง Google Sheets: ' + err.message);
    } finally {
      setIsExportingAll(false);
    }
  };

  // Download All Classrooms as Excel (.xlsx) file compatible with Google Sheets & Excel
  const handleDownloadAllExcel = () => {
    setIsDownloadingExcel(true);
    setErrorMsg('');
    try {
      const fileName = `สมุดสรุปผลการเรียนทุกชั้นเรียน_ปีการศึกษา${academicYear}_${schoolName}.xlsx`;
      exportAllClassroomsToExcel({
        classrooms: resolvedClassrooms,
        allStudents: resolvedAllStudents,
        subjects,
        allScoreItems,
        allScores,
        terms,
        schoolName,
        academicYear,
        fileName,
      });
      setSuccessMsg(
        `ดาวน์โหลดไฟล์ ${fileName} สำเร็จ! คุณสามารถนำเข้าหรือเปิดบน Google Sheets ได้ทันที`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel: ' + err.message);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // 2. Export Current Classroom only
  const handleCreateCurrentRoomSheet = async () => {
    let token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ก่อนดำเนินการ');
      return;
    }

    setIsExportingCurrent(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const title = `สมุดบันทึกคะแนน_${classroom}_ปีการศึกษา${academicYear}_${schoolName}`;
      const result = await createClassroomSpreadsheet(
        token,
        title,
        students,
        subjects,
        allScoreItems,
        allScores,
        terms
      );

      const newLinked = {
        id: result.spreadsheetId,
        url: result.spreadsheetUrl,
        title,
        lastSynced: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        type: 'single' as const,
      };
      saveLinkedSheet(newLinked);

      setSuccessMsg(`สร้างและส่งออกข้อมูลห้อง ${classroom} ไปยัง Google Sheets สำเร็จเรียบร้อย!`);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสร้าง Google Sheets: ' + err.message);
    } finally {
      setIsExportingCurrent(false);
    }
  };

  // 3. Sync to Existing / Linked Sheet with Mandatory User Confirmation
  const handleSyncToExisting = async (targetId?: string) => {
    const sheetId = targetId || linkedSheet?.id;
    if (!sheetId) {
      setErrorMsg('กรุณาระบุ URL หรือ ID ของ Google Sheets ที่ต้องการอัปเดต');
      return;
    }

    const scopeText =
      updateScope === 'all'
        ? `ทุกชั้นเรียน (${resolvedClassrooms.length} ห้อง, ${resolvedAllStudents.length} คน)`
        : `เฉพาะห้อง ${classroom} (${students.length} คน)`;

    // MANDATORY confirmation dialog before mutating user-owned data per Workspace guidelines
    const confirmed = window.confirm(
      `คุณต้องการอัปเดตข้อมูลคะแนน ${scopeText} และ ${subjects.length} วิชา ลงใน Google Sheet นี้หรือไม่?\n\nข้อมูลในแผ่นงานจะถูกอัปเดตด้วยคะแนนล่าสุด`
    );
    if (!confirmed) return;

    let token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ก่อนดำเนินการ');
      return;
    }

    setIsUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (updateScope === 'all') {
        const res = await updateExistingSpreadsheetAllClassrooms(
          token,
          sheetId,
          resolvedClassrooms,
          resolvedAllStudents,
          subjects,
          allScoreItems,
          allScores,
          terms,
          schoolName,
          academicYear
        );

        const updated = {
          id: sheetId,
          url: `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(sheetId)}/edit`,
          title: linkedSheet?.title || `Google Sheet คะแนนทุกชั้นเรียน (${schoolName})`,
          lastSynced: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          type: 'all' as const,
        };
        saveLinkedSheet(updated);
        setSuccessMsg(
          `อัปเดตข้อมูลคะแนนทุกชั้นเรียน (${res.sheetsUpdated} แผ่นงาน, นักเรียน ${res.totalStudents} คน) ลงใน Google Sheet สำเร็จเรียบร้อย`
        );
      } else {
        await updateExistingSpreadsheet(
          token,
          sheetId,
          students,
          subjects,
          allScoreItems,
          allScores,
          terms
        );

        const updated = {
          id: sheetId,
          url: `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(sheetId)}/edit`,
          title: linkedSheet?.title || `Google Sheet บันทึกคะแนนห้อง ${classroom}`,
          lastSynced: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          type: 'single' as const,
        };
        saveLinkedSheet(updated);
        setSuccessMsg(`อัปเดตข้อมูลคะแนนห้อง ${classroom} ไปยัง Google Sheet สำเร็จเรียบร้อย`);
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการอัปเดต: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. Read students from Google Sheet for Preview
  const handlePreviewImport = async () => {
    if (!importSheetInput.trim()) {
      setErrorMsg('กรุณาระบุ URL หรือ ID ของ Google Sheet ที่ต้องการนำเข้า');
      return;
    }

    let token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ก่อนดำเนินการ');
      return;
    }

    setIsImporting(true);
    setErrorMsg('');

    try {
      const parsed = await importStudentsFromGoogleSheet(
        token,
        importSheetInput,
        importRangeInput.trim() || 'A1:E60',
        importTargetClassroom
      );

      setImportedPreview(parsed);
      setSuccessMsg(`อ่านข้อมูลนักเรียนได้สำเร็จจำนวน ${parsed.length} คน (ตรวจสอบตัวอย่างด้านล่าง)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอ่านข้อมูลจาก Google Sheet');
      setImportedPreview([]);
    } finally {
      setIsImporting(false);
    }
  };

  // Apply imported students
  const handleConfirmImport = () => {
    if (importedPreview.length === 0) return;

    const confirmed = window.confirm(
      `คุณต้องการนำเข้ารายชื่อนักเรียนจำนวน ${importedPreview.length} คน ลงในระบบห้อง ${importTargetClassroom} ใช่หรือไม่?`
    );
    if (!confirmed) return;

    importedPreview.forEach((stu) => {
      storage.addStudent(stu);
    });

    setSuccessMsg(
      `นำเข้ารายชื่อนักเรียน ${importedPreview.length} คน สู่ห้อง ${importTargetClassroom} เรียบร้อยแล้ว`
    );
    setImportedPreview([]);
    setImportSheetInput('');
    onDataUpdated();
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>ระบบส่งออก Google Sheets (ส่งออกข้อมูลทั้งหมด ทุกชั้น)</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Google Workspace
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                ส่งออกคะแนน ผลการเรียน เกรดเฉลี่ย (GPA) และสถิติของนักเรียนทุกชั้นเรียนและทุกห้องเรียนแบบอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Google Auth Status / Button */}
          <div>
            {googleUser ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-slate-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="text-left text-xs">
                  <div className="font-bold text-slate-800 truncate max-w-[140px]">
                    {googleUser.displayName || 'เชื่อมต่อแล้ว'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                    {googleUser.email}
                  </div>
                </div>
                <button
                  onClick={handleGoogleSignOut}
                  title="ตัดการเชื่อมต่อบัญชี Google"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
                <span>{isSigningIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm flex items-start justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-800">ดำเนินการสำเร็จ</div>
                <div className="text-emerald-700 mt-0.5">{successMsg}</div>
              </div>
            </div>
            {linkedSheet && (
              <a
                href={linkedSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>เปิดดูแผ่นงาน</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* School Data Overview Highlight Strip */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <School className="w-4 h-4 text-emerald-400" />
              <span>ข้อมูลภาพรวมโรงเรียนที่จะถูกส่งออก ({schoolName})</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>ข้อมูลครบถ้วนทั้งโรงเรียน ปีการศึกษา {academicYear}</span>
            </h3>
            <p className="text-xs text-slate-400">
              ระบบส่งออกจะรวบรวมข้อมูลทุกชั้น ทุกห้อง ทุกรายวิชา และสถิติของโรงเรียนลงในเอกสารเดียว
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>ห้องเรียน</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-300 mt-0.5">
                {resolvedClassrooms.length}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>นักเรียนทุกชั้น</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                {resolvedAllStudents.length}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>รายวิชา</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
                {subjects.length}
              </div>
            </div>
          </div>
        </div>

        {/* Class chips */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">ชั้นเรียนที่รวมอยู่:</span>
          {resolvedClassrooms.map((c) => {
            const count = resolvedAllStudents.filter(
              (s) => s.classroom_id === c.id || s.classroom === c.name
            ).length;
            return (
              <span
                key={c.id}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700 font-medium flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>
                  {c.name} ({count} คน)
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Linked Google Spreadsheet Card */}
      {linkedSheet && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Google Sheet ที่เชื่อมต่อล่าสุด</span>
              {linkedSheet.type === 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                  ครบทุกชั้นเรียน
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-base">{linkedSheet.title}</h3>
            <p className="text-xs text-slate-500 font-mono">
              ID: {linkedSheet.id} {linkedSheet.lastSynced && `• ซิงค์ล่าสุดเวลา ${linkedSheet.lastSynced}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCopyLink(linkedSheet.url)}
              className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
            </button>

            <a
              href={linkedSheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-100 rounded-xl border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <span>เปิดใน Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => handleSyncToExisting(linkedSheet.id)}
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'กำลังซิงค์...' : 'ซิงค์คะแนนล่าสุด'}</span>
            </button>
          </div>
        </div>
      )}

      {/* FEATURE 1: HERO - Export ALL Classrooms (ทุกชั้นเรียน) */}
      <div className="bg-gradient-to-b from-white to-emerald-50/30 rounded-2xl p-6 sm:p-7 border-2 border-emerald-500 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wide">
                  แนะนำ • ครบถ้วนทุกชั้น
                </span>
                <span className="text-xs text-slate-400">สร้างเอกสารรวมศูนย์ (Master)</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                1. ส่งออกข้อมูลทั้งหมด ทุกชั้นเรียน (Google Sheets Master Export)
              </h3>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          สร้างเอกสาร Google Spreadsheet ฉบับสมบูรณ์ใน Google Drive บันทึกคะแนนผลการเรียนทุกวิชา
          เกรดเฉลี่ย (GPA) และสถิติของนักเรียนทุกชั้นเรียน (รวมทั้งหมด {resolvedClassrooms.length} ห้อง,{' '}
          {resolvedAllStudents.length} คน) พร้อมแถวสรุปและสถิติเปรียบเทียบในแผ่นงานเดียว
        </p>

        {/* Breakdown of sheets created */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-emerald-200 shadow-2xs space-y-3">
          <div className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>โครงสร้างแผ่นงาน (Tabs) ที่จะถูกสร้างใน Google Sheet:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-700">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">📊 แผ่นงานที่ 1: ภาพรวมทุกชั้นเรียน</span>
              <span className="text-[11px] text-slate-500">
                รวมนักเรียนทุกห้อง {resolvedAllStudents.length} คน พร้อมทุกรายวิชา GPA และสถานะประเมิน
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">
                🏫 แผ่นงานที่ 2..{resolvedClassrooms.length + 1}: แยกรายห้อง
              </span>
              <span className="text-[11px] text-slate-500">
                สร้างแท็บแยกเฉพาะสำหรับแต่ละห้อง ({resolvedClassrooms.map((c) => c.name).join(', ')})
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">📈 สถิติเปรียบเทียบทุกห้อง</span>
              <span className="text-[11px] text-slate-500">
                เปรียบเทียบคะแนนเฉลี่ย, GPA, อัตราเกรด 4, อัตราผ่านเกณฑ์ พร้อมยอดรวมโรงเรียน
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">🎯 สรุปการกระจายเกรดรายวิชา</span>
              <span className="text-[11px] text-slate-500">
                แจกแจงจำนวนนักเรียนที่ได้เกรด 4, 3.5, 3, 2.5, 2, 1.5, 1, 0, ร, มส ทุกวิชา
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">📋 ทะเบียนนักเรียนทุกห้อง</span>
              <span className="text-[11px] text-slate-500">
                ทะเบียนเลขประจำตัว 13 หลัก, เลขที่, เพศ, และครูประจำชั้น
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-700 block">📚 โครงสร้างรายวิชาและหน่วยกิต</span>
              <span className="text-[11px] text-slate-500">
                รหัสวิชา, ชื่อวิชา, น้ำหนักหน่วยกิต, และเกณฑ์คะแนนเต็ม 100
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons for All Classes */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleExportAllToGoogleSheets}
            disabled={isExportingAll}
            className="w-full sm:w-auto flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isExportingAll ? 'animate-spin' : ''}`} />
            <span>
              {isExportingAll
                ? 'กำลังสร้าง Google Sheet ทุกชั้นเรียน...'
                : 'สร้างและส่งออก Google Sheet ทุกชั้นเรียน (Google Drive)'}
            </span>
          </button>

          <button
            onClick={handleDownloadAllExcel}
            disabled={isDownloadingExcel}
            title="ดาวน์โหลดไฟล์รวมทุกแผ่นงาน สามารถนำเข้า Google Sheets หรือเปิดด้วย Excel"
            className="w-full sm:w-auto py-3 px-5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>ดาวน์โหลดไฟล์รวมทุกชั้น (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2 Sub-Columns: Sync to Existing Sheet / Export Single Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Column 1: Sync to Existing Sheet with Scope Toggle */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                2. ซิงค์ / อัปเดตข้อมูลลงใน Google Sheet เดิม
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                อัปเดตคะแนนล่าสุดลงใน Google Spreadsheet ที่สร้างไว้แล้ว โดยไม่สร้างเอกสารใหม่
              </p>
            </div>

            {/* Scope Selection */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">เลือกขอบเขตข้อมูลที่ต้องการอัปเดต:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 ${
                    updateScope === 'all'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="updateScope"
                    checked={updateScope === 'all'}
                    onChange={() => setUpdateScope('all')}
                    className="accent-emerald-600"
                  />
                  <span>ทุกชั้นเรียน ({resolvedClassrooms.length} ห้อง)</span>
                </label>

                <label
                  className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 ${
                    updateScope === 'current'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="updateScope"
                    checked={updateScope === 'current'}
                    onChange={() => setUpdateScope('current')}
                    className="accent-emerald-600"
                  />
                  <span>เฉพาะห้อง {classroom}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ลิงก์หรือ Spreadsheet ID ของ Google Sheet
              </label>
              <input
                type="text"
                value={customSheetInput}
                onChange={(e) => setCustomSheetInput(e.target.value)}
                placeholder="วางลิงก์ https://docs.google.com/spreadsheets/d/... หรือ ID"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            onClick={() => handleSyncToExisting(customSheetInput)}
            disabled={isUpdating || !customSheetInput.trim()}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูลลงใน Sheet นี้'}</span>
          </button>
        </div>

        {/* Column 2: Export Current Classroom only */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                3. ส่งออกเฉพาะห้องปัจจุบัน ({classroom})
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                สร้างเอกสาร Google Sheet แยกสำหรับคุณครูประจำชั้นห้อง {classroom} เท่านั้น
                (บันทึกเฉพาะนักเรียน {students.length} คน ในห้องนี้)
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">ข้อมูลห้อง {classroom}:</div>
              <div>• แผ่นงานสรุปผลการเรียน: {students.length} คน ทุกรายวิชา</div>
              <div>• แผ่นงานรายชื่อนักเรียนห้อง {classroom}</div>
            </div>
          </div>

          <button
            onClick={handleCreateCurrentRoomSheet}
            disabled={isExportingCurrent}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {isExportingCurrent
                ? 'กำลังสร้าง Google Sheet...'
                : `สร้าง Google Sheet เฉพาะห้อง ${classroom}`}
            </span>
          </button>
        </div>
      </div>

      {/* Import Students Section from Google Sheets */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Upload className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-base">
            4. นำเข้ารายชื่อนักเรียนจาก Google Sheet เข้าสู่ระบบ
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          ดึงรายชื่อนักเรียนจาก Google Sheet ของโรงเรียนเพื่อนำเข้าสู่ระบบได้ทันที
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ลิงก์หรือ Spreadsheet ID ของ Google Sheet
            </label>
            <input
              type="text"
              value={importSheetInput}
              onChange={(e) => setImportSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              นำเข้าสู่ห้องเรียน
            </label>
            <select
              value={importTargetClassroom}
              onChange={(e) => setImportTargetClassroom(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              {resolvedClassrooms.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ช่วงเซลล์ (เช่น A1:E60)
            </label>
            <input
              type="text"
              value={importRangeInput}
              onChange={(e) => setImportRangeInput(e.target.value)}
              placeholder="A1:E60"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePreviewImport}
            disabled={isImporting || !importSheetInput.trim()}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'กำลังอ่านข้อมูล...' : 'อ่านและดูตัวอย่างรายชื่อ'}</span>
          </button>
        </div>

        {/* Preview of Imported Students */}
        {importedPreview.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                รายชื่อนักเรียนที่อ่านได้ ({importedPreview.length} คน) เพื่อนำเข้าสู่ห้อง{' '}
                <span className="text-emerald-700 font-extrabold">{importTargetClassroom}</span>:
              </span>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-all text-xs cursor-pointer"
              >
                ยืนยันการนำเข้าสู่ห้อง {importTargetClassroom}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-center">เลขที่</th>
                    <th className="py-2 px-3">ชื่อ - นามสกุล</th>
                    <th className="py-2 px-3">เลขประจำตัว</th>
                    <th className="py-2 px-3 text-center">เพศ</th>
                    <th className="py-2 px-3 text-center">ห้อง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedPreview.map((stu, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 text-center font-bold text-slate-600">
                        {stu.student_no}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{stu.name}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{stu.student_code}</td>
                      <td className="py-1.5 px-3 text-center text-slate-600">
                        {stu.gender || 'ชาย'}
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-600">{stu.classroom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
