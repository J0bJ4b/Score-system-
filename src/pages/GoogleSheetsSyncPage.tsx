import React, { useState, useEffect } from 'react';
import { Student, Subject, ScoreItem, Score, Term, User } from '../types';
import {
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
  initGoogleAuth,
} from '../services/googleAuth';
import {
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
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleSheetsSyncPageProps {
  students: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  classroom: string;
  user: User;
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
  user,
  onDataUpdated,
}) => {
  // Google Auth state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sync state
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Linked spreadsheet state
  const [linkedSheet, setLinkedSheet] = useState<{
    id: string;
    url: string;
    title: string;
    lastSynced?: string;
  } | null>(() => {
    const raw = localStorage.getItem(STORAGE_LAST_SHEET_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  // Custom spreadsheet ID / URL input for existing sheet
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [importSheetInput, setImportSheetInput] = useState('');
  const [importRangeInput, setImportRangeInput] = useState('');
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
  const saveLinkedSheet = (sheet: { id: string; url: string; title: string; lastSynced?: string }) => {
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

  // 1. Create New Google Spreadsheet
  const handleCreateNewSheet = async () => {
    let token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ก่อนดำเนินการ');
      return;
    }

    setIsExporting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const title = `สมุดบันทึกคะแนน_${classroom}_ปีการศึกษา2569_${user.school_name || 'โรงเรียน'}`;
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
      };
      saveLinkedSheet(newLinked);

      setSuccessMsg('สร้างและส่งออกข้อมูลไปยัง Google Sheets สำเร็จเรียบร้อย!');
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสร้าง Google Sheets: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Sync to Existing / Linked Sheet with Mandatory User Confirmation
  const handleSyncToExisting = async (targetId?: string) => {
    const sheetId = targetId || linkedSheet?.id;
    if (!sheetId) {
      setErrorMsg('กรุณาระบุ URL หรือ ID ของ Google Sheets ที่ต้องการอัปเดต');
      return;
    }

    // MANDATORY confirmation dialog before mutating user-owned data per Workspace guidelines
    const confirmed = window.confirm(
      `คุณต้องการอัปเดตคะแนนทั้งหมด (${students.length} คน, ${subjects.length} วิชา) ลงใน Google Sheet นี้หรือไม่?\n\nข้อมูลในแผ่นงานจะถูกอัปเดตด้วยคะแนนล่าสุด`
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
        title: linkedSheet?.title || 'Google Spreadsheet บันทึกคะแนน',
        lastSynced: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      saveLinkedSheet(updated);

      setSuccessMsg('อัปเดตข้อมูลคะแนนไปยัง Google Sheet สำเร็จเรียบร้อย');
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการอัปเดต: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Read students from Google Sheet for Preview
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
        classroom
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
      `คุณต้องการนำเข้ารายชื่อนักเรียนจำนวน ${importedPreview.length} คน ลงในระบบใช่หรือไม่?`
    );
    if (!confirmed) return;

    importedPreview.forEach((stu) => {
      storage.addStudent(stu);
    });

    setSuccessMsg(`นำเข้ารายชื่อนักเรียน ${importedPreview.length} คน เรียบร้อยแล้ว`);
    setImportedPreview([]);
    setImportSheetInput('');
    onDataUpdated();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>เชื่อมต่อ Google Sheets</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Google Workspace
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                ซิงค์คะแนนนักเรียนและรายวิชาไปยัง Google Drive และ Google Sheets ได้โดยตรง
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
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
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
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isSigningIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Linked Google Spreadsheet Card */}
      {linkedSheet && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Google Sheet ที่เชื่อมต่ออยู่ขณะนี้</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base">{linkedSheet.title}</h3>
            <p className="text-xs text-slate-500 font-mono">
              ID: {linkedSheet.id} {linkedSheet.lastSynced && `• ซิงค์ล่าสุดเวลา ${linkedSheet.lastSynced}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={linkedSheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-100 rounded-xl border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <span>เปิดดูใน Google Sheets</span>
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

      {/* 2 Main Action Columns: Export to Sheets / Import from Sheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Column 1: Export to Google Sheets */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                1. สร้าง Google Sheet บันทึกคะแนนใหม่
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                สร้างเอกสาร Google Spreadsheet ใหม่ใน Google Drive ของคุณ บันทึกคะแนนทั้ง 10 วิชา รายชื่อนักเรียน และคะแนนสรุปเทอม 1-2 พร้อมสูตรคำนวณและเกรด
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">ข้อมูลที่จะถูกส่งออก:</div>
              <div>• แผ่นงานที่ 1: สรุปผลการเรียน 10 วิชา, เกรด, GPA (นักเรียน {students.length} คน)</div>
              <div>• แผ่นงานที่ 2: รายชื่อนักเรียนห้อง {classroom} พร้อมเลขประจำตัว</div>
            </div>
          </div>

          <button
            onClick={handleCreateNewSheet}
            disabled={isExporting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'กำลังสร้าง Google Sheet...' : 'สร้างและส่งออกเป็น Google Sheet ใหม่'}</span>
          </button>
        </div>

        {/* Column 2: Sync to Existing Sheet */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                2. ซิงค์ไปยัง Google Sheet เดิมที่มีอยู่
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                วางลิงก์หรือ Spreadsheet ID ของ Google Sheet เดิมที่ต้องการอัปเดตข้อมูลคะแนนล่าสุด
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ลิงก์หรือ Spreadsheet ID
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
      </div>

      {/* Import Students Section from Google Sheets */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Upload className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-base">
            3. นำเข้ารายชื่อนักเรียนจาก Google Sheet
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          สามารถดึงรายชื่อนักเรียนจาก Google Sheet ของโรงเรียนมาใส่ในห้องเรียนได้ทันที
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              ชื่อแผ่นงาน / ช่วงเซลล์ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={importRangeInput}
              onChange={(e) => setImportRangeInput(e.target.value)}
              placeholder="เช่น Sheet1 หรือ A1:E50"
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
                รายชื่อนักเรียนที่อ่านได้ ({importedPreview.length} คน):
              </span>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-all text-xs"
              >
                ยืนยันการนำเข้าสู่ระบบ
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
                      <td className="py-1.5 px-3 font-semibold text-slate-800">
                        {stu.name}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-slate-500">
                        {stu.student_code}
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-600">
                        {stu.gender || 'ชาย'}
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-600">
                        {stu.classroom}
                      </td>
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
