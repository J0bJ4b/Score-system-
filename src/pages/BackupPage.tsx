import React, { useState, useMemo } from 'react';
import { storage } from '../services/storage';
import {
  exportAllScoresMatrixToCSV,
  exportSubjectScoresToCSV,
  downloadScoreTemplateCSV,
  parseScoreCSVText,
} from '../utils/csvScoreHandler';
import { ScoreCsvImportExportModal } from '../components/ScoreCsvImportExportModal';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Table,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface BackupPageProps {
  onDataRestored: () => void;
}

export const BackupPage: React.FC<BackupPageProps> = ({ onDataRestored }) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvModalTab, setCsvModalTab] = useState<'export' | 'import'>('export');

  // Load current database snapshot
  const students = useMemo(() => storage.getAllStudents(), []);
  const subjects = useMemo(() => storage.getSubjects(), []);
  const terms = useMemo(() => storage.getTerms(), []);
  const allScoreItems = useMemo(() => storage.getScoreItems(), []);
  const allScores = useMemo(() => storage.getScores(), []);
  const classrooms = useMemo(() => storage.getClassrooms(), []);
  const activeClassroom = classrooms[0] || { name: 'ป.5/1' };

  // JSON Database Full Backup (Export)
  const handleExportJson = () => {
    try {
      const data = storage.exportDatabase();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gradebook_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('ส่งออกไฟล์สำรองฐานข้อมูลระบบ (JSON) สำเร็จเรียบร้อย');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสำรองข้อมูล: ' + err.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // JSON Database Full Restore (Import)
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('การนำเข้าไฟล์สำรอง JSON จะเขียนทับข้อมูลทั้งหมดในระบบ ต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        storage.importDatabase(parsed);
        setSuccessMsg('นำเข้าและกู้คืนข้อมูลระบบทั้งหมดสำเร็จเรียบร้อย');
        setTimeout(() => setSuccessMsg(''), 4000);
        onDataRestored();
      } catch (err: any) {
        setErrorMsg('ไม่สามารถอ่านไฟล์สำรองได้: ' + (err.message || 'รูปแบบไม่ถูกต้อง'));
        setTimeout(() => setErrorMsg(''), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Export Complete All-in-One Scores Matrix to CSV
  const handleExportAllScoresCsv = () => {
    try {
      exportAllScoresMatrixToCSV(
        students,
        subjects,
        terms,
        allScoreItems,
        allScores,
        activeClassroom.name
      );
      setSuccessMsg(`ส่งออกตารางคะแนนรวมทุกวิชา (${subjects.length} วิชา) เป็นไฟล์ CSV สำเร็จ`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV: ' + err.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        'ต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตัวอย่าง (นักเรียน 20 คน 10 วิชา) หรือไม่? ข้อมูลที่แก้ไขจะถูกแทนที่'
      )
    ) {
      storage.resetToDefault();
      setSuccessMsg('รีเซ็ตข้อมูลเป็นตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 4000);
      onDataRestored();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">
              ศูนย์สำรองและกู้คืนข้อมูล (Backup & Export/Import Center)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              สำรองข้อมูลคะแนนและรายชื่อนักเรียนในรูปแบบไฟล์ <strong>Excel / CSV</strong> และไฟล์ฐานข้อมูล <strong>JSON</strong> เพื่อความปลอดภัยสูงสุด
            </p>
          </div>
        </div>

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

      {/* SECTION 1: EXCEL / CSV SCORE IMPORT & EXPORT (NEW USER REQUEST) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                นำเข้าและส่งออกคะแนนนักเรียน (Excel / CSV Format)
              </h3>
              <p className="text-xs text-slate-500">
                เหมาะสำหรับการสำรองคะแนนรายวิชา หรือนำคะแนนออกไปคำนวณและตัดต่อใน Microsoft Excel ภายนอก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCsvModalTab('export');
                setIsCsvModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>เครื่องมือส่งออก CSV</span>
            </button>

            <button
              onClick={() => {
                setCsvModalTab('import');
                setIsCsvModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>นำเข้าคะแนนจาก CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Master Grade Sheet CSV Export */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  แนะนำสำหรับครู
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 pt-1">
                ส่งออกคะแนนรวมทุกวิชา (Master CSV)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                บันทึกคะแนนเก็บทุกช่องของทุกวิชา ({subjects.length} วิชา) ทั้งสองเทอมรวมในไฟล์เดียว เปิดใน Excel ได้ทันที
              </p>
            </div>
            <button
              onClick={handleExportAllScoresCsv}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด Master CSV</span>
            </button>
          </div>

          {/* Card 2: Subject-by-Subject CSV Tool */}
          <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-2xl flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                รายวิชา & ภาคเรียน
              </span>
              <h4 className="font-bold text-sm text-slate-900 pt-1">
                ส่งออกคะแนนเฉพาะรายวิชา
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                เลือกส่งออกคะแนนเฉพาะวิชาที่ต้องการ พร้อมหัวตารางคะแนนย่อย (ใบงาน, กลางภาค, ปลายภาค)
              </p>
            </div>
            <button
              onClick={() => {
                setCsvModalTab('export');
                setIsCsvModalOpen(true);
              }}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>เลือกวิชาและดาวน์โหลด</span>
            </button>
          </div>

          {/* Card 3: Import from Excel / CSV Sheet */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                นำเข้าข้อมูล
              </span>
              <h4 className="font-bold text-sm text-slate-900 pt-1">
                นำเข้าคะแนนจาก Excel / CSV
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                อัปโหลดไฟล์คะแนนหรือวางข้อความจาก Excel ระบบจะตรวจสอบความถูกต้องและบันทึกคะแนนเข้าสู่ระบบอัตโนมัติ
              </p>
            </div>
            <button
              onClick={() => {
                setCsvModalTab('import');
                setIsCsvModalOpen(true);
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>เปิดหน้าต่างนำเข้าคะแนน</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: FULL SYSTEM JSON DATABASE BACKUP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export JSON Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">สำรองฐานข้อมูลทั้งระบบ (JSON)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ดาวน์โหลดไฟล์โครงสร้างฐานข้อมูล JSON ซึ่งบรรจุข้อมูลนักเรียนทุกห้อง รายวิชา รายการคะแนน การตั้งค่าเกียรติบัตร และประวัติทั้งหมด
            </p>
          </div>

          <button
            onClick={handleExportJson}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.json)</span>
          </button>
        </div>

        {/* Import JSON Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">กู้คืนฐานข้อมูลทั้งระบบ (JSON)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              นำเข้าไฟล์สำรองข้อมูล .json ที่เคยส่งออกไว้ เพื่อกู้คืนฐานข้อมูลทั้งหมดหรือย้ายข้อมูลไปยังเครื่องคอมพิวเตอร์เครื่องอื่น
            </p>
          </div>

          <label className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>เลือกไฟล์เพื่อกู้คืน (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Reset to Factory default */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>รีเซ็ตระบบเป็นค่าเริ่มต้น (Reset Data)</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          หากต้องการล้างข้อมูลทั้งหมดแล้วกลับไปใช้ข้อมูลตัวอย่าง (นักเรียน ป.5/1 และ ป.6/1 พร้อมวิชาและคะแนนทดสอบ) ให้กดปุ่มด้านล่าง
        </p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ล้างและโหลดข้อมูลตัวอย่างเริ่มต้นใหม่</span>
        </button>
      </div>

      {/* CSV Import/Export Modal */}
      <ScoreCsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        subjects={subjects}
        terms={terms}
        students={students}
        allScoreItems={allScoreItems}
        allScores={allScores}
        classroomName={activeClassroom.name}
        defaultTab={csvModalTab}
        onScoresImported={() => {
          setSuccessMsg('นำเข้าคะแนนจากไฟล์ CSV สำเร็จเรียบร้อยแล้ว');
          setTimeout(() => setSuccessMsg(''), 4000);
          onDataRestored();
        }}
      />
    </div>
  );
};
