import React, { useState } from 'react';
import { storage } from '../services/storage';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldCheck,
} from 'lucide-react';

interface BackupPageProps {
  onDataRestored: () => void;
}

export const BackupPage: React.FC<BackupPageProps> = ({ onDataRestored }) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = () => {
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

      setSuccessMsg('ส่งออกไฟล์สำรองข้อมูล (JSON) สำเร็จเรียบร้อย');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการสำรองข้อมูล: ' + err.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('การนำเข้าไฟล์สำรองจะเขียนทับข้อมูลปัจจุบัน ต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        storage.importDatabase(parsed);
        setSuccessMsg('นำเข้าและกู้คืนข้อมูลสำเร็จเรียบร้อย');
        setTimeout(() => setSuccessMsg(''), 4000);
        onDataRestored();
      } catch (err: any) {
        setErrorMsg('ไม่สามารถอ่านไฟล์สำรองได้: ' + (err.message || 'รูปแบบไม่ถูกต้อง'));
        setTimeout(() => setErrorMsg(''), 4000);
      }
    };
    reader.readAsText(file);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">สำรองและกู้คืนข้อมูล (Backup & Restore)</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              บันทึกเก็บข้อมูลนักเรียนและคะแนนทั้งหมดไว้ในคอมพิวเตอร์ของคุณเพื่อความปลอดภัย
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Backup Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">สำรองข้อมูลทั้งหมด (Export)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ดาวน์โหลดไฟล์สำรองข้อมูล JSON ซึ่งบรรจุข้อมูลนักเรียน รายวิชา รายการคะแนน และคะแนนทั้งหมดของทั้งสองเทอม เก็บไว้ในเครื่องคอมพิวเตอร์
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.json)</span>
          </button>
        </div>

        {/* Import Backup Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">กู้คืนข้อมูลจากไฟล์ (Import)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              นำเข้าไฟล์สำรองข้อมูล .json ที่เคยส่งออกไว้ เพื่อกู้คืนข้อมูลหรือย้ายข้อมูลข้ามเครื่องคอมพิวเตอร์
            </p>
          </div>

          <label className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>เลือกไฟล์เพื่อกู้คืน (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
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
          หากต้องการล้างข้อมูลทั้งหมดแล้วกลับไปใช้ข้อมูลตัวอย่าง (นักเรียน ป.5/1 จำนวน 20 คน และ 10 รายวิชาพร้อมคะแนนทดสอบ) ให้กดปุ่มด้านล่าง
        </p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ล้างและโหลดข้อมูลตัวอย่างเริ่มต้นใหม่</span>
        </button>
      </div>
    </div>
  );
};
