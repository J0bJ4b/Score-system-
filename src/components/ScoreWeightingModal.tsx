import React, { useState, useMemo } from 'react';
import { Subject, Term, ScoreWeightingConfig } from '../types';
import { storage, DEFAULT_SCORE_WEIGHTING_CONFIG } from '../services/storage';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  BookOpen,
  Calendar,
  Info,
  X,
  RefreshCw,
  Award,
  ArrowRight,
} from 'lucide-react';

interface ScoreWeightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  currentSubjectId?: string;
  terms: Term[];
  currentTermId?: string;
  onWeightingApplied: () => void;
}

export interface WeightingPreset {
  id: string;
  name: string;
  description: string;
  regular: number;
  midterm: number;
  final: number;
  recommendedFor: string;
  badgeColor: string;
}

export const WEIGHTING_PRESETS: WeightingPreset[] = [
  {
    id: 'preset-70-15-15',
    name: 'สพฐ. มาตรฐาน (70 : 15 : 15)',
    description: 'คะแนนเก็บระหว่างภาค 70% • สอบกลางภาค 15% • สอบปลายภาค 15%',
    regular: 70,
    midterm: 15,
    final: 15,
    recommendedFor: 'วิชาพื้นฐานทั่วไป (ภาษาไทย, สังคม, สุขศึกษา)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 'preset-80-10-10',
    name: 'เน้นปฏิบัติและกิจกรรม (80 : 10 : 10)',
    description: 'คะแนนเก็บเน้นชิ้นงาน 80% • สอบกลางภาค 10% • สอบปลายภาค 10%',
    regular: 80,
    midterm: 10,
    final: 10,
    recommendedFor: 'ศิลปะ, ดนตรี-นาฏศิลป์, พลศึกษา, การงานอาชีพ, วิทยาการคำนวณ',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  {
    id: 'preset-60-20-20',
    name: 'วิชาการเข้มข้น (60 : 20 : 20)',
    description: 'คะแนนเก็บ 60% • สอบกลางภาค 20% • สอบปลายภาค 20%',
    regular: 60,
    midterm: 20,
    final: 20,
    recommendedFor: 'คณิตศาสตร์, วิทยาศาสตร์, ภาษาอังกฤษ, ฟิสิกส์/เคมี',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  {
    id: 'preset-50-20-30',
    name: 'เน้นการสอบวัดผล (50 : 20 : 30)',
    description: 'คะแนนเก็บ 50% • สอบกลางภาค 20% • สอบปลายภาค 30%',
    recommendedFor: 'วิชาระดับมัธยมปลาย หรือวิชาที่มีข้อสอบกลาง',
    regular: 50,
    midterm: 20,
    final: 30,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 'preset-90-0-10',
    name: 'โครงงาน / IS / สัมมนา (90 : 0 : 10)',
    description: 'คะแนนชิ้นงาน/โครงงาน 90% • สอบนำเสนอปลายภาค 10% (ไม่มีกลางภาค)',
    regular: 90,
    midterm: 0,
    final: 10,
    recommendedFor: 'วิชาโครงงาน, IS, กิจกรรมพัฒนาผู้เรียน',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
];

export const ScoreWeightingModal: React.FC<ScoreWeightingModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentSubjectId,
  terms,
  currentTermId,
  onWeightingApplied,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    currentSubjectId || subjects[0]?.id || ''
  );
  const [targetScope, setTargetScope] = useState<'single' | 'all'>('single');
  const [targetTermScope, setTargetTermScope] = useState<'both' | 'current'>(
    'both'
  );

  // Weighting Ratios
  const [regularRatio, setRegularRatio] = useState<number>(70);
  const [midtermRatio, setMidtermRatio] = useState<number>(15);
  const [finalRatio, setFinalRatio] = useState<number>(15);

  // Sub-items breakdown
  const [numRegularItems, setNumRegularItems] = useState<number>(3);
  const [numMidtermItems, setNumMidtermItems] = useState<number>(1);
  const [numFinalItems, setNumFinalItems] = useState<number>(1);

  // Custom Item Name Scheme
  const [regularItemPrefix, setRegularItemPrefix] = useState<string>('ใบงาน/ชิ้นงานที่');

  // Confirmation state
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Load existing config on subject change
  React.useEffect(() => {
    if (selectedSubjectId) {
      const existing = storage.getSubjectWeightingConfig(selectedSubjectId);
      if (existing) {
        setRegularRatio(existing.regular_ratio ?? 70);
        setMidtermRatio(existing.midterm_ratio ?? 15);
        setFinalRatio(existing.final_ratio ?? 15);
        setNumRegularItems(existing.num_regular_items ?? 3);
        setNumMidtermItems(existing.num_midterm_items ?? 1);
        setNumFinalItems(existing.num_final_items ?? 1);
      }
    }
  }, [selectedSubjectId]);

  const totalRatio = regularRatio + midtermRatio + finalRatio;
  const isValidRatio = totalRatio === 100;

  // Calculate points out of 50 per term
  const pointsCalculation = useMemo(() => {
    const totalPoints = 50;
    const regPoints = Math.round((regularRatio / 100) * totalPoints);
    const midPoints = Math.round((midtermRatio / 100) * totalPoints);
    const finPoints = totalPoints - regPoints - midPoints;

    // Simulated Items
    const simItems: Array<{
      category: 'regular' | 'midterm' | 'final';
      name: string;
      maxScore: number;
    }> = [];

    // Regular
    if (numRegularItems > 0 && regPoints > 0) {
      const perReg = Math.floor(regPoints / numRegularItems);
      const rem = regPoints % numRegularItems;
      for (let i = 1; i <= numRegularItems; i++) {
        simItems.push({
          category: 'regular',
          name: `${regularItemPrefix} ${i}`,
          maxScore: perReg + (i === 1 ? rem : 0),
        });
      }
    }

    // Midterm
    if (numMidtermItems > 0 && midPoints > 0) {
      const perMid = Math.floor(midPoints / numMidtermItems);
      const rem = midPoints % numMidtermItems;
      for (let i = 1; i <= numMidtermItems; i++) {
        simItems.push({
          category: 'midterm',
          name:
            numMidtermItems === 1
              ? 'สอบวัดผลกลางภาค'
              : `สอบกลางภาค ตอนที่ ${i}`,
          maxScore: perMid + (i === 1 ? rem : 0),
        });
      }
    }

    // Final
    if (numFinalItems > 0 && finPoints > 0) {
      const perFin = Math.floor(finPoints / numFinalItems);
      const rem = finPoints % numFinalItems;
      for (let i = 1; i <= numFinalItems; i++) {
        simItems.push({
          category: 'final',
          name:
            numFinalItems === 1
              ? 'สอบวัดผลปลายภาค'
              : `สอบปลายภาค ตอนที่ ${i}`,
          maxScore: perFin + (i === 1 ? rem : 0),
        });
      }
    }

    const simTotal = simItems.reduce((acc, item) => acc + item.maxScore, 0);

    return {
      regularPoints: regPoints,
      midtermPoints: midPoints,
      finalPoints: finPoints,
      simItems,
      simTotal,
    };
  }, [
    regularRatio,
    midtermRatio,
    finalRatio,
    numRegularItems,
    numMidtermItems,
    numFinalItems,
    regularItemPrefix,
  ]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleSelectPreset = (preset: WeightingPreset) => {
    setRegularRatio(preset.regular);
    setMidtermRatio(preset.midterm);
    setFinalRatio(preset.final);
  };

  const handleApplyWeighting = () => {
    if (!isValidRatio) return;

    const config: ScoreWeightingConfig = {
      subject_id: targetScope === 'single' ? selectedSubjectId : undefined,
      regular_ratio: regularRatio,
      midterm_ratio: midtermRatio,
      final_ratio: finalRatio,
      num_regular_items: numRegularItems,
      num_midterm_items: numMidtermItems,
      num_final_items: numFinalItems,
    };

    const termIdToApply =
      targetTermScope === 'current' ? currentTermId : undefined;
    const applyToAll = targetScope === 'all';

    storage.applyWeightingToSubject(
      selectedSubjectId,
      config,
      termIdToApply,
      applyToAll
    );

    setIsSuccess(true);
    setShowConfirm(false);
    onWeightingApplied();

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
              <Sliders className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>การตั้งค่าสัดส่วนคะแนนแบบกำหนดเอง</span>
                <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                  Custom Score Weighting
                </span>
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                กำหนดเปอร์เซ็นต์คะแนนเก็บ กลางภาค และปลายภาค (คำนวณเต็ม 50 คะแนนต่อเทอมอัตโนมัติ)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Top Row: Target Subject & Term Selection */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>วิชาที่ต้องการตั้งค่า</span>
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={targetScope === 'all'}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.name} ({s.credit} นก.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>ขอบเขตการนำไปใช้</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetScope('single')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                    targetScope === 'single'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  เฉพาะวิชานี้
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('all')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                    targetScope === 'all'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทุกวิชา ({subjects.length} วิชา)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>ภาคเรียนที่นำไปใช้</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetTermScope('both')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                    targetTermScope === 'both'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทั้ง 2 เทอม (1 และ 2)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetTermScope('current')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                    targetTermScope === 'current'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  เฉพาะเทอมปัจจุบัน
                </button>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>เลือกแม่แบบสัดส่วนคะแนนยอดนิยม (Presets)</span>
              </span>
              <span className="text-xs text-slate-400">
                คลิกเพื่อโหลดค่าสัดส่วนมาตรฐาน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {WEIGHTING_PRESETS.map((preset) => {
                const isSelected =
                  regularRatio === preset.regular &&
                  midtermRatio === preset.midterm &&
                  finalRatio === preset.final;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-2 ring-indigo-300/50'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-800">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">
                      {preset.description}
                    </div>
                    <div className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100 font-medium inline-block line-clamp-1">
                      💡 {preset.recommendedFor}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Weighting Sliders */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>กำหนดสัดส่วนร้อยละ (รวมต้องเท่ากับ 100%)</span>
              </span>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  isValidRatio
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {isValidRatio ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>รวม {totalRatio}% (ถูกต้อง)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>รวม {totalRatio}% (ต้องรวมได้ 100%)</span>
                  </>
                )}
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className="space-y-1.5">
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                <div
                  style={{ width: `${Math.min(100, regularRatio)}%` }}
                  className="bg-sky-500 h-full transition-all duration-300 relative group"
                  title={`คะแนนเก็บ ${regularRatio}% (${pointsCalculation.regularPoints} คะแนน)`}
                />
                <div
                  style={{ width: `${Math.min(100, midtermRatio)}%` }}
                  className="bg-amber-500 h-full transition-all duration-300 relative group"
                  title={`กลางภาค ${midtermRatio}% (${pointsCalculation.midtermPoints} คะแนน)`}
                />
                <div
                  style={{ width: `${Math.min(100, finalRatio)}%` }}
                  className="bg-purple-500 h-full transition-all duration-300 relative group"
                  title={`ปลายภาค ${finalRatio}% (${pointsCalculation.finalPoints} คะแนน)`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>
                    คะแนนเก็บ: {regularRatio}% ({pointsCalculation.regularPoints} คะแนน)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>
                    กลางภาค: {midtermRatio}% ({pointsCalculation.midtermPoints} คะแนน)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span>
                    ปลายภาค: {finalRatio}% ({pointsCalculation.finalPoints} คะแนน)
                  </span>
                </div>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Regular Slider */}
              <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">
                    1. คะแนนเก็บระหว่างภาค
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200 text-sm">
                    {regularRatio}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={regularRatio}
                  onChange={(e) => setRegularRatio(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="text-[11px] text-sky-700 font-medium">
                  = {pointsCalculation.regularPoints} คะแนนเต็ม (ต่อเทอม)
                </div>
              </div>

              {/* Midterm Slider */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    2. สอบกลางภาค
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-200 text-sm">
                    {midtermRatio}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={midtermRatio}
                  onChange={(e) => setMidtermRatio(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="text-[11px] text-amber-700 font-medium">
                  = {pointsCalculation.midtermPoints} คะแนนเต็ม (ต่อเทอม)
                </div>
              </div>

              {/* Final Slider */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">
                    3. สอบปลายภาค
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 text-sm">
                    {finalRatio}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={finalRatio}
                  onChange={(e) => setFinalRatio(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="text-[11px] text-purple-700 font-medium">
                  = {pointsCalculation.finalPoints} คะแนนเต็ม (ต่อเทอม)
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Items Breakdown Configuration */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>การแบ่งช่องคะแนนย่อยและการตั้งชื่อ (Assignment Sub-items)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนช่องคะแนนเก็บ (ชิ้นงาน/ใบงาน)
                </label>
                <select
                  value={numRegularItems}
                  onChange={(e) => setNumRegularItems(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 ช่อง (รวมยอดเดียว)</option>
                  <option value={2}>2 ช่อง (เฉลี่ยเท่าๆ กัน)</option>
                  <option value={3}>3 ช่อง (แนะนำมาตรฐาน)</option>
                  <option value={4}>4 ช่อง</option>
                  <option value={5}>5 ช่อง</option>
                  <option value={6}>6 ช่อง</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนตอนสอบกลางภาค
                </label>
                <select
                  value={numMidtermItems}
                  onChange={(e) => setNumMidtermItems(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>0 ตอน (ไม่มีสอบกลางภาค)</option>
                  <option value={1}>1 ตอน (สอบกลางภาค)</option>
                  <option value={2}>2 ตอน (เช่น ปรนัย + อัตนัย)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนตอนสอบปลายภาค
                </label>
                <select
                  value={numFinalItems}
                  onChange={(e) => setNumFinalItems(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 ตอน (สอบปลายภาค)</option>
                  <option value={2}>2 ตอน (เช่น ปรนัย + ข้อเขียน)</option>
                  <option value={3}>3 ตอน</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                คำนำหน้าชื่อช่องคะแนนเก็บ
              </label>
              <input
                type="text"
                value={regularItemPrefix}
                onChange={(e) => setRegularItemPrefix(e.target.value)}
                placeholder="เช่น ใบงานที่, ชิ้นงานที่, กิจกรรมที่"
                className="w-full sm:w-1/2 px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  ตัวอย่างโครงสร้างคะแนนที่จะสร้างขึ้น (รวม 50 คะแนนพอดีเป๊ะ)
                </span>
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                รวมทั้งหมด {pointsCalculation.simItems.length} ช่อง ={' '}
                {pointsCalculation.simTotal} คะแนน
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">ชื่อรายการช่องคะแนน</th>
                    <th className="py-2 px-3 text-center w-28">ประเภท</th>
                    <th className="py-2 px-3 text-center w-24">คะแนนเต็ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pointsCalculation.simItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                            item.category === 'regular'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : item.category === 'midterm'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.category === 'regular'
                            ? 'คะแนนเก็บ'
                            : item.category === 'midterm'
                            ? 'กลางภาค'
                            : 'ปลายภาค'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-indigo-700 font-mono">
                        {item.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              ระบบจะคำนวณและปรับช่องคะแนนให้ได้ 50 คะแนนเต็มต่อเทอมอย่างแม่นยำ
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={!isValidRatio}
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {targetScope === 'all'
                  ? `นำไปใช้กับทุกวิชา (${subjects.length} วิชา)`
                  : `บันทึกสัดส่วนวิชา ${activeSubject?.name || ''}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-slate-800">
                ยืนยันการปรับสัดส่วนคะแนน
              </h4>
              <p className="text-xs text-slate-500">
                {targetScope === 'all'
                  ? `ระบบจะทำการรีเซ็ตโครงสร้างช่องคะแนนของ "ทุกวิชา (${subjects.length} วิชา)" ให้เป็นสัดส่วน ${regularRatio}:${midtermRatio}:${finalRatio}`
                  : `ระบบจะทำการปรับโครงสร้างช่องคะแนนของวิชา "${activeSubject?.name}" ให้เป็นสัดส่วน ${regularRatio}:${midtermRatio}:${finalRatio}`}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>ข้อควรทราบ:</span>
              </div>
              <p>
                ช่องคะแนนเดิมของวิชาที่เลือกจะถูกสร้างใหม่ตามโครงสร้างนี้ (รวม 50 คะแนนเต็มต่อเทอม)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleApplyWeighting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                ยืนยันและนำไปใช้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {isSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-70 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs sm:text-sm font-bold">
            บันทึกและปรับโครงสร้างสัดส่วนคะแนนเรียบร้อยแล้ว!
          </span>
        </div>
      )}
    </div>
  );
};
