import React, { useState } from 'react';
import { School, Lock, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('kru.somsri');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
    }, 250);
  };

  const handleQuickDemo = () => {
    setUsername('kru.somsri');
    setPassword('1234');
    const user = storage.login('kru.somsri', '1234');
    if (user) {
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 p-6 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
              <School className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">ระบบบันทึกคะแนนนักเรียน</h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1">
              ระดับชั้นประถมศึกษาปีที่ 5-6 (สำหรับครูประจำชั้น)
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8">
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ข้อมูลทดสอบพร้อมใช้:</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  ครูสมศรี จิตเมตตา (ชั้น ป.5/1) — มีข้อมูลนักเรียน 20 คนและคะแนนตัวอย่างพร้อมให้ทดสอบ
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น kru.somsri"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                  <span>รหัสผ่านเริ่มต้น: 1234</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  🚀 เข้าสู่ระบบทันที (บัญชีครูสมศรี ป.5/1)
                </button>
              </div>
            </form>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center text-xs text-slate-500">
            ระบบออกแบบเพื่อครูประจำชั้นโรงเรียนประถมศึกษาขนาดเล็ก • ใช้งานง่าย ข้อมูลปลอดภัย
          </div>
        </div>
      </div>
    </div>
  );
};
