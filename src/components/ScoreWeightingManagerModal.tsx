import React, { useState, useMemo } from 'react';
import {
  Subject,
  Term,
  ScoreItem,
  ScoreWeightingConfig,
  CustomGradingScaleSettings,
  GradingScaleBand,
} from '../types';
import {
  storage,
  DEFAULT_SCORE_WEIGHTING_CONFIG,
  DEFAULT_GRADING_SCALE_SETTINGS,
} from '../services/storage';
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  BookOpen,
  Award,
  Settings,
  RotateCcw,
  Check,
  Percent,
  HelpCircle,
} from 'lucide-react';

interface ScoreWeightingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  terms: Term[];
  activeSubject?: Subject;
  activeTerm?: Term;
  onConfigApplied: () => void;
}

export const ScoreWeightingManagerModal: React.FC<ScoreWeightingManagerModalProps> = ({
  isOpen,
  onClose,
  subjects,
  terms,
  activeSubject,
  activeTerm,
  onConfigApplied,
}) => {
  const [activeTab, setActiveTab] = useState<'ratio' | 'grading_scale'>('ratio');
  const [selectedSubId, setSelectedSubId] = useState<string>(
    activeSubject?.id || subjects[0]?.id || ''
  );

  // Weighting State
  const currentConfig = useMemo(() => {
    return storage.getSubjectWeightingConfig(selectedSubId);
  }, [selectedSubId]);

  const [regularRatio, setRegularRatio] = useState<number>(currentConfig.regular_ratio || 70);
  const [midtermRatio, setMidtermRatio] = useState<number>(currentConfig.midterm_ratio || 15);
  const [finalRatio, setFinalRatio] = useState<number>(currentConfig.final_ratio || 15);

  const [numRegularItems, setNumRegularItems] = useState<number>(
    currentConfig.num_regular_items || 3
  );
  const [numMidtermItems, setNumMidtermItems] = useState<number>(
    currentConfig.num_midterm_items || 1
  );
  const [numFinalItems, setNumFinalItems] = useState<number>(
    currentConfig.num_final_items || 1
  );

  const [applyScope, setApplyScope] = useState<'current_term' | 'both_terms' | 'all_subjects'>(
    'both_terms'
  );
  const [presetSelected, setPresetSelected] = useState<string>('70:15:15');
  const [successMsg, setSuccessMsg] = useState('');

  // Grading Scale Settings State
  const [scaleSettings, setScaleSettings] = useState<CustomGradingScaleSettings>(() =>
    storage.getGradingScaleSettings()
  );

  const targetSubject = subjects.find((s) => s.id === selectedSubId) || subjects[0];

  // Ratio calculations
  const totalRatio = regularRatio + midtermRatio + finalRatio;
  const isRatioValid = totalRatio === 100;

  // Points conversion (50 max points per term)
  const regularPoints = Math.round((regularRatio / (totalRatio || 100)) * 50);
  const midtermPoints = Math.round((midtermRatio / (totalRatio || 100)) * 50);
  const finalPoints = 50 - regularPoints - midtermPoints;

  if (!isOpen) return null;

  // Preset Handlers
  const handleSelectPreset = (preset: string) => {
    setPresetSelected(preset);
    if (preset === '70:15:15') {
      setRegularRatio(70);
      setMidtermRatio(15);
      setFinalRatio(15);
      setNumRegularItems(3);
      setNumMidtermItems(1);
      setNumFinalItems(1);
    } else if (preset === '60:20:20') {
      setRegularRatio(60);
      setMidtermRatio(20);
      setFinalRatio(20);
      setNumRegularItems(3);
      setNumMidtermItems(1);
      setNumFinalItems(1);
    } else if (preset === '80:10:10') {
      setRegularRatio(80);
      setMidtermRatio(10);
      setFinalRatio(10);
      setNumRegularItems(4);
      setNumMidtermItems(1);
      setNumFinalItems(1);
    } else if (preset === '50:25:25') {
      setRegularRatio(50);
      setMidtermRatio(25);
      setFinalRatio(25);
      setNumRegularItems(2);
      setNumMidtermItems(1);
      setNumFinalItems(1);
    }
  };

  // Apply Weighting
  const handleApplyWeighting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRatioValid) {
      alert('ผลรวมสัดส่วนคะแนนต้องเท่ากับ 100% พอดี');
      return;
    }

    const config: ScoreWeightingConfig = {
      subject_id: selectedSubId,
      regular_ratio: regularRatio,
      midterm_ratio: midtermRatio,
      final_ratio: finalRatio,
      num_regular_items: numRegularItems,
      num_midterm_items: numMidtermItems,
      num_final_items: numFinalItems,
      name: `${regularRatio}:${midtermRatio}:${finalRatio}`,
    };

    if (applyScope === 'all_subjects') {
      const confirmAction = window.confirm(
        `คุณต้องการปรับสัดส่วนคะแนน (${regularRatio}:${midtermRatio}:${finalRatio}) ให้กับทุกวิชาในห้องเรียน (${subjects.length} วิชา) ทั้ง 2 เทอม หรือไม่?`
      );
      if (!confirmAction) return;

      storage.applyWeightingToSubject(selectedSubId, config, undefined, true);
      setSuccessMsg(`ปรับสัดส่วนคะแนนสำเร็จให้กับทุกวิชา (${subjects.length} วิชา) ครบถ้วน!`);
    } else if (applyScope === 'both_terms') {
      storage.applyWeightingToSubject(selectedSubId, config, undefined, false);
      setSuccessMsg(`ปรับสัดส่วนคะแนนวิชา "${targetSubject.name}" ทั้ง 2 เทอม เรียบร้อยแล้ว`);
    } else {
      const termId = activeTerm?.id || 'term-1';
      storage.applyWeightingToSubject(selectedSubId, config, termId, false);
      setSuccessMsg(`ปรับสัดส่วนคะแนนวิชา "${targetSubject.name}" ใน ${activeTerm?.name || 'เทอมนี้'} สำเร็จ`);
    }

    onConfigApplied();
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  // Save Grading Scale
  const handleSaveGradingScale = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveGradingScaleSettings(scaleSettings);
    setSuccessMsg('บันทึกเกณฑ์การตัดเกรดเรียบร้อยแล้ว');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Reset Scale to MOE 8-Grade Standard
  const handleResetGradingScaleToDefault = () => {
    setScaleSettings(DEFAULT_GRADING_SCALE_SETTINGS);
    storage.saveGradingScaleSettings(DEFAULT_GRADING_SCALE_SETTINGS);
    setSuccessMsg('รีเซ็ตเกณฑ์ตัดเกรดกลับเป็นมาตรฐาน สพฐ. 8 ระดับ เรียบร้อยแล้ว');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                ตั้งค่าสัดส่วนคะแนน & เกณฑ์การตัดเกรด
              </h2>
              <p className="text-xs text-indigo-100">
                Custom Score Weighting & Evaluation Criteria (มาตรฐาน สพฐ. 50 คะแนน/เทอม)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('ratio')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ratio'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>สัดส่วนคะแนน (Weighting Ratios)</span>
          </button>

          <button
            onClick={() => setActiveTab('grading_scale')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'grading_scale'
                ? 'bg-white text-purple-700 border-t-2 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>เกณฑ์การตัดเกรด (Grading Scale)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* =========================================================================
              TAB 1: WEIGHTING RATIOS & SMART GENERATOR
              ========================================================================= */}
          {activeTab === 'ratio' && (
            <form onSubmit={handleApplyWeighting} className="space-y-6">
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกวิชาที่ต้องการตั้งค่า
                </label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code}) - {sub.credit} หน่วยกิต
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Selection Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  เลือกสัดส่วนคะแนนมาตรฐาน สพฐ. (Presets)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: '70:15:15',
                      label: '70 : 15 : 15',
                      sublabel: 'ภาษาไทย, สังคม, อังกฤษ',
                      color: 'border-blue-300 bg-blue-50/70 text-blue-900',
                    },
                    {
                      id: '60:20:20',
                      label: '60 : 20 : 20',
                      sublabel: 'คณิตศาสตร์, วิทยาศาสตร์',
                      color: 'border-teal-300 bg-teal-50/70 text-teal-900',
                    },
                    {
                      id: '80:10:10',
                      label: '80 : 10 : 10',
                      sublabel: 'ศิลปะ, สุขศึกษา, การงาน',
                      color: 'border-emerald-300 bg-emerald-50/70 text-emerald-900',
                    },
                    {
                      id: '50:25:25',
                      label: '50 : 25 : 25',
                      sublabel: 'วิชาเน้นการสอบกลาง-ปลาย',
                      color: 'border-purple-300 bg-purple-50/70 text-purple-900',
                    },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        presetSelected === p.id
                          ? `${p.color} ring-2 ring-indigo-500 shadow-xs`
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-extrabold text-sm">{p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {p.sublabel}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">สัดส่วนคะแนนรวม (ต่อภาคเรียน):</span>
                  <span
                    className={`font-extrabold px-2 py-0.5 rounded-full ${
                      isRatioValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    รวม {totalRatio}% (50 คะแนนเต็ม)
                  </span>
                </div>

                {/* Progress ratio visualization */}
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-200 shadow-inner text-[9px] font-black text-white text-center leading-4">
                  <div
                    style={{ width: `${(regularRatio / (totalRatio || 100)) * 100}%` }}
                    className="bg-sky-500 transition-all"
                  >
                    {regularRatio > 10 ? `${regularRatio}%` : ''}
                  </div>
                  <div
                    style={{ width: `${(midtermRatio / (totalRatio || 100)) * 100}%` }}
                    className="bg-amber-500 transition-all"
                  >
                    {midtermRatio > 10 ? `${midtermRatio}%` : ''}
                  </div>
                  <div
                    style={{ width: `${(finalRatio / (totalRatio || 100)) * 100}%` }}
                    className="bg-purple-600 transition-all"
                  >
                    {finalRatio > 10 ? `${finalRatio}%` : ''}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-900 border border-sky-200">
                    <span className="text-[10px] text-sky-600 block">คะแนนเก็บระหว่างภาค</span>
                    <strong className="text-sm font-black">{regularRatio}%</strong>
                    <div className="text-[10px] text-sky-700 font-semibold mt-0.5">({regularPoints} คะแนน)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                    <span className="text-[10px] text-amber-600 block">สอบกลางภาค</span>
                    <strong className="text-sm font-black">{midtermRatio}%</strong>
                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5">({midtermPoints} คะแนน)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
                    <span className="text-[10px] text-purple-600 block">สอบปลายภาค</span>
                    <strong className="text-sm font-black">{finalRatio}%</strong>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">({finalPoints} คะแนน)</div>
                  </div>
                </div>
              </div>

              {/* Sliders / Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sky-900 mb-1">
                    คะแนนเก็บ (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={regularRatio}
                    onChange={(e) => {
                      setRegularRatio(Number(e.target.value));
                      setPresetSelected('custom');
                    }}
                    className="w-full px-3 py-2 text-sm bg-sky-50/50 border border-sky-300 rounded-xl font-bold text-sky-900"
                    required
                  />
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      จำนวนชิ้นงาน/ใบงาน
                    </label>
                    <select
                      value={numRegularItems}
                      onChange={(e) => setNumRegularItems(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} ชิ้นงาน (เฉลี่ย ~{Math.round(regularPoints / n)} คะแนน/ชิ้น)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    สอบกลางภาค (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={midtermRatio}
                    onChange={(e) => {
                      setMidtermRatio(Number(e.target.value));
                      setPresetSelected('custom');
                    }}
                    className="w-full px-3 py-2 text-sm bg-amber-50/50 border border-amber-300 rounded-xl font-bold text-amber-900"
                    required
                  />
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      จำนวนข้อสอบกลางภาค
                    </label>
                    <select
                      value={numMidtermItems}
                      onChange={(e) => setNumMidtermItems(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value={1}>1 รายการ ({midtermPoints} คะแนน)</option>
                      <option value={2}>2 รายการย่อย</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    สอบปลายภาค (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={finalRatio}
                    onChange={(e) => {
                      setFinalRatio(Number(e.target.value));
                      setPresetSelected('custom');
                    }}
                    className="w-full px-3 py-2 text-sm bg-purple-50/50 border border-purple-300 rounded-xl font-bold text-purple-900"
                    required
                  />
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      จำนวนข้อสอบปลายภาค
                    </label>
                    <select
                      value={numFinalItems}
                      onChange={(e) => setNumFinalItems(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value={1}>1 รายการ ({finalPoints} คะแนน)</option>
                      <option value={2}>2 รายการย่อย</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Apply Scope Option */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-indigo-950">
                  ขอบเขตการนำสัดส่วนนี้ไปปรับใช้:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="p-2.5 bg-white border border-indigo-200 rounded-xl flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="applyScope"
                      value="current_term"
                      checked={applyScope === 'current_term'}
                      onChange={() => setApplyScope('current_term')}
                      className="text-indigo-600"
                    />
                    <span>เฉพาะเทอมนี้ ({activeTerm?.name || 'เทอม 1'})</span>
                  </label>

                  <label className="p-2.5 bg-white border border-indigo-200 rounded-xl flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="applyScope"
                      value="both_terms"
                      checked={applyScope === 'both_terms'}
                      onChange={() => setApplyScope('both_terms')}
                      className="text-indigo-600"
                    />
                    <span>ทั้ง 2 เทอมของวิชานี้</span>
                  </label>

                  <label className="p-2.5 bg-white border border-indigo-200 rounded-xl flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="applyScope"
                      value="all_subjects"
                      checked={applyScope === 'all_subjects'}
                      onChange={() => setApplyScope('all_subjects')}
                      className="text-indigo-600"
                    />
                    <span>ทุกวิชาในห้องเรียน ({subjects.length} วิชา)</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={!isRatioValid}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>บันทึกและสร้างรายการคะแนนอัตโนมัติ</span>
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              TAB 2: CUSTOM GRADING SCALE SETTINGS
              ========================================================================= */}
          {activeTab === 'grading_scale' && (
            <form onSubmit={handleSaveGradingScale} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    เกณฑ์การประเมินและช่วงคะแนนตัดเกรด 8 ระดับ (สพฐ.)
                  </h3>
                  <p className="text-xs text-slate-500">
                    คำนวณจากคะแนนรวมตลอดปีการศึกษา (100 คะแนนเต็ม)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetGradingScaleToDefault}
                  className="text-xs text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  คืนค่ามาตรฐาน สพฐ.
                </button>
              </div>

              {/* Grade Bands Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-20">ระดับเกรด</th>
                      <th className="py-2.5 px-3 text-center w-28">คะแนนขั้นต่ำ (Min)</th>
                      <th className="py-2.5 px-3 text-center w-28">คะแนนสูงสุด (Max)</th>
                      <th className="py-2.5 px-3 text-center w-20">ค่าเกรด (GP)</th>
                      <th className="py-2.5 px-4">ความหมาย / ระดับผลการเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scaleSettings.bands.map((band, idx) => (
                      <tr key={band.grade} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${band.badgeColor}`}>
                            {band.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={band.minScore}
                            onChange={(e) => {
                              const updated = [...scaleSettings.bands];
                              updated[idx].minScore = Number(e.target.value);
                              setScaleSettings({ ...scaleSettings, bands: updated });
                            }}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={band.maxScore}
                            onChange={(e) => {
                              const updated = [...scaleSettings.bands];
                              updated[idx].maxScore = Number(e.target.value);
                              setScaleSettings({ ...scaleSettings, bands: updated });
                            }}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-indigo-900">
                          {band.gradePoint.toFixed(1)}
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={band.description}
                            onChange={(e) => {
                              const updated = [...scaleSettings.bands];
                              updated[idx].description = e.target.value;
                              setScaleSettings({ ...scaleSettings, bands: updated });
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-medium"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Threshold Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เกณฑ์คะแนนขั้นต่ำในการผ่านการประเมิน (Pass Threshold)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={scaleSettings.passingScore}
                      onChange={(e) =>
                        setScaleSettings({ ...scaleSettings, passingScore: Number(e.target.value) })
                      }
                      className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                    <span className="text-slate-500">คะแนน (ค่าปกติ สพฐ. คือ 50 คะแนน หรือเกรด 1 ขึ้นไป)</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เกณฑ์แจ้งเตือนนักเรียนกลุ่มเสี่ยง (At-Risk Alert)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={scaleSettings.atRiskThreshold}
                      onChange={(e) =>
                        setScaleSettings({ ...scaleSettings, atRiskThreshold: Number(e.target.value) })
                      }
                      className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                    <span className="text-slate-500">คะแนน (ส่งการแจ้งเตือนทาง LINE ให้ครูและผู้ปกครอง)</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-purple-200 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าเกณฑ์ตัดเกรด</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
