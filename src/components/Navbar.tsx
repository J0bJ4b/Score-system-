import React from 'react';
import { User, Term, Classroom } from '../types';
import {
  School,
  UserCircle,
  LogOut,
  Calendar,
  Layers,
  Settings,
  Plus,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';

interface NavbarProps {
  user: User;
  currentTerm: Term;
  terms: Term[];
  onSelectTerm: (term: Term) => void;
  classrooms: Classroom[];
  activeClassroom: Classroom;
  onSelectClassroom: (classroom: Classroom) => void;
  onOpenClassroomManager: () => void;
  onOpenStudentPortal?: () => void;
  onLogout: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentTerm,
  terms,
  onSelectTerm,
  classrooms,
  activeClassroom,
  onSelectClassroom,
  onOpenClassroomManager,
  onOpenStudentPortal,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                {user.school_name || 'โรงเรียนประถมศึกษา'}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>ระบบบันทึกคะแนนนักเรียน</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>ระดับชั้น ป.5-6</span>
              </p>
            </div>
          </div>

          {/* Center: Classroom Switcher Dropdown (Highlighted) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center bg-indigo-50/90 border border-indigo-200 rounded-xl p-1 shadow-2xs">
              <div className="flex items-center gap-1 px-2 text-xs font-bold text-indigo-900">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">ห้องเรียน:</span>
              </div>

              <select
                value={activeClassroom?.id || ''}
                onChange={(e) => {
                  const target = classrooms.find((c) => c.id === e.target.value);
                  if (target) onSelectClassroom(target);
                }}
                className="bg-white border border-indigo-300 text-indigo-900 font-extrabold text-xs sm:text-sm rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    ห้อง {c.name} ({c.level})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onOpenClassroomManager}
                title="จัดการห้องเรียน / เพิ่มห้องเรียนใหม่"
                className="p-1 sm:px-2 py-1 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">จัดการห้อง</span>
              </button>
            </div>

            {onOpenStudentPortal && (
              <button
                type="button"
                onClick={onOpenStudentPortal}
                title="เข้าสู่ระบบดูคะแนนสำหรับนักเรียน (Student Portal)"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-200 shadow-2xs cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>มุมมองนักเรียน</span>
              </button>
            )}
          </div>

          {/* Right: Quick Term Switcher & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Term Selector */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1 px-2 text-xs font-medium text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>ภาคเรียน:</span>
              </div>
              {terms.map((term) => {
                const isActive = term.id === currentTerm.id;
                return (
                  <button
                    key={term.id}
                    onClick={() => onSelectTerm(term)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>

            {/* Teacher Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right max-w-[180px]">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{user.full_name}</span>
                  {user.provider === 'google' && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-50 text-red-600 border border-red-200" title="เข้าสู่ระบบด้วย Gmail">
                      Gmail
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 truncate">
                  {user.email || 'ครูประจำชั้น'}
                </span>
              </div>
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.full_name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                  <UserCircle className="w-6 h-6" />
                </div>
              )}
              <button
                onClick={onLogout}
                title="ออกจากระบบ"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
