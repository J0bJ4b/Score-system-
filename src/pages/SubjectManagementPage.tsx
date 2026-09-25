import React, { useState, useMemo, useEffect } from 'react';
import { Subject, Term, ScoreItem, ScoreWeightingConfig, CustomGradingScaleSettings, GradingScaleBand } from '../types';
import { storage, DEFAULT_SCORE_WEIGHTING_CONFIG, DEFAULT_GRADING_SCALE_SETTINGS } from '../services/storage';
import { ScoreWeightingModal, WEIGHTING_PRESETS, WeightingPreset } from '../components/ScoreWeightingModal';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Sliders,
  Calendar,
  X,
  Layers,
  Settings2,
  Award,
  BarChart3,
  HelpCircle,
  Save,
  RotateCcw,
  Check,
  Percent,
} from 'lucide-react';

interface SubjectManagementPageProps {
  subjects: Subject[];
  terms: Term[];
  allScoreItems: ScoreItem[];
  onDataUpdated: () => void;
  initialTab?: 'items' | 'weighting' | 'grading_scale';
}

export const SubjectManagementPage: React.FC<SubjectManagementPageProps> = ({
  subjects,
  terms,
  allScoreItems,
  onDataUpdated,
  initialTab = 'items',
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'items' | 'weighting' | 'grading_scale'>(
    initialTab
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(terms[0]?.id || 'term-1');

  // Modals for Items tab
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isWeightingModalOpen, setIsWeightingModalOpen] = useState(false);

  // Form states - Subject
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredit, setSubCredit] = useState(1.0);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states - Score Item
  const [itemName, setItemName] = useState('');
  const [itemMaxScore, setItemMaxScore] = useState(10);
  const [itemCategory, setItemCategory] = useState<'regular' | 'midterm' | 'final'>('regular');
  const [editingItem, setEditingItem] = useState<ScoreItem | null>(null);

  // Weighting Tab Interactive States
  const [weightingScope, setWeightingScope] = useState<'single' | 'all'>('single');
  const [weightingTermScope, setWeightingTermScope] = useState<'both' | 'current'>('both');
  const [regularRatio, setRegularRatio] = useState<number>(70);
  const [midtermRatio, setMidtermRatio] = useState<number>(15);
  const [finalRatio, setFinalRatio] = useState<number>(15);
  const [numRegularItems, setNumRegularItems] = useState<number>(3);
  const [numMidtermItems, setNumMidtermItems] = useState<number>(1);
  const [numFinalItems, setNumFinalItems] = useState<number>(1);
  const [regularPrefix, setRegularPrefix] = useState<string>('ใบงาน/ชิ้นงานที่');
  const [showWeightingSuccess, setShowWeightingSuccess] = useState(false);

  // Grading Scale Tab States
  const [gradingSettings, setGradingSettings] = useState<CustomGradingScaleSettings>(() =>
    storage.getGradingScaleSettings()
  );
  const [showGradingSuccess, setShowGradingSuccess] = useState(false);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTerm = terms.find((t) => t.id === selectedTermId) || terms[0];

  // Sync weighting configs when subject changes
  useEffect(() => {
    if (activeSubject) {
      const config = storage.getSubjectWeightingConfig(activeSubject.id);
      if (config) {
        setRegularRatio(config.regular_ratio ?? 70);
        setMidtermRatio(config.midterm_ratio ?? 15);
        setFinalRatio(config.final_ratio ?? 15);
        setNumRegularItems(config.num_regular_items ?? 3);
        setNumMidtermItems(config.num_midterm_items ?? 1);
        setNumFinalItems(config.num_final_items ?? 1);
      }
    }
  }, [activeSubject?.id]);

  // Current items for the selected subject and term
  const currentItems = allScoreItems.filter(
    (i) => i.subject_id === activeSubject?.id && i.term_id === activeTerm?.id
  );

  const totalMaxScore = currentItems.reduce((acc, curr) => acc + (curr.max_score || 0), 0);
  const isBalanced = totalMaxScore === 50;
  const isOver = totalMaxScore > 50;
  const isUnder = totalMaxScore < 50;

  // Weighting calculations
  const totalRatio = regularRatio + midtermRatio + finalRatio;
  const isValidRatio = totalRatio === 100;

  const simulatedWeighting = useMemo(() => {
    const totalPoints = 50;
    const regPoints = Math.round((regularRatio / 100) * totalPoints);
    const midPoints = Math.round((midtermRatio / 100) * totalPoints);
    const finPoints = totalPoints - regPoints - midPoints;

    const items: Array<{ category: 'regular' | 'midterm' | 'final'; name: string; maxScore: number }> = [];

    if (numRegularItems > 0 && regPoints > 0) {
      const per = Math.floor(regPoints / numRegularItems);
      const rem = regPoints % numRegularItems;
      for (let i = 1; i <= numRegularItems; i++) {
        items.push({
          category: 'regular',
          name: `${regularPrefix} ${i}`,
          maxScore: per + (i === 1 ? rem : 0),
        });
      }
    }

    if (numMidtermItems > 0 && midPoints > 0) {
      const per = Math.floor(midPoints / numMidtermItems);
      const rem = midPoints % numMidtermItems;
      for (let i = 1; i <= numMidtermItems; i++) {
        items.push({
          category: 'midterm',
          name: numMidtermItems === 1 ? 'สอบวัดผลกลางภาค' : `สอบกลางภาค ตอนที่ ${i}`,
          maxScore: per + (i === 1 ? rem : 0),
        });
      }
    }

    if (numFinalItems > 0 && finPoints > 0) {
      const per = Math.floor(finPoints / numFinalItems);
      const rem = finPoints % numFinalItems;
      for (let i = 1; i <= numFinalItems; i++) {
        items.push({
          category: 'final',
          name: numFinalItems === 1 ? 'สอบวัดผลปลายภาค' : `สอบปลายภาค ตอนที่ ${i}`,
          maxScore: per + (i === 1 ? rem : 0),
        });
      }
    }

    const simTotal = items.reduce((acc, it) => acc + it.maxScore, 0);

    return {
      regPoints,
      midPoints,
      finPoints,
      items,
      simTotal,
    };
  }, [regularRatio, midtermRatio, finalRatio, numRegularItems, numMidtermItems, numFinalItems, regularPrefix]);

  // Add Subject
  const handleSaveAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const created = storage.addSubject({
      name: subName.trim(),
      code: subCode.trim() || `วช${Math.floor(10000 + Math.random() * 90000)}`,
      credit: Number(subCredit) || 1.0,
    });

    setIsAddSubjectOpen(false);
    setSubName('');
    setSubCode('');
    setSubCredit(1.0);
    setSelectedSubjectId(created.id);
    onDataUpdated();
  };

  // Edit Subject
  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !subName.trim()) return;

    storage.updateSubject({
      ...editingSubject,
      name: subName.trim(),
      code: subCode.trim(),
      credit: Number(subCredit) || 1.0,
    });

    setIsEditSubjectOpen(false);
    onDataUpdated();
  };

  const handleDeleteSubject = (subj: Subject) => {
    if (
      window.confirm(
        `คุณต้องการลบวิชา "${subj.name}" หรือไม่? รายการคะแนนและผลการเรียนในวิชานี้ทั้งหมดจะถูกลบออก`
      )
    ) {
      storage.deleteSubject(subj.id);
      const remaining = subjects.filter((s) => s.id !== subj.id);
      if (remaining.length > 0) {
        setSelectedSubjectId(remaining[0].id);
      }
      onDataUpdated();
    }
  };

  // Add Item
  const handleSaveAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !activeSubject) return;

    storage.addScoreItem({
      subject_id: activeSubject.id,
      term_id: activeTerm.id,
      name: itemName.trim(),
      max_score: Number(itemMaxScore),
      category: itemCategory,
    });

    setIsAddItemOpen(false);
    setItemName('');
    setItemMaxScore(10);
    onDataUpdated();
  };

  // Edit Item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !itemName.trim()) return;

    storage.updateScoreItem({
      ...editingItem,
      name: itemName.trim(),
      max_score: Number(itemMaxScore),
      category: itemCategory,
    });

    setIsEditItemOpen(false);
    onDataUpdated();
  };

  const handleDeleteItem = (item: ScoreItem) => {
    if (window.confirm(`ต้องการลบรายการคะแนน "${item.name}" หรือไม่?`)) {
      storage.deleteScoreItem(item.id);
      onDataUpdated();
    }
  };

  // Apply Custom Weighting from Tab
  const handleApplyCustomWeighting = () => {
    if (!isValidRatio || !activeSubject) return;

    const config: ScoreWeightingConfig = {
      subject_id: weightingScope === 'single' ? activeSubject.id : undefined,
      regular_ratio: regularRatio,
      midterm_ratio: midtermRatio,
      final_ratio: finalRatio,
      num_regular_items: numRegularItems,
      num_midterm_items: numMidtermItems,
      num_final_items: numFinalItems,
    };

    const termIdToApply = weightingTermScope === 'current' ? selectedTermId : undefined;
    const applyToAll = weightingScope === 'all';

    storage.applyWeightingToSubject(
      activeSubject.id,
      config,
      termIdToApply,
      applyToAll
    );

    setShowWeightingSuccess(true);
    onDataUpdated();

    setTimeout(() => {
      setShowWeightingSuccess(false);
    }, 2500);
  };

  // Save Grading Scale
  const handleSaveGradingScale = () => {
    storage.saveGradingScaleSettings(gradingSettings);
    setShowGradingSuccess(true);
    setTimeout(() => {
      setShowGradingSuccess(false);
    }, 2500);
  };

  // Preset Handler
  const handleSelectPreset = (preset: WeightingPreset) => {
    setRegularRatio(preset.regular);
    setMidtermRatio(preset.midterm);
    setFinalRatio(preset.final);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>จัดการรายวิชา สัดส่วนคะแนน และเกณฑ์การวัดผล</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {subjects.length} วิชา
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              กำหนดช่องคะแนน สัดส่วนร้อยละ (เก็บ/กลางภาค/ปลายภาค) และเกณฑ์การตัดเกรดของโรงเรียน
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                setSubName('');
                setSubCode('');
                setSubCredit(1.0);
                setIsAddSubjectOpen(true);
              }}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายวิชา</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveMainTab('items')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'items'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📋 รายวิชา & รายการคะแนน (50 คะแนน/เทอม)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('weighting')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'weighting'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>⚙️ ตั้งค่าสัดส่วนคะแนน (Custom Score Weighting)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('grading_scale')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'grading_scale'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>🎯 เกณฑ์การตัดเกรด & ช่วงคะแนน (Grading Scale)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ITEMS & SUBJECTS */}
      {/* ========================================================= */}
      {activeMainTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left: Subjects List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                เลือกรายวิชาเพื่อจัดการ
              </div>

              <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
                {subjects.map((sub) => {
                  const isSelected = sub.id === activeSubject?.id;
                  const weightConfig = storage.getSubjectWeightingConfig(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm leading-tight">{sub.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sub.code} • {sub.credit} นก. • สัดส่วน{' '}
                            {weightConfig.regular_ratio}:{weightConfig.midterm_ratio}:
                            {weightConfig.final_ratio}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingSubject(sub);
                            setSubName(sub.name);
                            setSubCode(sub.code);
                            setSubCredit(sub.credit);
                            setIsEditSubjectOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                          title="แก้ไขวิชา"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                          title="ลบวิชา"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Score Items Table for Selected Subject */}
          <div className="lg:col-span-8 space-y-4">
            {activeSubject ? (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-5">
                {/* Subject Title & Term Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                      {activeSubject.code} ({activeSubject.credit} หน่วยกิต)
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{activeSubject.name}</h3>
                  </div>

                  {/* Term switcher tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                    {terms.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTermId(t.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          selectedTermId === t.id
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 50 Points Score Balance Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBalanced
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : isOver
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isBalanced
                          ? 'bg-emerald-600 text-white'
                          : isOver
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isBalanced ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm">
                        คะแนนเต็มรวมปัจจุบัน: {totalMaxScore} / 50 คะแนน
                      </div>
                      <div className="text-xs opacity-85">
                        {isBalanced && '✓ ยอดรวมคะแนนครบ 50 คะแนนตามเกณฑ์เป๊ะ'}
                        {isUnder && `⚠️ ยังขาดอีก ${50 - totalMaxScore} คะแนน จึงจะครบ 50 คะแนน`}
                        {isOver && `❌ เกินเกณฑ์อยู่ ${totalMaxScore - 50} คะแนน (คะแนนเต็มต้องไม่เกิน 50)`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMainTab('weighting');
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>ปรับสัดส่วนคะแนน</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemName('');
                        setItemMaxScore(10);
                        setItemCategory('regular');
                        setIsAddItemOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มรายการคะแนน</span>
                    </button>
                  </div>
                </div>

                {/* Items List Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">ชื่อรายการเก็บคะแนน</th>
                        <th className="py-2.5 px-4 text-center w-36">ประเภท</th>
                        <th className="py-2.5 px-4 text-center w-28">คะแนนเต็ม</th>
                        <th className="py-2.5 px-4 text-center w-24">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                                ? 'สอบกลางภาค'
                                : 'สอบปลายภาค'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-indigo-700 text-base font-mono">
                            {item.max_score}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setItemName(item.name);
                                  setItemMaxScore(item.max_score);
                                  setItemCategory(item.category || 'regular');
                                  setIsEditItemOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {currentItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            ยังไม่มีรายการคะแนนในเทอมนี้ คลิก "เพิ่มรายการคะแนน" หรือเลือก "ตั้งค่าสัดส่วนคะแนน"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                กรุณาเลือกวิชาจากรายการด้านซ้าย
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CUSTOM SCORE WEIGHTING ENGINE */}
      {/* ========================================================= */}
      {activeMainTab === 'weighting' && (
        <div className="space-y-5">
          {/* Top Controls: Subject & Scope */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>วิชาเป้าหมาย</span>
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={weightingScope === 'all'}
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
                  onClick={() => setWeightingScope('single')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    weightingScope === 'single'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  เฉพาะวิชานี้ ({activeSubject?.name})
                </button>
                <button
                  type="button"
                  onClick={() => setWeightingScope('all')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    weightingScope === 'all'
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
                <span>ภาคเรียน</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWeightingTermScope('both')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    weightingTermScope === 'both'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทั้ง 2 เทอม (1 และ 2)
                </button>
                <button
                  type="button"
                  onClick={() => setWeightingTermScope('current')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    weightingTermScope === 'current'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  เฉพาะ {activeTerm?.name}
                </button>
              </div>
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>เลือกแม่แบบสัดส่วนคะแนนยอดนิยม (Weighting Presets)</span>
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                คลิกเพื่อโหลดแม่แบบสัดส่วนมาตรฐาน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-400 shadow-xs ring-2 ring-indigo-300/60'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
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

          {/* Interactive Sliders */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>กำหนดสัดส่วนร้อยละ (เก็บ : กลางภาค : ปลายภาค)</span>
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
                    <span>สัดส่วนรวม {totalRatio}% (ครบ 100% ถูกต้อง)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>สัดส่วนรวม {totalRatio}% (ต้องรวมกันได้ 100%)</span>
                  </>
                )}
              </div>
            </div>

            {/* Visual Ratio Distribution Bar */}
            <div className="space-y-1.5">
              <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                <div
                  style={{ width: `${Math.min(100, regularRatio)}%` }}
                  className="bg-sky-500 h-full transition-all duration-300 relative"
                  title={`คะแนนเก็บ ${regularRatio}% (${simulatedWeighting.regPoints} คะแนน)`}
                />
                <div
                  style={{ width: `${Math.min(100, midtermRatio)}%` }}
                  className="bg-amber-500 h-full transition-all duration-300 relative"
                  title={`กลางภาค ${midtermRatio}% (${simulatedWeighting.midPoints} คะแนน)`}
                />
                <div
                  style={{ width: `${Math.min(100, finalRatio)}%` }}
                  className="bg-purple-500 h-full transition-all duration-300 relative"
                  title={`ปลายภาค ${finalRatio}% (${simulatedWeighting.finPoints} คะแนน)`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1 font-medium gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  <span>
                    คะแนนเก็บระหว่างภาค: <strong>{regularRatio}%</strong> ({simulatedWeighting.regPoints} คะแนน)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span>
                    สอบกลางภาค: <strong>{midtermRatio}%</strong> ({simulatedWeighting.midPoints} คะแนน)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span>
                    สอบปลายภาค: <strong>{finalRatio}%</strong> ({simulatedWeighting.finPoints} คะแนน)
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Slider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Regular Slider */}
              <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">
                    1. คะแนนเก็บระหว่างภาค
                  </span>
                  <span className="font-mono font-bold text-sky-700 bg-white px-2.5 py-0.5 rounded-md border border-sky-200 text-sm">
                    {regularRatio}%
                  </span>
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
                  = <strong>{simulatedWeighting.regPoints}</strong> คะแนนเต็ม (ต่อเทอม 50)
                </div>
              </div>

              {/* Midterm Slider */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    2. สอบกลางภาค
                  </span>
                  <span className="font-mono font-bold text-amber-700 bg-white px-2.5 py-0.5 rounded-md border border-amber-200 text-sm">
                    {midtermRatio}%
                  </span>
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
                  = <strong>{simulatedWeighting.midPoints}</strong> คะแนนเต็ม (ต่อเทอม 50)
                </div>
              </div>

              {/* Final Slider */}
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">
                    3. สอบปลายภาค
                  </span>
                  <span className="font-mono font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-md border border-purple-200 text-sm">
                    {finalRatio}%
                  </span>
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
                  = <strong>{simulatedWeighting.finPoints}</strong> คะแนนเต็ม (ต่อเทอม 50)
                </div>
              </div>
            </div>
          </div>

          {/* Sub-item subdivisions */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>การแบ่งซอยจำนวนช่องคะแนน (Assignment Subdivisions)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนช่องคะแนนเก็บ
                </label>
                <select
                  value={numRegularItems}
                  onChange={(e) => setNumRegularItems(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 ช่อง (รวมยอดเดียว)</option>
                  <option value={2}>2 ช่อง</option>
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
                value={regularPrefix}
                onChange={(e) => setRegularPrefix(e.target.value)}
                placeholder="เช่น ใบงานที่, ชิ้นงานที่, กิจกรรมที่"
                className="w-full sm:w-1/2 px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Live Simulated Result Table & Apply Button */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  ตัวอย่างช่องคะแนนที่จะถูกสร้างขึ้นจริง (รวมได้ 50 คะแนนเต็มพอดี)
                </span>
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 self-start sm:self-auto">
                ทั้งหมด {simulatedWeighting.items.length} ช่อง = {simulatedWeighting.simTotal} คะแนน
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">ชื่อช่องคะแนน</th>
                    <th className="py-2.5 px-3 text-center w-32">ประเภท</th>
                    <th className="py-2.5 px-3 text-center w-28">คะแนนเต็ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulatedWeighting.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {it.name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                            it.category === 'regular'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : it.category === 'midterm'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {it.category === 'regular'
                            ? 'คะแนนเก็บ'
                            : it.category === 'midterm'
                            ? 'กลางภาค'
                            : 'ปลายภาค'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-indigo-700 font-mono text-base">
                        {it.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Apply Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                เมื่อกดนำไปใช้ ระบบจะปรับโครงสร้างช่องคะแนนของวิชาที่เลือกให้ได้ 50 คะแนนเต็มทันที
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isValidRatio}
                  onClick={handleApplyCustomWeighting}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {weightingScope === 'all'
                      ? `บันทึกและนำไปใช้กับทุกวิชา (${subjects.length} วิชา)`
                      : `บันทึกสัดส่วนวิชา ${activeSubject?.name || ''}`}
                  </span>
                </button>
              </div>
            </div>

            {showWeightingSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>บันทึกและปรับโครงสร้างสัดส่วนคะแนนเรียบร้อยแล้ว! ข้อมูลคะแนนได้รับการอัปเดต</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CUSTOM GRADING SCALE & CUTOFFS */}
      {/* ========================================================= */}
      {activeMainTab === 'grading_scale' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>เกณฑ์การตัดเกรดและช่วงคะแนนสะสม (Grading Scale & Cutoffs)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดช่วงคะแนนสะสม 0 - 100 คะแนนสำหรับแปลงเป็นระดับผลการเรียน (เกรด)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGradingSettings(DEFAULT_GRADING_SCALE_SETTINGS);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่ามาตรฐาน สพฐ.</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGradingScale}
                className="px-4 py-1.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกเกณฑ์การตัดเกรด</span>
              </button>
            </div>
          </div>

          {/* Quick Thresholds Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รูปแบบการตัดเกรด
              </label>
              <select
                value={gradingSettings.systemType}
                onChange={(e) =>
                  setGradingSettings({
                    ...gradingSettings,
                    systemType: e.target.value as any,
                  })
                }
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="standard_8">มาตรฐาน 8 ระดับ (4, 3.5, 3, 2.5, 2, 1.5, 1, 0)</option>
                <option value="letter_grade">ระบบตัวอักษร (A, B+, B, C+, C, D+, D, F)</option>
                <option value="custom">กำหนดเอง (Custom Scale)</option>
              </select>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เกณฑ์คะแนนผ่านขั้นต่ำ (Passing Score)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradingSettings.passingScore}
                  onChange={(e) =>
                    setGradingSettings({
                      ...gradingSettings,
                      passingScore: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 font-mono"
                />
                <span className="text-xs text-slate-500 font-bold">คะแนน</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เกณฑ์แจ้งเตือนกลุ่มเสี่ยง (At-Risk Alert)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradingSettings.atRiskThreshold}
                  onChange={(e) =>
                    setGradingSettings({
                      ...gradingSettings,
                      atRiskThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-bold text-rose-700 font-mono"
                />
                <span className="text-xs text-slate-500 font-bold">คะแนน</span>
              </div>
            </div>
          </div>

          {/* Grade Bands Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4 w-24 text-center">เกรด</th>
                  <th className="py-2.5 px-4 text-center w-36">คะแนนขั้นต่ำ (Min)</th>
                  <th className="py-2.5 px-4 text-center w-36">คะแนนสูงสุด (Max)</th>
                  <th className="py-2.5 px-4 text-center w-28">ค่าระดับ (GPA)</th>
                  <th className="py-2.5 px-4">ความหมาย / คำอธิบาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradingSettings.bands.map((band, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg font-bold text-xs ${band.badgeColor}`}>
                        {band.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        value={band.minScore}
                        onChange={(e) => {
                          const newBands = [...gradingSettings.bands];
                          newBands[idx].minScore = Number(e.target.value);
                          setGradingSettings({ ...gradingSettings, bands: newBands });
                        }}
                        className="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        value={band.maxScore}
                        onChange={(e) => {
                          const newBands = [...gradingSettings.bands];
                          newBands[idx].maxScore = Number(e.target.value);
                          setGradingSettings({ ...gradingSettings, bands: newBands });
                        }}
                        className="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold font-mono text-indigo-700">
                      {band.gradePoint.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      <input
                        type="text"
                        value={band.description}
                        onChange={(e) => {
                          const newBands = [...gradingSettings.bands];
                          newBands[idx].description = e.target.value;
                          setGradingSettings({ ...gradingSettings, bands: newBands });
                        }}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showGradingSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>บันทึกเกณฑ์การตัดเกรดเรียบร้อยแล้ว!</span>
            </div>
          )}
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>เพิ่มรายวิชาใหม่</span>
              </h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAddSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อรายวิชา *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="เช่น ภาษาอังกฤษพื้นฐาน, แนะแนว"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสวิชา
                  </label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="เช่น อ15101"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    น้ำหนัก (หน่วยกิต)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="5"
                    value={subCredit}
                    onChange={(e) => setSubCredit(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  สร้างรายวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {isEditSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                <span>แก้ไขรายวิชา</span>
              </h3>
              <button onClick={() => setIsEditSubjectOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อรายวิชา *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสวิชา
                  </label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    น้ำหนัก (หน่วยกิต)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={subCredit}
                    onChange={(e) => setSubCredit(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditSubjectOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Score Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-sky-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <span>เพิ่มรายการคะแนน</span>
              </h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อรายการเก็บคะแนน *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="เช่น ใบงานที่ 3 เรื่องทศนิยม"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทคะแนน
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="regular">คะแนนเก็บระหว่างภาค</option>
                    <option value="midterm">สอบกลางภาค</option>
                    <option value="final">สอบปลายภาค</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คะแนนเต็ม *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={itemMaxScore}
                    onChange={(e) => setItemMaxScore(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  เพิ่มรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Score Item Modal */}
      {isEditItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                <span>แก้ไขรายการคะแนน</span>
              </h3>
              <button onClick={() => setIsEditItemOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อรายการเก็บคะแนน *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทคะแนน
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="regular">คะแนนเก็บระหว่างภาค</option>
                    <option value="midterm">สอบกลางภาค</option>
                    <option value="final">สอบปลายภาค</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คะแนนเต็ม *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={itemMaxScore}
                    onChange={(e) => setItemMaxScore(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditItemOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Weighting Modal if triggered */}
      {isWeightingModalOpen && (
        <ScoreWeightingModal
          isOpen={isWeightingModalOpen}
          onClose={() => setIsWeightingModalOpen(false)}
          subjects={subjects}
          currentSubjectId={selectedSubjectId}
          terms={terms}
          currentTermId={selectedTermId}
          onWeightingApplied={onDataUpdated}
        />
      )}
    </div>
  );
};
