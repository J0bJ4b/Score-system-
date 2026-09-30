import React, { useState } from 'react';
import { Student, Classroom } from '../types';
import { storage } from '../services/storage';
import { exportToCSV, parseStudentsCSV } from '../utils/gradeCalculator';
import { SmartStudentPasteModal } from '../components/SmartStudentPasteModal';
import { DmcImportModal } from '../components/DmcImportModal';
import { formatCitizenId, cleanCitizenId, validateThaiCitizenId } from '../utils/dmcParser';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Layers,
  GraduationCap,
  CreditCard,
  QrCode,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

interface StudentManagementPageProps {
  students: Student[];
  onStudentsUpdated: () => void;
  classroom: string;
  activeClassroom: Classroom;
  classrooms: Classroom[];
  onNavigateToSheets?: () => void;
  onOpenClassroomManager?: () => void;
  onViewStudentPortal?: (student: Student) => void;
  onNavigateToIdCards?: () => void;
}

export const StudentManagementPage: React.FC<StudentManagementPageProps> = ({
  students,
  onStudentsUpdated,
  classroom,
  activeClassroom,
  classrooms,
  onNavigateToSheets,
  onOpenClassroomManager,
  onViewStudentPortal,
  onNavigateToIdCards,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isDmcModalOpen, setIsDmcModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<'current_room' | 'all_rooms'>('current_room');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [formStudentNo, setFormStudentNo] = useState<number>(students.length + 1);
  const [formName, setFormName] = useState('');
  const [formStudentCode, setFormStudentCode] = useState(''); // เลขประจำตัวประชาชน 13 หลัก
  const [formClassroomId, setFormClassroomId] = useState(activeClassroom.id);
  const [formGender, setFormGender] = useState<'ชาย' | 'หญิง'>('ชาย');

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<Omit<Student, 'id'>[]>([]);
  const [importError, setImportError] = useState('');

  // Search filter
  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      s.student_no.toString().includes(searchQuery) ||
      (s.student_code && s.student_code.includes(searchQuery))
  );

  const resetForm = () => {
    setFormStudentNo(students.length + 1);
    setFormName('');
    setFormStudentCode('');
    setFormClassroomId(activeClassroom.id);
    setFormGender('ชาย');
    setEditingStudent(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    const maxNo = students.reduce((acc, curr) => Math.max(acc, curr.student_no), 0);
    setFormStudentNo(maxNo + 1);
    setFormStudentCode('');
    setFormClassroomId(activeClassroom.id);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (stu: Student) => {
    setEditingStudent(stu);
    setFormStudentNo(stu.student_no);
    setFormName(stu.name);
    setFormStudentCode(stu.student_code);
    setFormClassroomId(stu.classroom_id || activeClassroom.id);
    setFormGender(stu.gender || 'ชาย');
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const chosenRoom = classrooms.find((c) => c.id === formClassroomId) || activeClassroom;
    const cleanId = cleanCitizenId(formStudentCode.trim());

    storage.addStudent({
      student_no: Number(formStudentNo),
      name: formName.trim(),
      student_code: cleanId || formStudentCode.trim(),
      classroom_id: chosenRoom.id,
      classroom: chosenRoom.name,
      gender: formGender,
    });

    setIsAddModalOpen(false);
    resetForm();
    onStudentsUpdated();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !formName.trim()) return;

    const chosenRoom = classrooms.find((c) => c.id === formClassroomId) || activeClassroom;
    const cleanId = cleanCitizenId(formStudentCode.trim());

    storage.updateStudent({
      ...editingStudent,
      student_no: Number(formStudentNo),
      name: formName.trim(),
      student_code: cleanId || formStudentCode.trim(),
      classroom_id: chosenRoom.id,
      classroom: chosenRoom.name,
      gender: formGender,
    });

    setIsEditModalOpen(false);
    resetForm();
    onStudentsUpdated();
  };

  const handleDelete = (stu: Student) => {
    if (
      window.confirm(
        `คุณต้องการลบรายชื่อ "${stu.name}" (เลขที่ ${stu.student_no}, เลขบัตร ปชช. ${formatCitizenId(stu.student_code)}) หรือไม่? คะแนนของนักเรียนคนนี้จะถูกลบออกด้วย`
      )
    ) {
      storage.deleteStudent(stu.id);
      onStudentsUpdated();
    }
  };

  // Delete All handler
  const handleConfirmDeleteAll = () => {
    if (deleteConfirmText.trim() !== 'ยืนยัน') {
      alert('กรุณาพิมพ์คำว่า "ยืนยัน" ในช่องข้อความเพื่อยืนยันความปลอดภัย');
      return;
    }

    if (deleteAllScope === 'current_room') {
      storage.clearStudentsByClassroom(activeClassroom.id);
    } else {
      storage.clearAllStudents();
    }

    setIsDeleteAllModalOpen(false);
    setDeleteConfirmText('');
    onStudentsUpdated();
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    const headers = ['เลขที่', 'เลขประจำตัวประชาชน', 'ชื่อ-นามสกุล', 'ห้อง', 'เพศ'];
    const rows = students.map((s) => [
      s.student_no,
      s.student_code,
      s.name,
      s.classroom,
      s.gender || 'ไม่ระบุ',
    ]);
    exportToCSV(`รายชื่อนักเรียน_${classroom}`, headers, rows);
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const headers = ['เลขที่', 'ชื่อ-นามสกุล', 'เลขประจำตัวประชาชน (13 หลัก)', 'ห้อง'];
    const rows = [
      [1, 'เด็กชายสมชาย หมายมั่น', '1509901010011', classroom],
      [2, 'เด็กหญิงสมหญิง รักเรียน', '1509901010029', classroom],
      [3, 'เด็กชายวีระ เพียรพยายาม', '1509901010037', classroom],
    ];
    exportToCSV(`แบบฟอร์มนำเข้ารายชื่อนักเรียน`, headers, rows);
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseAndSetPreview(content);
    };
    reader.readAsText(file);
  };

  const parseAndSetPreview = (text: string) => {
    setImportError('');
    try {
      const parsed = parseStudentsCSV(text, classroom);
      if (parsed.length === 0) {
        setImportError('ไม่พบข้อมูลนักเรียนที่ถูกต้อง กรุณาตรวจสอบรูปแบบไฟล์');
      }
      setImportPreview(parsed);
    } catch (err: any) {
      setImportError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    }
  };

  const handleApplyImport = () => {
    if (importPreview.length === 0) return;

    const action = window.confirm(
      `คุณต้องการนำเข้ารายชื่อนักเรียนจำนวน ${importPreview.length} คน เข้าสู่ห้อง "${activeClassroom.name}" ใช่หรือไม่?`
    );
    if (!action) return;

    importPreview.forEach((stu) => {
      storage.addStudent({
        ...stu,
        classroom_id: activeClassroom.id,
        classroom: activeClassroom.name,
      });
    });

    setIsImportModalOpen(false);
    setCsvText('');
    setImportPreview([]);
    onStudentsUpdated();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>จัดการข้อมูลนักเรียน</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                ห้อง {activeClassroom.name} ({activeClassroom.level})
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {students.length} คน
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              จัดการนักเรียนเฉพาะห้อง {activeClassroom.name} • สามารถเพิ่ม แก้ไข ย้ายห้อง หรือนำเข้าจาก Excel / CSV ได้
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenClassroomManager && (
              <button
                type="button"
                onClick={onOpenClassroomManager}
                className="px-3 py-2 text-xs sm:text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>สลับห้องเรียน</span>
              </button>
            )}

            {/* ปุ่มดึงข้อมูลจากไฟล์ DMC สพฐ. */}
            <button
              type="button"
              onClick={() => setIsDmcModalOpen(true)}
              className="px-3 py-2 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-blue-300/40"
              title="ดึงข้อมูลจากไฟล์ DMC ของ สพฐ. โดยกรองเอาเฉพาะข้อมูลที่จำเป็น (เลขบัตร ปชช., ชื่อ-สกุล, เลขที่, เพศ, ห้อง)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดึงข้อมูลจากไฟล์ DMC (สพฐ.)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={() => {
                setCsvText('');
                setImportPreview([]);
                setImportError('');
                setIsImportModalOpen(true);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>นำเข้าจาก Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSmartPasteOpen(true)}
              className="px-3 py-2 text-xs sm:text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200 cursor-pointer shadow-2xs"
              title="วางรายชื่อที่มีข้อมูลปนเปื้อนแล้วให้ระบบกรองอัตโนมัติ"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>✨ วางรายชื่ออัจฉริยะ (Smart Paste)</span>
            </button>

            {onNavigateToIdCards && (
              <button
                type="button"
                onClick={onNavigateToIdCards}
                className="px-3 py-2 text-xs sm:text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>พิมพ์บัตรนักเรียน & QR</span>
              </button>
            )}

            {onNavigateToSheets && (
              <button
                type="button"
                onClick={onNavigateToSheets}
                className="px-3 py-2 text-xs sm:text-sm font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl transition-colors flex items-center gap-1.5 border border-teal-300 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>นำเข้าจาก Google Sheets</span>
              </button>
            )}

            {/* ปุ่มลบทั้งหมด (Delete All Students) */}
            <button
              type="button"
              onClick={() => {
                setDeleteAllScope('current_room');
                setDeleteConfirmText('');
                setIsDeleteAllModalOpen(true);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors flex items-center gap-1.5 border border-rose-300 cursor-pointer"
              title="ลบข้อมูลนักเรียนทั้งหมดในห้องเรียนหรือทั้งหมดทุกห้อง"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>ลบทั้งหมด</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มนักเรียน</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, เลขที่, หรือเลขบัตรประชาชน..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            แสดง {filteredStudents.length} จาก {students.length} คน
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-16">เลขที่</th>
                <th className="py-3 px-4 w-44">เลขประจำตัวประชาชน (13 หลัก)</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4 text-center w-24">เพศ</th>
                <th className="py-3 px-4 text-center w-28">ห้อง</th>
                <th className="py-3 px-4 text-center w-28">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu) => {
                  const cleanId = cleanCitizenId(stu.student_code);
                  const isValidId = validateThaiCitizenId(cleanId);
                  const formatted = formatCitizenId(stu.student_code);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {stu.student_no}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{formatted || stu.student_code || '-'}</span>
                          {isValidId && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-normal shrink-0" title="เลขบัตร ปชช. ถูกต้องตามมาตรฐาน 13 หลัก">
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{stu.name}</div>
                      </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          stu.gender === 'หญิง'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {stu.gender || 'ชาย'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-slate-600">
                      {stu.classroom}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onViewStudentPortal && (
                          <button
                            type="button"
                            onClick={() => onViewStudentPortal(stu)}
                            title="ดูผลคะแนนในมุมมองนักเรียน (Student Portal)"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(stu)}
                          title="แก้ไขข้อมูล"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(stu)}
                          title="ลบนักเรียน"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    {searchQuery ? 'ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลนักเรียนในระบบ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <span>เพิ่มนักเรียนใหม่</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขที่ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formStudentNo}
                    onChange={(e) => setFormStudentNo(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) *
                  </label>
                  <input
                    type="text"
                    maxLength={17}
                    value={formStudentCode}
                    onChange={(e) => setFormStudentCode(e.target.value)}
                    placeholder="เช่น 1509901010011"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    กรอกเลข 13 หลัก (ใช้แทนรหัสนักเรียนสำหรับสมุด ปพ.5 และบัตรนักเรียน)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล (พร้อมคำนำหน้า ด.ช./ด.ญ.) *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น เด็กชายรักดี สุขสมบูรณ์"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เพศ
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ชาย">ชาย (ด.ช.)</option>
                    <option value="หญิง">หญิง (ด.ญ.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ห้องเรียน
                  </label>
                  <select
                    value={formClassroomId}
                    onChange={(e) => setFormClassroomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        ห้อง {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                <span>แก้ไขข้อมูลนักเรียน</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขที่ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formStudentNo}
                    onChange={(e) => setFormStudentNo(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) *
                  </label>
                  <input
                    type="text"
                    maxLength={17}
                    value={formStudentCode}
                    onChange={(e) => setFormStudentCode(e.target.value)}
                    placeholder="เช่น 1509901010011"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เพศ
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ห้องเรียน
                  </label>
                  <select
                    value={formClassroomId}
                    onChange={(e) => setFormClassroomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        ห้อง {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Students Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-rose-200">
            <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">ยืนยันการลบข้อมูลนักเรียนทั้งหมด</h3>
                  <p className="text-rose-100 text-xs mt-0.5">โปรดตรวจสอบก่อนดำเนินการ (ข้อมูลจะถูกลบถาวร)</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning Callout */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>คำเตือนสำคัญ: การกระทำนี้ไม่สามารถย้อนกลับได้!</span>
                </div>
                <p className="text-rose-700 leading-relaxed">
                  หากดำเนินการลบ ข้อมูลคะแนนสอบ คะแนนเก็บ ใบงาน และบันทึกการสอนซ่อมเสริมทั้งหมดของนักเรียนจะถูกลบออกจากระบบด้วย
                </p>
                <div className="pt-1">
                  <span className="font-bold text-slate-700">แนะนำ:</span> หากต้องการเก็บสำรองข้อมูลไว้ ให้กดปุ่ม <strong>"ส่งออก Excel"</strong> ก่อนลบ
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  เลือกระดับการลบข้อมูล:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteAllScope('current_room')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deleteAllScope === 'current_room'
                        ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">เฉพาะห้อง {activeClassroom.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      ลบเฉพาะนักเรียนในห้องปัจจุบัน ({students.length} คน)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteAllScope('all_rooms')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deleteAllScope === 'all_rooms'
                        ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-rose-700">ทุกห้องเรียนในระบบ</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      ล้างข้อมูลนักเรียนทั้งหมด ({storage.getAllStudents().length} คน)
                    </div>
                  </button>
                </div>
              </div>

              {/* Confirmation Input Word */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  พิมพ์คำว่า <span className="font-mono text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded font-bold">ยืนยัน</span> ในช่องด้านล่างเพื่อปลดล็อกปุ่มลบ:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="พิมพ์ ยืนยัน ที่นี่..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== 'ยืนยัน'}
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันการลบนักเรียน ({deleteAllScope === 'current_room' ? `ห้อง ${activeClassroom.name} ${students.length} คน` : 'ทั้งหมดทุกห้อง'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV / Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>นำเข้ารายชื่อนักเรียนจาก Excel / CSV</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Instructions & Template */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <div>
                  <span className="font-bold">รูปแบบไฟล์:</span> เลขที่, ชื่อ-นามสกุล, เลขประจำตัวประชาชน (13 หลัก), ห้อง
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    สามารถวางข้อความจาก Excel ลงในช่องด้านล่าง หรืออัปโหลดไฟล์ .csv ได้โดยตรง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="shrink-0 px-3 py-1.5 bg-white text-emerald-800 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลดแบบฟอร์ม
                </button>
              </div>

              {/* File upload input */}
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer border border-slate-300 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>เลือกไฟล์ .CSV หรือ .TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400">หรือวางข้อความในกล่องด้านล่าง:</span>
              </div>

              {/* Paste box */}
              <div>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseAndSetPreview(e.target.value);
                  }}
                  placeholder="วางข้อมูลจาก Excel เช่น:&#10;1	เด็กชายสมชาย หมายมั่น	1509901010011	ป.5/1&#10;2	เด็กหญิงสายใจ พัฒนา	1509901010029	ป.5/1"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      ตัวอย่างข้อมูลที่จะนำเข้า ({importPreview.length} รายการ):
                    </span>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> ตรวจสอบเรียบร้อย
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2 px-3 text-center">เลขที่</th>
                          <th className="py-2 px-3">ชื่อ - นามสกุล</th>
                          <th className="py-2 px-3">เลขประจำตัวประชาชน</th>
                          <th className="py-2 px-3 text-center">ห้อง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-center font-bold text-slate-600">
                              {item.student_no}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-800">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-500">
                              {formatCitizenId(item.student_code)}
                            </td>
                            <td className="py-1.5 px-3 text-center text-slate-600">
                              {item.classroom}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleApplyImport}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all"
              >
                ยืนยันการนำเข้า ({importPreview.length} คน)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated DMC Import Modal (Data Management Center สพฐ.) */}
      <DmcImportModal
        isOpen={isDmcModalOpen}
        onClose={() => setIsDmcModalOpen(false)}
        activeClassroom={activeClassroom}
        classrooms={classrooms}
        existingStudents={students}
        onStudentsImported={() => {
          onStudentsUpdated();
        }}
      />

      {/* Smart Student Paste & Filter Modal */}
      <SmartStudentPasteModal
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        activeClassroom={activeClassroom}
        classrooms={classrooms}
        existingStudents={students}
        onStudentsImported={() => {
          onStudentsUpdated();
        }}
      />
    </div>
  );
};
