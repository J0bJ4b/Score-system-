import React, { useState } from 'react';
import {
  School,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Award,
  ChevronRight,
} from 'lucide-react';
import { storage } from '../services/storage';
import { User, Student } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onStudentLogin?: (student: Student) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onStudentLogin,
}) => {
  // Teacher Form State
  const [username, setUsername] = useState('kru.somsri');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Student Search State (No login required)
  const [studentCode, setStudentCode] = useState('');
  const [studentError, setStudentError] = useState('');

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const user = storage.login(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ทดลองใช้: kru.somsri / 1234)');
        setLoading(false);
      }
    }, 200);
  };

  const handleQuickDemoTeacher = () => {
    setUsername('kru.somsri');
    setPassword('1234');
    const user = storage.login('kru.somsri', '1234');
    if (user) {
      onLoginSuccess(user);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const query = studentCode.trim().toLowerCase();
    if (!query) {
      setStudentError('กรุณากรอกรหัสประจำตัวนักเรียน');
      return;
    }

    const allStudents = storage.getAllStudents();
    const found = allStudents.find(
      (s) =>
        (s.student_code && s.student_code.toLowerCase() === query) ||
        s.student_code === query.padStart(5, '0') ||
        s.name.toLowerCase().includes(query)
    );

    if (found) {
      if (onStudentLogin) {
        onStudentLogin(found);
      }
    } else {
      setStudentError(`ไม่พบข้อมูลนักเรียนสำหรับ "${studentCode}" กรุณาตรวจสอบรหัสอีกครั้ง หรือคลิกเลือกตัวอย่างด้านล่าง`);
    }
  };

  const handleQuickStudentSelect = (code: string) => {
    setStudentCode(code);
    const allStudents = storage.getAllStudents();
    const found = allStudents.find((s) => s.student_code === code);
    if (found && onStudentLogin) {
      onStudentLogin(found);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-['Sarabun',sans-serif]">
      {/* Background radial glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      {/* Top Banner / School Branding */}
      <header className="relative z-10 max-w-6xl w-full mx-auto text-center pt-2 pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs sm:text-sm font-medium mb-3 shadow-inner">
          <School className="w-4 h-4 text-sky-300" />
          <span>โรงเรียนประถมศึกษาพัฒนาการศึกษา • ประจำปีการศึกษา 2568</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          ระบบบริหารจัดการคะแนนและผลการเรียน
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto mt-2 leading-relaxed">
          บริการข้อมูลผลการเรียนสำหรับนักเรียน ผู้ปกครอง และระบบบันทึกคะแนนสะสมสำหรับครูประจำชั้น
        </p>
      </header>

      {/* Main Content: Two Distinct Clearly-Separated Sections */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Section 1: นักเรียน / ผู้ปกครอง - ตรวจสอบคะแนนโดยไม่ต้องเข้าสู่ระบบ */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col transition-all hover:shadow-indigo-500/10">
            {/* Header with vibrant student banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 p-6 sm:p-7 text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold mb-1">
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <span>ไม่ต้องเข้าสู่ระบบ (ไม่ต้องใช้รหัสผ่าน)</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      ตรวจสอบคะแนนนักเรียน
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-indigo-100 text-xs sm:text-sm mt-3 leading-relaxed">
                สำหรับนักเรียนและผู้ปกครอง เพียงกรอกรหัสประจำตัวนักเรียน 5 หลัก เพื่อดูคะแนนเก็บ 2 ภาคเรียน ผลสอบกลางภาค-ปลายภาค และเกรดสะสมได้ทันที
              </p>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    รหัสประจำตัวนักเรียน (5 หลัก) หรือชื่อนักเรียน:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => {
                        setStudentCode(e.target.value);
                        if (studentError) setStudentError('');
                      }}
                      placeholder="กรอกรหัสนักเรียน เช่น 50101, 60101"
                      autoFocus
                      required
                      className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg font-bold font-mono tracking-wider bg-slate-50 border-2 border-indigo-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-slate-800 placeholder:text-slate-400 placeholder:text-sm placeholder:font-normal shadow-xs"
                    />
                  </div>
                </div>

                {studentError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{studentError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Search className="w-4 h-4" />
                  <span>เข้าดูคะแนนนักเรียนทันที</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Sample Quick-Click Buttons */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>หรือคลิกเลือกตัวอย่างรหัส เพื่อทดสอบดูผลคะแนนทันที:</span>
                  </span>
                  <span className="text-[11px] text-indigo-600 font-semibold">1-Click Test</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickStudentSelect('50101')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700 text-xs group-hover:text-indigo-900">50101</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100/70 text-indigo-700 font-semibold">ป.5/1</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">ด.ช.กฤษณะ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStudentSelect('50107')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700 text-xs group-hover:text-amber-800">50107</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">ป.5/1</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">ด.ช.วรพล (ขาดสอบ)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStudentSelect('60101')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-700 text-xs group-hover:text-sky-900">60101</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">ป.6/1</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">ด.ช.กิตติศักดิ์</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStudentSelect('60108')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-700 text-xs group-hover:text-emerald-900">60108</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">ป.6/1</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">ด.ญ.กมลวรรณ</div>
                  </button>
                </div>
              </div>

              {/* What students will see preview */}
              <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs">
                <div className="flex flex-col items-center">
                  <BookOpen className="w-4 h-4 text-indigo-600 mb-1" />
                  <span className="text-slate-600 font-medium text-[11px]">คะแนนเก็บ 2 เทอม</span>
                </div>
                <div className="flex flex-col items-center">
                  <Award className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-slate-600 font-medium text-[11px]">ผลสอบกลาง/ปลายภาค</span>
                </div>
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-slate-600 font-medium text-[11px]">พิมพ์รายงาน ปพ.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: คุณครูประจำชั้น - เข้าสู่ระบบเพื่อจัดการคะแนน */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col justify-between transition-all hover:shadow-slate-500/10">
            {/* Teacher Header */}
            <div className="bg-slate-900 p-6 sm:p-7 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                    สำหรับบุคลากร
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold mt-0.5">
                    เข้าสู่ระบบครูประจำชั้น
                  </h2>
                </div>
              </div>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                เข้าใช้งานเพื่อกรอกคะแนนสะสม จัดการนักเรียน คำนวณเกรด และออกรายงานผล
              </p>
            </div>

            {/* Teacher Form */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อผู้ใช้งาน (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="เช่น kru.somsri"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      รหัสผ่าน (Password)
                    </label>
                    <span className="text-[11px] text-slate-400">รหัสผ่าน: 1234</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="รหัสผ่าน"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบครูประจำชั้น'}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoTeacher}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                  >
                    <span>🚀 เข้าสู่ระบบทันที (บัญชีครูสมศรี ป.5/1 & ป.6/1)</span>
                  </button>
                </div>
              </form>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>สิทธิ์การใช้งานของครู:</span>
                </div>
                <p className="text-slate-500">
                  สลับห้องเรียน ป.5/1 - ป.6/1, กรอกคะแนน, Export Excel, เชื่อมต่อ Google Sheets
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-6 pb-2 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 mt-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ระบบประมวลผลคะแนนและตัดเกรดมาตรฐานกระทรวงศึกษาธิการ</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>อัปเดตข้อมูล Real-time</span>
          <span>•</span>
          <span>รองรับ 2 ภาคเรียน (เทอม 1-2)</span>
        </div>
      </footer>
    </div>
  );
};
