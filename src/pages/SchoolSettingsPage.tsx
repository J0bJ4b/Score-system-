import React, { useState, useRef } from 'react';
import { SchoolSettings, SchoolLogoType, User } from '../types';
import { storage, INITIAL_SCHOOL_SETTINGS } from '../services/storage';
import { SchoolLogo } from '../components/SchoolLogo';
import {
  School,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  PenTool,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  CreditCard,
  Award,
  Layers,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Shield,
  Palette,
} from 'lucide-react';

interface SchoolSettingsPageProps {
  user: User;
  onSettingsUpdated: () => void;
}

export const SchoolSettingsPage: React.FC<SchoolSettingsPageProps> = ({
  user,
  onSettingsUpdated,
}) => {
  const [settings, setSettings] = useState<SchoolSettings>(() => storage.getSchoolSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'navbar' | 'pp5' | 'idcard' | 'cert'>('navbar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigDirectorInputRef = useRef<HTMLInputElement>(null);
  const sigTeacherInputRef = useRef<HTMLInputElement>(null);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('ไฟล์รูปภาพขนาดใหญ่เกิน 2MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        logo_url: base64,
        logo_type: 'custom',
      }));
    };
    reader.readAsDataURL(file);
  };

  // Director signature upload
  const handleDirectorSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSettings((prev) => ({
        ...prev,
        director_signature_url: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Teacher signature upload
  const handleTeacherSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSettings((prev) => ({
        ...prev,
        teacher_signature_url: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Save settings
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    storage.saveSchoolSettings(settings);
    onSettingsUpdated();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('ต้องการรีเซ็ตข้อมูลสถานศึกษาเป็นค่าเริ่มต้นโรงเรียนบ้านป่าส่านใช่หรือไม่?')) {
      setSettings({ ...INITIAL_SCHOOL_SETTINGS });
      storage.saveSchoolSettings(INITIAL_SCHOOL_SETTINGS);
      onSettingsUpdated();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-['Sarabun',sans-serif]">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-indigo-700 via-sky-700 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-semibold border border-white/20">
              <School className="w-3.5 h-3.5 text-sky-300" />
              <span>การตั้งค่าระบบและอัตลักษณ์สถานศึกษา (School Branding & Profile)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>ตั้งค่าข้อมูลโรงเรียน & ตราสัญลักษณ์</span>
            </h1>
            <p className="text-sky-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              กำหนดชื่อโรงเรียน ตราสัญลักษณ์ โลโก้ ข้อมูลสังกัด ที่อยู่ และรายชื่อผู้บริหาร ข้อมูลทั้งหมดจะเชื่อมโยงไปยังหน้าบัตรนักเรียน, แบบบันทึก ปพ.5, ใบรายงาน ปพ.6, เกียรติบัตร และการแจ้งเตือนผู้ปกครองโดยอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-semibold text-xs sm:text-sm backdrop-blur-xs border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-sky-200" />
              <span>กู้คืนค่าเริ่มต้น</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลโรงเรียน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-emerald-500/50 text-xs sm:text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว!</div>
            <div className="text-[11px] text-slate-300">
              ชื่อโรงเรียนและโลโก้จะอัปเดตบนหน้า ปพ.5, บัตรนักเรียน และเอกสารทั้งหมดทันที
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section 1: Logo and Emblem */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <span>ตราสัญลักษณ์ / โลโก้โรงเรียน (School Logo)</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                เลือกแบบมาตรฐาน หรืออัปโหลดรูปภาพ
              </span>
            </div>

            {/* Current Active Logo Display */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                <SchoolLogo settings={settings} size="xl" />
              </div>
              <div className="space-y-1 text-center sm:text-left flex-1">
                <div className="text-xs text-slate-500 font-medium">ตราสัญลักษณ์ที่เลือกใช้งานปัจจุบัน:</div>
                <div className="text-sm font-bold text-slate-800">
                  {settings.logo_type === 'garuda' && '🦅 ตราครุฑพ่าห์ราชการ (สพฐ.)'}
                  {settings.logo_type === 'education' && '🎓 ตราเสมาธรรมจักร (กระทรวงศึกษาธิการ)'}
                  {settings.logo_type === 'seal' && '🌿 ตราประทับช่อชัยพฤกษ์ (Royal Wreath)'}
                  {settings.logo_type === 'custom' && '🖼️ รูปภาพโลโก้โรงเรียนที่อัปโหลดเอง'}
                  {settings.logo_type === 'none' && '🏫 สัญลักษณ์อาคารโรงเรียน'}
                </div>
                <p className="text-[11px] text-slate-500">
                  ตราสัญลักษณ์นี้จะปรากฏบนปกสมุด ปพ.5, บัตรนักเรียน, เกียรติบัตร และมุมซ้ายบนของเมนูระบบ
                </p>
              </div>
            </div>

            {/* Logo Options Radio Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                เลือกประเภทตราสัญลักษณ์:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Garuda */}
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logo_type: 'garuda' })}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    settings.logo_type === 'garuda'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200 font-bold text-amber-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <SchoolLogo logoType="garuda" size="md" />
                  <span className="text-xs">ตราครุฑ (สพฐ.)</span>
                </button>

                {/* Education */}
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logo_type: 'education' })}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    settings.logo_type === 'education'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200 font-bold text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <SchoolLogo logoType="education" size="md" />
                  <span className="text-xs">ตราเสมา (ศธ.)</span>
                </button>

                {/* Seal */}
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logo_type: 'seal' })}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    settings.logo_type === 'seal'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200 font-bold text-emerald-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <SchoolLogo logoType="seal" size="md" />
                  <span className="text-xs">ตราประทับทอง</span>
                </button>

                {/* Custom Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, logo_type: 'custom' });
                    if (!settings.logo_url && fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    settings.logo_type === 'custom'
                      ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200 font-bold text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs">อัปโหลดรูปภาพ</span>
                </button>
              </div>
            </div>

            {/* Custom Upload Controls */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-indigo-950">อัปโหลดไฟล์รูปภาพโลโก้โรงเรียน (PNG, JPG, SVG)</div>
                  <div className="text-[11px] text-slate-500">รองรับไฟล์ภาพขนาดไม่เกิน 2MB แนะนำภาพพื้นหลังโปร่งใส (Transparent)</div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์ภาพ</span>
                  </button>

                  {settings.logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logo_url: '', logo_type: 'garuda' })}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="ลบรูปภาพโลโก้ที่อัปโหลด"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Image URL input */}
              <div className="pt-2 border-t border-indigo-100">
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                  หรือวาง URL รูปภาพโลโก้ (Image URL):
                </label>
                <input
                  type="url"
                  value={settings.logo_url || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, logo_url: e.target.value, logo_type: 'custom' })
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: School Core Profile */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-600" />
                <span>ข้อมูลชื่อและสังกัดสถานศึกษา (School Identification)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโรงเรียน (ภาษาไทย) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.school_name}
                  onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                  placeholder="เช่น โรงเรียนบ้านป่าส่าน"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโรงเรียน (ภาษาอังกฤษ)
                </label>
                <input
                  type="text"
                  value={settings.school_name_en || ''}
                  onChange={(e) => setSettings({ ...settings, school_name_en: e.target.value })}
                  placeholder="เช่น Ban Pa San School"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสสถานศึกษา (10 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={settings.school_code || ''}
                  onChange={(e) => setSettings({ ...settings, school_code: e.target.value })}
                  placeholder="เช่น 1050123456"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เขตพื้นที่การศึกษา / สังกัด
                </label>
                <input
                  type="text"
                  value={settings.affiliation || ''}
                  onChange={(e) => setSettings({ ...settings, affiliation: e.target.value })}
                  placeholder="เช่น สพป. เชียงใหม่ เขต 1"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กระทรวง / กรมต้นสังกัด
                </label>
                <input
                  type="text"
                  value={settings.ministry || ''}
                  onChange={(e) => setSettings({ ...settings, ministry: e.target.value })}
                  placeholder="สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ปีการศึกษาปัจจุบัน
                </label>
                <input
                  type="text"
                  value={settings.academic_year}
                  onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                  placeholder="เช่น 2569"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สีประจำสถานศึกษา / โทนสีเอกสาร
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.theme_accent_color || '#059669'}
                    onChange={(e) => setSettings({ ...settings, theme_accent_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={settings.theme_accent_color || '#059669'}
                    onChange={(e) => setSettings({ ...settings, theme_accent_color: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Location and Contact */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                <span>ที่ตั้งและข้อมูลการติดต่อ (Location & Contact)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">ที่ตั้ง / ถนน / หมู่ที่</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="เช่น หมู่ 4 ถนนโชตนา"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ตำบล / แขวง</label>
                <input
                  type="text"
                  value={settings.subdistrict || ''}
                  onChange={(e) => setSettings({ ...settings, subdistrict: e.target.value })}
                  placeholder="เช่น ป่าส่าน"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อำเภอ / เขต</label>
                <input
                  type="text"
                  value={settings.district || ''}
                  onChange={(e) => setSettings({ ...settings, district: e.target.value })}
                  placeholder="เช่น เมือง"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={settings.province || ''}
                  onChange={(e) => setSettings({ ...settings, province: e.target.value })}
                  placeholder="เช่น เชียงใหม่"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสไปรษณีย์</label>
                <input
                  type="text"
                  value={settings.postal_code || ''}
                  onChange={(e) => setSettings({ ...settings, postal_code: e.target.value })}
                  placeholder="เช่น 50000"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={settings.phone_number || ''}
                  onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                  placeholder="เช่น 053-123456"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมล / เว็บไซต์</label>
                <input
                  type="text"
                  value={settings.website_or_email || ''}
                  onChange={(e) => setSettings({ ...settings, website_or_email: e.target.value })}
                  placeholder="เช่น info@school.ac.th"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Director and Signatures */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <span>ผู้บริหารสถานศึกษาและครูผู้สอน (Administration & Signatures)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้อำนวยการสถานศึกษา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.director_name}
                  onChange={(e) => setSettings({ ...settings, director_name: e.target.value })}
                  placeholder="เช่น นายประเสริฐ สุขสวัสดิ์"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่ง / วิทยฐานะ ผอ.
                </label>
                <input
                  type="text"
                  value={settings.director_title || ''}
                  onChange={(e) => setSettings({ ...settings, director_title: e.target.value })}
                  placeholder="เช่น ผู้อำนวยการชำนาญการพิเศษ"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              {/* Director Signature Upload */}
              <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">ลายเซ็นดิจิทัล ผู้อำนวยการ (PNG โปร่งใส)</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={sigDirectorInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDirectorSignatureUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sigDirectorInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>อัปโหลดลายเซ็น</span>
                    </button>
                    {settings.director_signature_url && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, director_signature_url: '' })}
                        className="text-rose-600 hover:text-rose-700 p-1 text-xs"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
                {settings.director_signature_url && (
                  <div className="h-14 p-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                    <img
                      src={settings.director_signature_url}
                      alt="ลายเซ็น ผอ."
                      className="max-h-12 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อครูประจำชั้น / ผู้บันทึกคะแนน
                </label>
                <input
                  type="text"
                  value={settings.teacher_name || ''}
                  onChange={(e) => setSettings({ ...settings, teacher_name: e.target.value })}
                  placeholder="เช่น ครูสมศรี จิตเมตตา"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>

              {/* Teacher Signature Upload */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">ลายเซ็นดิจิทัลครู</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={sigTeacherInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleTeacherSignatureUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sigTeacherInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>อัปโหลด</span>
                    </button>
                    {settings.teacher_signature_url && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, teacher_signature_url: '' })}
                        className="text-rose-600 hover:text-rose-700 p-1 text-xs"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
                {settings.teacher_signature_url && (
                  <div className="h-10 p-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                    <img
                      src={settings.teacher_signature_url}
                      alt="ลายเซ็นครู"
                      className="max-h-8 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              กู้คืนค่าเริ่มต้น
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </div>
        </form>

        {/* Right Column: Real-Time Live Preview Studio */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>จำลองการแสดงผลจริง (Live Preview)</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                อัปเดตทันที
              </span>
            </div>

            {/* Preview Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActivePreviewTab('navbar')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                  activePreviewTab === 'navbar'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แถบเมนู
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('pp5')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                  activePreviewTab === 'pp5'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ปก ปพ.5
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('idcard')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                  activePreviewTab === 'idcard'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                บัตรนักเรียน
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('cert')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                  activePreviewTab === 'cert'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เกียรติบัตร
              </button>
            </div>

            {/* Preview Viewport */}
            <div className="bg-slate-100/80 p-3 sm:p-4 rounded-2xl border border-slate-200">
              {/* Preview 1: Navbar */}
              {activePreviewTab === 'navbar' && (
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SchoolLogo settings={settings} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-xs truncate">
                        {settings.school_name || 'ชื่อโรงเรียน'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {settings.affiliation || 'ระบบบันทึกคะแนนนักเรียน'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 shrink-0">
                    ปีการศึกษา {settings.academic_year}
                  </span>
                </div>
              )}

              {/* Preview 2: Pp5 Book Cover */}
              {activePreviewTab === 'pp5' && (
                <div className="bg-white p-5 rounded-xl shadow-md border-2 border-slate-800 text-center space-y-3">
                  <div className="flex justify-center">
                    <SchoolLogo settings={settings} size="lg" />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {settings.ministry || 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)'}
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
                  </div>
                  <div className="text-xs font-bold text-indigo-900">
                    {settings.school_name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {settings.affiliation}
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-around">
                    <div>ผอ.: {settings.director_name}</div>
                    <div>ครูประจำชั้น: {settings.teacher_name || 'ครูผู้สอน'}</div>
                  </div>
                </div>
              )}

              {/* Preview 3: Student ID Card */}
              {activePreviewTab === 'idcard' && (
                <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-white/10 rounded-xl backdrop-blur-xs">
                      <SchoolLogo settings={settings} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-indigo-200 font-semibold tracking-wide">
                        บัตรประจำตัวนักเรียน
                      </div>
                      <div className="text-xs font-bold truncate">
                        {settings.school_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-12 h-14 bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      รูปถ่าย
                    </div>
                    <div className="text-[11px] space-y-0.5 min-w-0 text-indigo-100">
                      <div className="font-bold text-white text-xs truncate">เด็กชายธีรเดช สุขใจ</div>
                      <div>เลขประจำตัว: 1-5099-01010-01-1</div>
                      <div>ชั้นประถมศึกษาปีที่ 5/1</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/20 text-[9px] text-indigo-300 flex justify-between">
                    <span>ปีการศึกษา {settings.academic_year}</span>
                    <span>ผอ. {settings.director_name}</span>
                  </div>
                </div>
              )}

              {/* Preview 4: Certificate */}
              {activePreviewTab === 'cert' && (
                <div className="bg-[#FFFDF7] p-5 rounded-xl shadow-md border-4 border-amber-500/50 text-center space-y-2 relative">
                  <div className="flex justify-center">
                    <SchoolLogo settings={settings} size="md" />
                  </div>
                  <div className="text-xs font-black text-amber-900">
                    {settings.school_name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ขอมอบเกียรติบัตรฉบับนี้เพื่อแสดงว่า
                  </div>
                  <div className="text-xs font-bold text-slate-800 py-1 border-b border-dotted border-amber-300 w-40 mx-auto">
                    เด็กชายกฤษณะ พงษ์ศิริ
                  </div>
                  <div className="text-[10px] text-slate-600">
                    มีผลการเรียนดีเด่น ประจำปีการศึกษา {settings.academic_year}
                  </div>
                  <div className="pt-2 text-[9px] text-slate-500 flex justify-around">
                    <div>({settings.teacher_name || 'ครูประจำชั้น'})</div>
                    <div>({settings.director_name})</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>การเชื่อมโยงระบบแบบเรียลไทม์:</span>
              </div>
              <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                <li>ชื่อโรงเรียนจะเปลี่ยนในเมนูนำทาง (Navbar) ด้านบนทันที</li>
                <li>ตราสัญลักษณ์/โลโก้จะแสดงบนหัวเอกสารและบัตรนักเรียนอัตโนมัติ</li>
                <li>ชื่อผู้อำนวยการจะแสดงในช่องลงนามอนุมัติ ปพ.5 และเกียรติบัตร</li>
                <li>ข้อมูลทั้งหมดถูกจัดเก็บลงฐานข้อมูลอย่างปลอดภัย</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
