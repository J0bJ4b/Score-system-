import React, { useState, useMemo } from 'react';
import { Student, Classroom } from '../types';
import { storage } from '../services/storage';
import {
  parseDmcContent,
  formatCitizenId,
  validateThaiCitizenId,
  DmcExtractedStudent,
} from '../utils/dmcParser';
import {
  Sparkles,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Trash2,
  Check,
  X,
  ArrowRight,
  Info,
  UserPlus,
  HelpCircle,
  FileText,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

interface DmcImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClassroom: Classroom;
  classrooms: Classroom[];
  existingStudents: Student[];
  onStudentsImported: () => void;
}

// Sample raw DMC export rows for quick teacher demonstration
const SAMPLE_DMC_TEXT = `ลำดับ	เลขประจำตัวประชาชน	เลขประจำตัวนักเรียน	คำนำหน้า	ชื่อ	ชื่อกลาง	นามสกุล	เพศ	วันเดือนปีเกิด	อายุ	สัญชาติ	ศาสนา	หมู่เลือด	ที่อยู่ตามทะเบียนบ้าน	ชั้นเรียน	สถานะ
1	1509901010011	50101	ด.ช.	กฤษณะ		พงษ์ศิริ	ชาย	12/04/2557	12	ไทย	พุทธ	O	12/1 หมู่ 3 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
2	1509901010029	50102	ด.ช.	ชานนท์		สุขเจริญ	ชาย	15/06/2557	12	ไทย	พุทธ	B	45/2 หมู่ 1 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
3	1509901010037	50103	ด.ช.	นพรัตน์		วงศ์สุวรรณ	ชาย	03/01/2558	11	ไทย	พุทธ	A	88 หมู่ 4 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
4	1509901010045	50104	ด.ช.	ธีรเดช		เจริญสุข	ชาย	22/09/2557	12	ไทย	พุทธ	O	9/3 หมู่ 2 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
5	1509901010053	50105	ด.ญ.	กัญญารัตน์	ชัยชนะ	หญิง	19/11/2557	12	ไทย	พุทธ	AB	104 หมู่ 5 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
6	1509901010061	50106	ด.ญ.	จิดาภา		มิ่งขวัญ	หญิง	08/02/2558	11	ไทย	พุทธ	B	76/1 หมู่ 2 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
7	1509901010070	50107	ด.ญ.	ณิชารีย์	สว่างวงศ์	หญิง	14/07/2557	12	ไทย	พุทธ	O	33/8 หมู่ 1 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา
8	1509901010088	50108	ด.ญ.	ธนภรณ์		รุ่งเรือง	หญิง	30/10/2557	12	ไทย	พุทธ	A	51 หมู่ 3 ต.บ้านป่าส่าน อ.เมือง จ.เชียงใหม่	ป.5/1	กำลังศึกษา`;

export const DmcImportModal: React.FC<DmcImportModalProps> = ({
  isOpen,
  onClose,
  activeClassroom,
  classrooms,
  existingStudents,
  onStudentsImported,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'paste' | 'file'>('paste');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [targetClassroomId, setTargetClassroomId] = useState(activeClassroom.id);
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>('overwrite');

  // Preview state
  const [extractedList, setExtractedList] = useState<DmcExtractedStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parseNotice, setParseNotice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const targetClassroom =
    classrooms.find((c) => c.id === targetClassroomId) || activeClassroom;

  // Process text on change
  const handleParse = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setExtractedList([]);
      setSelectedIds(new Set());
      setParseNotice('');
      return;
    }

    const res = parseDmcContent(text, targetClassroom.name);
    setExtractedList(res.students);
    setSelectedIds(new Set(res.students.map((s) => s.id)));
    setParseNotice(res.ignoredColumnsNotice);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleParse(content);
        setActiveInputTab('paste');
      }
    };

    // Try reading as UTF-8
    reader.readAsText(file, 'utf-8');
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(extractedList.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Filter preview list by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return extractedList;
    const q = searchQuery.toLowerCase();
    return extractedList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_code.includes(q) ||
        s.student_no.toString().includes(q)
    );
  }, [extractedList, searchQuery]);

  // Execute import into storage
  const handleConfirmImport = () => {
    const chosen = extractedList.filter((s) => selectedIds.has(s.id));
    if (chosen.length === 0) {
      alert('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }

    if (importMode === 'overwrite') {
      const existingInRoom = existingStudents.filter(
        (s) => s.classroom_id === targetClassroomId || s.classroom === targetClassroom.name
      );
      if (
        existingInRoom.length > 0 &&
        !window.confirm(
          `คุณเลือกแบบ "แทนที่ทั้งหมด": รายชื่อนักเรียนเดิมในห้อง ${targetClassroom.name} จำนวน ${existingInRoom.length} คน จะถูกลบและแทนที่ด้วยข้อมูลชุดใหม่นี้ ยืนยันหรือไม่?`
        )
      ) {
        return;
      }
    }

    // Prepare list to save
    const newStudents: Student[] = chosen.map((c, idx) => ({
      id: `stu-${targetClassroomId}-${Date.now()}-${idx + 1}`,
      student_no: c.student_no || idx + 1,
      name: c.name,
      student_code: c.student_code, // เลขประจำตัวประชาชน 13 หลัก
      classroom_id: targetClassroomId,
      classroom: targetClassroom.name,
      gender: c.gender,
    }));

    if (importMode === 'overwrite') {
      // Clear current classroom students first
      storage.clearStudentsByClassroom(targetClassroomId);
      // Append new students
      const allCurrent = storage.getAllStudents();
      storage.saveStudents([...allCurrent, ...newStudents]);
    } else {
      // Append mode
      const allCurrent = storage.getAllStudents();
      storage.saveStudents([...allCurrent, ...newStudents]);
    }

    onStudentsImported();
    onClose();
    alert(`นำเข้าข้อมูลนักเรียนจากระบบ DMC จำนวน ${newStudents.length} คน เรียบร้อยแล้ว`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  ระบบ DMC สพฐ.
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  Data Management Center
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                ดึงข้อมูลนักเรียนจากไฟล์ DMC (สกัดเฉพาะข้อมูลที่ต้องการ)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights & Explanation Card */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>ระบบคัดแยกข้อมูลอัตโนมัติ (DMC Smart Column Filter)</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            ไฟล์ส่งออกจากระบบ DMC มักมีข้อมูล 30-50 คอลัมน์ ระบบจะทำการตรวจจับและดึงมาเฉพาะ <strong>4 ข้อมูลสำคัญ</strong> ที่ต้องใช้ในสมุด ปพ.5:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white p-2 rounded-xl border border-blue-200 flex items-center gap-1.5 font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>1. เลขที่ (ลำดับ)</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-200 flex items-center gap-1.5 font-bold text-indigo-900">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>2. เลขบัตร ปชช. (13 หลัก)</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-200 flex items-center gap-1.5 font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>3. คำนำหน้า + ชื่อ-สกุล</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-200 flex items-center gap-1.5 font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>4. เพศ (ชาย/หญิง)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>ข้ามคอลัมน์ที่ไม่จำเป็นออกทันที: วันเดือนปีเกิด, ที่อยู่, เบอร์โทร, ชื่อบิดามารดา, สัญชาติ, ศาสนา ฯลฯ</span>
          </div>
        </div>

        {/* Input Method Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveInputTab('paste')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeInputTab === 'paste'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            คัดลอกตารางมาวาง (Copy & Paste)
          </button>

          <button
            onClick={() => setActiveInputTab('file')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeInputTab === 'file'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            อัปโหลดไฟล์ DMC (.csv / .xlsx / .txt)
          </button>

          <button
            type="button"
            onClick={() => handleParse(SAMPLE_DMC_TEXT)}
            className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            โหลดข้อมูลตัวอย่าง DMC
          </button>
        </div>

        {/* Tab 1: Textarea Paste */}
        {activeInputTab === 'paste' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700">
                วางข้อความตารางจากระบบ DMC หรือ Excel ที่นี่:
              </label>
              {rawText && (
                <button
                  onClick={() => handleParse('')}
                  className="text-rose-500 hover:text-rose-700 font-semibold"
                >
                  ล้างข้อความ
                </button>
              )}
            </div>
            <textarea
              rows={5}
              placeholder="คัดลอกจากตาราง DMC (Ctrl+A แล้ว Ctrl+C) แล้วนำมาวางที่นี่ได้เลย..."
              value={rawText}
              onChange={(e) => handleParse(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>
        ) : (
          /* Tab 2: File Upload */
          <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-6 text-center transition-all">
            <input
              type="file"
              id="dmc-file-upload"
              accept=".csv,.txt,.tsv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="dmc-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-indigo-700 text-sm hover:underline">
                  คลิกเพื่อเลือกไฟล์ส่งออกจาก DMC
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  รองรับไฟล์ .csv, .txt, .tsv (หรือไฟล์ที่ export จาก portal.bopp-obec.info/dmc)
                </span>
              </div>
              {fileName && (
                <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mt-2">
                  ไฟล์ที่เลือก: {fileName}
                </div>
              )}
            </label>
          </div>
        )}

        {/* Extracted Preview Section */}
        {extractedList.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  สกัดข้อมูลสำเร็จ {extractedList.length} คน
                </span>
                <span className="text-xs text-slate-500">
                  (เลือก {selectedIds.size}/{extractedList.length})
                </span>
                {parseNotice && (
                  <span className="hidden md:inline text-[11px] bg-white px-2 py-0.5 rounded-full text-indigo-700 font-medium border border-indigo-200">
                    {parseNotice}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="font-bold text-slate-500 hover:text-slate-700"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === extractedList.length && extractedList.length > 0}
                          onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                      <th className="py-2.5 px-4">เลขประจำตัวประชาชน (13 หลัก)</th>
                      <th className="py-2.5 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-2.5 px-3 text-center">เพศ</th>
                      <th className="py-2.5 px-4">ห้องเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.map((stu) => {
                      const isSelected = selectedIds.has(stu.id);
                      return (
                        <tr
                          key={stu.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/20' : 'opacity-60'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(stu.id)}
                              className="rounded text-indigo-600"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {stu.student_no}
                          </td>

                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{stu.formatted_id}</span>
                              {stu.is_valid_id && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded font-normal">
                                  ✓ ถูกต้อง
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            {stu.name}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                stu.gender === 'หญิง'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {stu.gender}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-slate-600">
                            {stu.classroom || targetClassroom.name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Target Classroom & Import Mode Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              นำเข้าสู่นักเรียนห้องเรียนเป้าหมาย:
            </label>
            <select
              value={targetClassroomId}
              onChange={(e) => setTargetClassroomId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  ห้อง {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              รูปแบบการนำเข้าข้อมูล:
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setImportMode('overwrite')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  importMode === 'overwrite'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>แทนที่ทั้งหมด</span>
                  {importMode === 'overwrite' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">ลบรายชื่อเดิมในห้องนี้ แล้วลงใหม่</div>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  importMode === 'append'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>เพิ่มต่อท้าย</span>
                  {importMode === 'append' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">เก็บรายชื่อเดิมไว้ เพิ่มต่อเลขที่</div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={extractedList.length === 0 || selectedIds.size === 0}
            onClick={handleConfirmImport}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>ยืนยันนำเข้าข้อมูลนักเรียน DMC ({selectedIds.size} คน)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
