import React from 'react';
import {
  PenLine,
  LayoutDashboard,
  FileSpreadsheet,
  Printer,
  Users,
  BookOpen,
  Database,
  HelpCircle,
  GraduationCap,
  Award,
} from 'lucide-react';

export type NavTab =
  | 'score-entry'
  | 'dashboard'
  | 'subject-summary'
  | 'individual-report'
  | 'certificates'
  | 'students'
  | 'subjects'
  | 'google-sheets'
  | 'backup'
  | 'student-portal';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  studentCount: number;
  subjectCount: number;
  classroomName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  studentCount,
  subjectCount,
  classroomName,
}) => {
  const menuItems = [
    {
      id: 'score-entry' as NavTab,
      label: 'กรอกคะแนน',
      sublabel: `บันทึกคะแนน ${classroomName || ''}`,
      icon: PenLine,
      highlight: true,
      badge: 'หน้าหลัก',
    },
    {
      id: 'dashboard' as NavTab,
      label: 'ภาพรวมห้องเรียน',
      sublabel: 'สถิติและผลการเรียน',
      icon: LayoutDashboard,
    },
    {
      id: 'subject-summary' as NavTab,
      label: 'สรุปผลรายวิชา',
      sublabel: 'ตัดเกรด เทอม 1-2',
      icon: FileSpreadsheet,
    },
    {
      id: 'individual-report' as NavTab,
      label: 'รายงานรายบุคคล / ปพ.5',
      sublabel: 'พิมพ์แจกผู้ปกครอง',
      icon: Printer,
    },
    {
      id: 'certificates' as NavTab,
      label: 'ออกเกียรติบัตร',
      sublabel: 'ใบประกาศนียบัตรนักเรียน',
      icon: Award,
      badge: 'ระบบ 4',
    },
    {
      id: 'students' as NavTab,
      label: 'จัดการนักเรียน',
      sublabel: `${studentCount} คนในห้อง ${classroomName || ''}`,
      icon: Users,
    },
    {
      id: 'subjects' as NavTab,
      label: 'วิชาและสัดส่วนคะแนน',
      sublabel: `${subjectCount} วิชา (50 คะแนน/เทอม)`,
      icon: BookOpen,
    },
    {
      id: 'google-sheets' as NavTab,
      label: 'เชื่อมต่อ Google Sheets',
      sublabel: 'ซิงค์และนำเข้าข้อมูล',
      icon: FileSpreadsheet,
      badge: 'ใหม่',
    },
    {
      id: 'student-portal' as NavTab,
      label: 'ระบบดูคะแนนนักเรียน',
      sublabel: 'มุมมองนักเรียน / ผู้ปกครอง',
      icon: GraduationCap,
      badge: 'บริการ',
    },
    {
      id: 'backup' as NavTab,
      label: 'สำรองและกู้คืนข้อมูล',
      sublabel: 'Export/Import ข้อมูล',
      icon: Database,
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white border-r border-slate-200 shrink-0 p-3 lg:p-4 no-print flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          เมนูการทำงาน
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : item.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.highlight
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-snug flex items-center gap-1.5">
                      {item.label}
                      {item.badge && !isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Teacher Assistant Hint Box */}
      <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span>คำแนะนำสำหรับคุณครู</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-500">
          แต่ละเทอมคิดคะแนนเต็ม 50 คะแนน รวม 2 เทอมเป็น 100 คะแนน ตัดเกรด 0-4 อัตโนมัติ สามารถกดพิมพ์รายงาน ปพ.5 ได้ทันที
        </p>
      </div>
    </aside>
  );
};
