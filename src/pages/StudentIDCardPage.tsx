import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, Classroom, User } from '../types';
import {
  CreditCard,
  Printer,
  QrCode,
  Sparkles,
  Download,
  User as UserIcon,
  Search,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Palette,
  ChevronLeft,
  ChevronRight,
  School,
  GraduationCap,
} from 'lucide-react';

interface StudentIDCardPageProps {
  students: Student[];
  classroom: string;
  activeClassroom: Classroom;
  user: User | null;
  onViewStudentPortal?: (student: Student) => void;
}

export const StudentIDCardPage: React.FC<StudentIDCardPageProps> = ({
  students,
  classroom,
  activeClassroom,
  user,
  onViewStudentPortal,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [cardTheme, setCardTheme] = useState<'blue' | 'emerald' | 'purple' | 'navy' | 'gold'>('blue');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState<string>(user?.school_name || 'โรงเรียนบ้านป่าส่าน (สพฐ.)');
  const [academicYear, setAcademicYear] = useState<string>(activeClassroom.academic_year || '2569');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [cardsPerPage, setCardsPerPage] = useState<8 | 10>(8);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const currentIndex = students.findIndex((s) => s.id === selectedStudent?.id);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_code.includes(searchQuery) ||
        s.student_no.toString().includes(searchQuery)
    );
  }, [students, searchQuery]);

  // Generate Scan URL for QR code
  const getStudentPortalUrl = (studentCode: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?student_code=${encodeURIComponent(studentCode)}`;
  };

  const handlePrint = (batch: boolean = false) => {
    setIsBatchMode(batch);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="no-print bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                Student ID Cards & Instant QR Code
              </span>
              <span className="text-xs text-slate-500 font-semibold">ห้อง {classroom}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
              <QrCode className="w-7 h-7 text-indigo-600" />
              พิมพ์บัตรประจำตัวนักเรียน พร้อม QR Code
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              ออกบัตรพร้อม QR Code ประจำตัวนักเรียน เพื่อให้ผู้ปกครองสแกนแล้วเปิดหน้าตรวจคะแนนได้ทันที ไม่ต้องพิมพ์รหัส
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePrint(false)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์บัตรคนนี้</span>
            </button>

            <button
              onClick={() => handlePrint(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>พิมพ์ทั้งห้อง ({students.length} ใบ / ชุด A4)</span>
            </button>
          </div>
        </div>

        {/* Customization Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">โทนสีบัตรประจำตัว</label>
            <div className="flex gap-2">
              {[
                { id: 'blue', label: 'น้ำเงิน', bg: 'bg-blue-600 text-white' },
                { id: 'navy', label: 'กรมท่า', bg: 'bg-slate-800 text-white' },
                { id: 'emerald', label: 'เขียวมรกต', bg: 'bg-emerald-700 text-white' },
                { id: 'purple', label: 'ม่วง', bg: 'bg-purple-700 text-white' },
                { id: 'gold', label: 'ทองเกียรติยศ', bg: 'bg-amber-600 text-white' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCardTheme(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    cardTheme === t.id
                      ? `${t.bg} ring-2 ring-indigo-500 shadow-xs`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ชื่อโรงเรียนบนบัตร</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ปีการศึกษา</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Main Single Card Interactive Studio */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Student Selector List */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              เลือกนักเรียนในห้อง {classroom}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {filteredStudents.length} คน
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขที่, เลขประจำตัว..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredStudents.map((stu) => {
              const isSelected = stu.id === selectedStudent?.id;
              return (
                <div
                  key={stu.id}
                  onClick={() => setSelectedStudentId(stu.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {stu.student_no}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{stu.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">รหัส: {stu.student_code}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <QrCode className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Card Preview & Actions */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                ตัวอย่างบัตรประจำตัวนักเรียน (Live Card Preview)
              </h3>
              <p className="text-xs text-slate-500">
                ขนาดมาตรฐาน CR80 • คมชัดสูง พร้อมพิมพ์และเคลือบพลาสติก
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                title="คนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex >= students.length - 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                title="คนถัดไป"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>

              {onViewStudentPortal && selectedStudent && (
                <button
                  onClick={() => onViewStudentPortal(selectedStudent)}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ทดสอบสแกน (เปิดหน้าคะแนน)</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Card Rendering */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4 bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
            {selectedStudent ? (
              <>
                {/* Front Side */}
                <div>
                  <div className="text-center text-xs font-bold text-slate-500 mb-2">ด้านหน้าบัตร (Front)</div>
                  <SingleStudentCard
                    student={selectedStudent}
                    theme={cardTheme}
                    schoolName={schoolName}
                    academicYear={academicYear}
                    classroomName={activeClassroom.name}
                    qrUrl={getStudentPortalUrl(selectedStudent.student_code)}
                  />
                </div>

                {/* Back Side */}
                <div>
                  <div className="text-center text-xs font-bold text-slate-500 mb-2">ด้านหลังบัตร (Back)</div>
                  <SingleStudentCardBack
                    student={selectedStudent}
                    theme={cardTheme}
                    schoolName={schoolName}
                    academicYear={academicYear}
                    classroomName={activeClassroom.name}
                    qrUrl={getStudentPortalUrl(selectedStudent.student_code)}
                  />
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-xs py-8">กรุณาเลือกนักเรียนเพื่อดูตัวอย่างบัตร</div>
            )}
          </div>

          {/* Teacher Guide Notice */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              วิธีใช้งานบัตรพร้อม QR Code:
            </div>
            <p className="text-indigo-800 leading-relaxed">
              1. สั่งพิมพ์แบบ <strong>"พิมพ์ทั้งห้อง (ชุด A4)"</strong> ระบบจะจัดวางบัตร 8 ใบต่อหน้า A4 พอดี สามารถใช้กรรไกรตัดตามเส้นประและนำไปเคลือบพลาสติกแจกนักเรียนได้ทันที<br />
              2. ผู้ปกครองสามารถใช้กล้องมือถือหรือแอปพลิเคชัน LINE สแกน QR Code บนบัตร ระบบจะเปิดหน้าสรุปคะแนน ผลการเรียน และเกรดของนักเรียนคนนั้นทันที โดยไม่ต้องพิมพ์รหัสผ่าน!
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT LAYOUT CONTAINER (FOR BATCH OR SINGLE CARD PRINTING)
          ========================================================================= */}
      <div className="print-only">
        {isBatchMode ? (
          <div className="id-cards-batch-grid">
            {students.map((stu) => (
              <div key={`batch-${stu.id}`} className="id-card-print-item mb-4 inline-block p-1">
                <SingleStudentCard
                  student={stu}
                  theme={cardTheme}
                  schoolName={schoolName}
                  academicYear={academicYear}
                  classroomName={activeClassroom.name}
                  qrUrl={getStudentPortalUrl(stu.student_code)}
                />
              </div>
            ))}
          </div>
        ) : (
          selectedStudent && (
            <div className="flex gap-4 p-4">
              <SingleStudentCard
                student={selectedStudent}
                theme={cardTheme}
                schoolName={schoolName}
                academicYear={academicYear}
                classroomName={activeClassroom.name}
                qrUrl={getStudentPortalUrl(selectedStudent.student_code)}
              />
              <SingleStudentCardBack
                student={selectedStudent}
                theme={cardTheme}
                schoolName={schoolName}
                academicYear={academicYear}
                classroomName={activeClassroom.name}
                qrUrl={getStudentPortalUrl(selectedStudent.student_code)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

// =========================================================================
// HIGH QUALITY STUDENT ID CARD COMPONENT (CR80 Standard / Landscape)
// =========================================================================
interface CardProps {
  student: Student;
  theme: 'blue' | 'emerald' | 'purple' | 'navy' | 'gold';
  schoolName: string;
  academicYear: string;
  classroomName: string;
  qrUrl: string;
}

export const SingleStudentCard: React.FC<CardProps> = ({
  student,
  theme,
  schoolName,
  academicYear,
  classroomName,
  qrUrl,
}) => {
  const styles = {
    blue: {
      headerBg: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800',
      badgeBg: 'bg-blue-100 text-blue-900',
      accentColor: 'text-blue-700',
      borderColor: 'border-blue-700',
    },
    navy: {
      headerBg: 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950',
      badgeBg: 'bg-slate-100 text-slate-900',
      accentColor: 'text-slate-800',
      borderColor: 'border-slate-800',
    },
    emerald: {
      headerBg: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      accentColor: 'text-emerald-700',
      borderColor: 'border-emerald-700',
    },
    purple: {
      headerBg: 'bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900',
      badgeBg: 'bg-purple-100 text-purple-900',
      accentColor: 'text-purple-800',
      borderColor: 'border-purple-800',
    },
    gold: {
      headerBg: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700',
      badgeBg: 'bg-amber-100 text-amber-900',
      accentColor: 'text-amber-700',
      borderColor: 'border-amber-600',
    },
  }[theme];

  return (
    <div
      className="student-id-card relative bg-white border border-slate-300 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between"
      style={{
        width: '340px',
        height: '215px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Band */}
      <div className={`${styles.headerBg} px-3 py-2 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
            สพฐ
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wide leading-tight line-clamp-1">
              {schoolName}
            </div>
            <div className="text-[8px] text-blue-100 uppercase tracking-wider font-semibold">
              STUDENT IDENTIFICATION CARD
            </div>
          </div>
        </div>
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/20 text-white">
          {classroomName}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3 flex items-center justify-between gap-3 flex-1">
        {/* Left: Avatar Photo */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-20 bg-slate-100 border-2 border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 overflow-hidden relative shadow-inner">
            <UserIcon className="w-10 h-10 text-slate-300" />
            <div className="absolute bottom-0 inset-x-0 bg-slate-800/60 text-white text-[7px] text-center py-0.5">
              เลขที่ {student.student_no}
            </div>
          </div>
          <div className="text-[8px] font-bold text-slate-500 mt-1">
            เพศ {student.gender || 'ชาย'}
          </div>
        </div>

        {/* Center: Student Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div>
            <div className="text-[9px] text-slate-400 font-medium">ชื่อ - นามสกุล:</div>
            <div className="text-xs font-black text-slate-900 leading-snug truncate">
              {student.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div>
              <span className="text-slate-400">เลขประจำตัว:</span>
              <div className="font-mono font-bold text-slate-800">{student.student_code}</div>
            </div>
            <div>
              <span className="text-slate-400">ชั้น/ห้อง:</span>
              <div className="font-bold text-slate-800">{student.classroom}</div>
            </div>
          </div>

          <div className="text-[8px] text-slate-500 pt-0.5">
            ปีการศึกษา <strong className="text-slate-800">{academicYear}</strong>
          </div>
        </div>

        {/* Right: Crisp QR Code */}
        <div className="flex flex-col items-center justify-center pl-1 border-l border-slate-100 shrink-0">
          <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <QRCodeSVG
              value={qrUrl}
              size={56}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="text-[7px] font-bold text-indigo-700 mt-1 text-center leading-tight">
            สแกนดูคะแนน<br />Portal
          </div>
        </div>
      </div>

      {/* Footer Band */}
      <div className="bg-slate-100 px-3 py-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
        <span>กระทรวงศึกษาธิการ</span>
        <span className="font-bold text-slate-700 font-mono">CODE: {student.student_code}</span>
      </div>
    </div>
  );
};

// =========================================================================
// CARD BACK COMPONENT
// =========================================================================
export const SingleStudentCardBack: React.FC<CardProps> = ({
  student,
  theme,
  schoolName,
  academicYear,
  classroomName,
  qrUrl,
}) => {
  return (
    <div
      className="student-id-card-back relative bg-[#fcfcfc] border border-slate-300 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between p-3"
      style={{
        width: '340px',
        height: '215px',
        boxSizing: 'border-box',
      }}
    >
      {/* Back Header */}
      <div className="text-center border-b border-slate-200 pb-1.5">
        <div className="text-[10px] font-bold text-slate-800">เงื่อนไขการใช้บัตรประจำตัวนักเรียน</div>
        <div className="text-[8px] text-slate-400">{schoolName}</div>
      </div>

      {/* Terms & Instructions */}
      <div className="text-[8px] text-slate-600 space-y-1 my-auto leading-relaxed">
        <p>1. บัตรนี้เป็นเอกสารประจำตัวนักเรียนของ {schoolName} ใช้ยืนยันตัวตนและการเข้าร่วมกิจกรรม</p>
        <p>2. ผู้ปกครองสามารถสแกน <strong>QR Code</strong> บนบัตรเพื่อดูผลการเรียน คะแนนเก็บ และเกรดเฉลี่ยออนไลน์ได้ 24 ชั่วโมง</p>
        <p>3. หากเก็บบัตรนี้ได้ กรุณาส่งคืน {schoolName} หรือติดต่อครูประจำชั้น</p>
      </div>

      {/* Signature & Barcode footer */}
      <div className="border-t border-slate-200 pt-1.5 flex items-end justify-between text-[8px]">
        <div>
          <div className="font-mono text-[7px] text-slate-400">||||| | |||| || |||||| | |||</div>
          <div className="font-mono text-[8px] font-bold text-slate-700">{student.student_code}</div>
        </div>

        <div className="text-center space-y-0.5">
          <div className="w-24 border-b border-dotted border-slate-400 mx-auto" />
          <div className="text-[7px] text-slate-500">ผู้อำนวยการโรงเรียน</div>
        </div>
      </div>
    </div>
  );
};
