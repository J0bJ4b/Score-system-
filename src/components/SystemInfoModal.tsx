import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  CreditCard,
  Printer,
  ShieldCheck,
  Moon,
  Upload,
  Award,
  CheckCircle2,
  Clock,
  Tag,
  GitBranch,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'features' | 'changelog';
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'features',
}) => {
  const [activeTab, setActiveTab] = useState<'features' | 'changelog'>(defaultTab);

  if (!isOpen) return null;

  const features = [
    {
      category: '1. ระบบพอร์ทัลนักเรียน & ผู้ปกครอง',
      color: 'from-sky-500 to-indigo-600',
      icon: CreditCard,
      items: [
        {
          title: 'ค้นหาด้วยเลขบัตรประชาชน 13 หลัก',
          desc: 'นักเรียนและผู้ปกครองเพียงกรอกเลขบัตร ปชช. (หรือชื่อ-สกุล) ก็เข้าดูผลคะแนนเก็บและเกรดสะสมได้ทันที ไม่ต้องมีรหัสผ่าน',
          badge: 'อัปเดตใหม่',
        },
        {
          title: 'ระบบจัดรูปแบบเลขบัตรอัตโนมัติ (Auto-Format)',
          desc: 'พิมพ์ตัวเลขแล้วระบบจะใส่เครื่องหมายขีด X-XXXX-XXXXX-XX-X พร้อมตรวจนับ 13 หลักครบถ้วน',
        },
        {
          title: 'กราฟพัฒนาการ & รายละเอียดรายวิชา',
          desc: 'แสดงคะแนนเก็บ 2 เทอม กลางภาค ปลายภาค พร้อมคะแนนเฉลี่ยร้อยละ และกราฟแท่งเปรียบเทียบผลการเรียน',
        },
      ],
    },
    {
      category: '2. การนำเข้าข้อมูลนักเรียน & DMC สพฐ.',
      color: 'from-emerald-500 to-teal-600',
      icon: Upload,
      items: [
        {
          title: 'แก้ปัญหาภาษามั่ว / ภาษาต่างดาว 100%',
          desc: 'ระบบมีตัวถอดรหัส Windows-874 / TIS-620 อัจฉริยะ ลากไฟล์ Excel/CSV จาก DMC มาวาง ข้อมูลภาษาไทยอ่านได้ถูกต้องทันที',
          badge: 'ยอดนิยม',
        },
        {
          title: 'Smart Paste วางรายชื่อจาก Excel',
          desc: 'สามารถ Copy ข้อมูลนักเรียนจากไฟล์เดิมมาวางในระบบได้ ตรวจจับชื่อ-สกุล เลขที่ และเลข ปชช. ให้อัตโนมัติ',
        },
        {
          title: 'รองรับหลายห้องเรียน',
          desc: 'ครูสามารถจัดการและสลับห้องเรียนได้คล่องตัว เช่น ป.5/1, ป.6/1 พร้อมจัดเก็บข้อมูลแยกห้องอย่างเป็นระเบียบ',
        },
      ],
    },
    {
      category: '3. การบันทึกคะแนนและตัดเกรดอัตโนมัติ',
      color: 'from-amber-500 to-orange-600',
      icon: BookOpen,
      items: [
        {
          title: 'รองรับ 2 ภาคเรียน (เทอม 1 และ เทอม 2)',
          desc: 'บันทึกคะแนนเก็บระหว่างภาค, สอบกลางภาค และปลายภาค ทั้ง 2 เทอม คำนวณเกรดรวมทั้งปีการศึกษาอัตโนมัติ',
        },
        {
          title: 'ตัดเกรดมาตรฐาน 8 ระดับ (0 - 4)',
          desc: 'คำนวณตัดเกรด 4, 3.5, 3, 2.5, 2, 1.5, 1, 0 ตามระเบียบการวัดผลกระทรวงศึกษาธิการอย่างแม่นยำ',
        },
        {
          title: 'ระบบบันทึกการสอนซ่อมเสริม (Remedial Tracking)',
          desc: 'ติดตามและบันทึกผลการสอบแก้ตัวสำหรับนักเรียนที่ขาดสอบหรือติด ร / 0 ปรับคะแนนผ่านเกณฑ์เข้าสู่ระบบทันที',
        },
      ],
    },
    {
      category: '4. เอกสารทางการศึกษา & สิ่งพิมพ์ (Print-Ready)',
      color: 'from-indigo-500 to-purple-600',
      icon: Printer,
      items: [
        {
          title: 'สมุด ปพ.5 สมบูรณ์แบบ',
          desc: 'ส่งออกและสั่งพิมพ์เอกสาร ปพ.5 แสดงคะแนน 2 ภาคเรียน พร้อมหน้าสรุปผลการเรียนและสถิติส่งฝ่ายวิชาการ',
          badge: 'ครบมาตรฐาน',
        },
        {
          title: 'ใบ ปพ.6 แสดงผลการเรียนรายบุคคล (A4)',
          desc: 'จัดเลย์เอาต์ทางการ ขนาด A4 สวยงาม พร้อมตราประจำโรงเรียนและช่องลงนามผู้บริหาร/ครูประจำชั้น',
        },
        {
          title: 'บัตรประจำตัวนักเรียนพร้อม QR Code',
          desc: 'พิมพ์บัตรนักเรียนขนาดมาตรฐาน มี QR Code ประจำตัว สแกนแล้วเปิดดูผลการเรียนของนักเรียนคนนั้นได้ทันที',
        },
        {
          title: 'เกียรติบัตรเรียนดีและคุณธรรม',
          desc: 'ออกเกียรติบัตรอัตโนมัติสำหรับนักเรียนผลการเรียนดีเด่น (เกรด 3.50 ขึ้นไป) พร้อมเลือกสีกรอบและข้อความได้',
        },
      ],
    },
    {
      category: '5. ความปลอดภัย & ความสะดวกในการทำงาน',
      color: 'from-rose-500 to-pink-600',
      icon: ShieldCheck,
      items: [
        {
          title: 'แยกข้อมูลครูอิสระ 100% ต่อบัญชี (Isolated Data)',
          desc: 'แต่ละบัญชีจะมีฐานข้อมูลแยกขาดจากกัน ครูแต่ละท่านแก้ไขเฉพาะห้องที่ตนเองรับผิดชอบ ข้อมูลไม่ปะปนกัน',
        },
        {
          title: 'โหมดกลางคืน (Night / Dark Mode) ถนอมสายตา',
          desc: 'สลับโหมดมืดได้ในคลิกเดียว ช่วยลดแสงสะท้อนเวลาตัดเกรดดึกๆ และระบบ Print-Safe คงพื้นหลังสีขาวตอนพิมพ์',
          badge: 'มาใหม่',
        },
        {
          title: 'เชื่อมต่อคลาวด์ Real-time + ทำงานออฟไลน์ได้',
          desc: 'ซิงค์ข้อมูลขึ้นคลาวด์อัตโนมัติ และมีระบบแคชในเครื่อง หากเน็ตหลุดข้อมูลก็ไม่สูญหาย',
        },
      ],
    },
  ];

  const changelog = [
    {
      version: 'v2.6.0',
      date: '30 กันยายน 2569',
      highlight: 'เพิ่มโหมดกลางคืน (Dark Mode) และตรวจผลการเรียนด้วยเลขบัตรประชาชน 13 หลัก',
      badge: 'เวอร์ชันล่าสุด',
      changes: [
        { type: 'new', text: 'เพิ่มระบบเปิด-ปิดโหมดกลางคืน (Night / Dark Mode Toggle) สลับธีมได้ทันทีและถนอมสายตา' },
        { type: 'new', text: 'ปรับหน้าแรกให้ค้นหาผลการเรียนด้วยเลขประจำตัวประชาชน 13 หลัก (บนบัตรประชาชน) พร้อมระบบ Auto-formatting' },
        { type: 'new', text: 'เพิ่มหน้าต่างแนะนำความสามารถของระบบ (Features) และบันทึกประวัติการอัปเดต (Changelog)' },
        { type: 'improved', text: 'ปรับปรุงฟุตเตอร์หน้าแรก เพิ่มข้อมูลผู้พัฒนา: นายศุภวัฒน์ เมืองสิม' },
        { type: 'fixed', text: 'ปรับระบบ Print-Safe ให้คงพื้นขาวสะอาด 100% เมื่อพิมพ์เอกสาร ปพ.5, ปพ.6, เกียรติบัตร และบัตรนักเรียน แม้เปิดโหมดมืดอยู่' },
      ],
    },
    {
      version: 'v2.5.0',
      date: '28 กันยายน 2569',
      highlight: 'ระบบถอดรหัส DMC อัตโนมัติ แก้ภาษาต่างดาว 100% และบัตรนักเรียน QR Code',
      changes: [
        { type: 'new', text: 'ระบบนำเข้าไฟล์ DMC สพฐ. ถอดรหัส Windows-874 / TIS-620 แก้ปัญหาสระลอยและภาษาต่างดาว 100%' },
        { type: 'new', text: 'ระบบออกบัตรประจำตัวนักเรียน (Student ID Cards) พร้อม QR Code สแกนดูผลคะแนน' },
        { type: 'new', text: 'ระบบออกเกียรติบัตรนักเรียนผลการเรียนดีเด่น (GPA 3.50+) และเกียรติบัตรคุณธรรม' },
        { type: 'improved', text: 'ปรับปรุงหน้าต่าง Smart Paste ให้จัดกลุ่มคอลัมน์ชื่อ-สกุล เลขที่ และเลขประจำตัวได้แม่นยำขึ้น' },
      ],
    },
    {
      version: 'v2.4.0',
      date: '20 กันยายน 2569',
      highlight: 'สมุด ปพ.5 ครบ 2 เทอม และใบ ปพ.6 รายบุคคลมาตรฐานกระทรวงฯ',
      changes: [
        { type: 'new', text: 'รายงาน ปพ.5 สมบูรณ์แบบ รวมคะแนนสะสมทั้งปี (เทอม 1-2) และหน้าสรุปผลสัมฤทธิ์' },
        { type: 'new', text: 'ใบ ปพ.6 แบบเดี่ยว A4 รองรับตราโรงเรียน ลายเซ็นครูประจำชั้น และลายเซ็นผู้อำนวยการ' },
        { type: 'new', text: 'ระบบบันทึกการสอนซ่อมเสริม (Remedial Tracking) จัดการนักเรียนติด 0 หรือขาดสอบ' },
        { type: 'improved', text: 'ระบบคำนวณตัดเกรด 8 ระดับ (0, 1, 1.5, 2, 2.5, 3, 3.5, 4) อัตโนมัติ' },
      ],
    },
    {
      version: 'v2.3.0',
      date: '15 กันยายน 2569',
      highlight: 'ระบบความปลอดภัยระดับบัญชี (Multi-tenant) และซิงค์ Google Sheets',
      changes: [
        { type: 'new', text: 'ระบบแยกข้อมูลครูอิสระ 100% ต่อบัญชี (User-isolated storage) ป้องกันข้อมูลปะปนกัน' },
        { type: 'new', text: 'รองรับการเข้าสู่ระบบผ่านบัญชี Google Account (Gmail) ด้วย Firebase Auth' },
        { type: 'new', text: 'เชื่อมต่อและซิงค์ข้อมูลกับ Google Sheets สองทาง (Two-way Sync)' },
        { type: 'improved', text: 'เพิ่มความเร็วในการประมวลผลคะแนนและกราฟแท่งแบบเรียลไทม์' },
      ],
    },
    {
      version: 'v2.0.0',
      date: '1 กันยายน 2569',
      highlight: 'เปิดตัวระบบบริหารจัดการคะแนนและผลการเรียนเวอร์ชันใหม่',
      changes: [
        { type: 'new', text: 'เปิดตัวโครงสร้างระบบตัดเกรด 2 ภาคเรียน พร้อมฐานข้อมูลคลาวด์ Firebase' },
        { type: 'new', text: 'พอร์ทัลตรวจคะแนนสำหรับนักเรียนและผู้ปกครอง' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn font-['Sarabun',sans-serif]">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  ข้อมูลและความสามารถของระบบ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold border border-indigo-400/30">
                  v2.6.0
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                ระบบบริหารจัดการคะแนนและผลการเรียนสำหรับคุณครูและนักเรียน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>ความสามารถของระบบ (Features)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'changelog'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>ประวัติการอัปเดต (Changelog)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
              ใหม่
            </span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'features' ? (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      ระบบออกแบบมาเพื่อลดภาระงานวัดผลของคุณครู 100%
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      ครอบคลุมตั้งแต่นำเข้ารายชื่อนักเรียน บันทึกคะแนน ตัดเกรดอัตโนมัติ จนถึงออกเอกสาร ปพ. ครบชุด
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Grid Categories */}
              <div className="space-y-6">
                {features.map((cat, idx) => {
                  const CatIcon = cat.icon;
                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cat.color} text-white flex items-center justify-center shadow-xs`}
                        >
                          <CatIcon className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {cat.category}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {cat.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{item.title}</span>
                              </span>
                              {item.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[10px]">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Changelog View */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    บันทึกประวัติการพัฒนาและอัปเดตเวอร์ชัน
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  อัปเดตต่อเนื่องเพื่อประสิทธิภาพสูงสุด
                </span>
              </div>

              <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-8">
                {changelog.map((rel, rIdx) => (
                  <div key={rIdx} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 group-hover:scale-125 transition-transform" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm sm:text-base text-indigo-700 dark:text-indigo-400">
                          {rel.version}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {rel.date}
                        </span>
                        {rel.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            {rel.badge}
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {rel.highlight}
                      </h5>

                      <ul className="space-y-1.5 pt-1">
                        {rel.changes.map((ch, chIdx) => (
                          <li
                            key={chIdx}
                            className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                          >
                            <span
                              className={`shrink-0 px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase mt-0.5 ${
                                ch.type === 'new'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : ch.type === 'improved'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              }`}
                            >
                              {ch.type === 'new' ? 'New' : ch.type === 'improved' ? 'Update' : 'Fix'}
                            </span>
                            <span>{ch.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">✨ พัฒนาโดย นายศุภวัฒน์ เมืองสิม</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
