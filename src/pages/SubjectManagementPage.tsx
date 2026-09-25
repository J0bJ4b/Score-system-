import React, { useState } from 'react';
import { Subject, Term, ScoreItem } from '../types';
import { storage } from '../services/storage';
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
} from 'lucide-react';

interface SubjectManagementPageProps {
  subjects: Subject[];
  terms: Term[];
  allScoreItems: ScoreItem[];
  onDataUpdated: () => void;
}

export const SubjectManagementPage: React.FC<SubjectManagementPageProps> = ({
  subjects,
  terms,
  allScoreItems,
  onDataUpdated,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(terms[0]?.id || 'term-1');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);

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

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTerm = terms.find((t) => t.id === selectedTermId) || terms[0];

  // Current items for the selected subject and term
  const currentItems = allScoreItems.filter(
    (i) => i.subject_id === activeSubject?.id && i.term_id === activeTerm?.id
  );

  const totalMaxScore = currentItems.reduce((acc, curr) => acc + (curr.max_score || 0), 0);
  const isBalanced = totalMaxScore === 50;
  const isOver = totalMaxScore > 50;
  const isUnder = totalMaxScore < 50;

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

  // Auto-balance score items to sum to exactly 50
  const handleAutoBalance = () => {
    if (currentItems.length === 0) return;
    if (
      !window.confirm(
        'ระบบจะปรับคะแนนเก็บ 30 คะแนน + กลางภาค 10 คะแนน + ปลายภาค 10 คะแนน รวมเป็น 50 คะแนนพอดี ต้องการดำเนินการหรือไม่?'
      )
    ) {
      return;
    }

    const regularItems = currentItems.filter((i) => i.category === 'regular');
    const midItems = currentItems.filter((i) => i.category === 'midterm');
    const finItems = currentItems.filter((i) => i.category === 'final');

    const regularTarget = 30;
    const midTarget = 10;
    const finTarget = 10;

    // Distribute regular
    if (regularItems.length > 0) {
      const perReg = Math.floor(regularTarget / regularItems.length);
      const remainder = regularTarget % regularItems.length;
      regularItems.forEach((it, idx) => {
        storage.updateScoreItem({
          ...it,
          max_score: perReg + (idx === 0 ? remainder : 0),
        });
      });
    }

    // Distribute midterm
    if (midItems.length > 0) {
      const perMid = Math.floor(midTarget / midItems.length);
      midItems.forEach((it, idx) => {
        storage.updateScoreItem({
          ...it,
          max_score: perMid,
        });
      });
    }

    // Distribute final
    if (finItems.length > 0) {
      const perFin = Math.floor(finTarget / finItems.length);
      finItems.forEach((it, idx) => {
        storage.updateScoreItem({
          ...it,
          max_score: perFin,
        });
      });
    }

    onDataUpdated();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>จัดการรายวิชาและสัดส่วนคะแนน</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {subjects.length} วิชา
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              กำหนดรายการคะแนนเก็บ กลางภาค และปลายภาค (ต้องรวมได้ 50 คะแนนเต็มต่อเทอม)
            </p>
          </div>

          <button
            onClick={() => {
              setSubName('');
              setSubCode('');
              setSubCredit(1.0);
              setIsAddSubjectOpen(true);
            }}
            className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มวิชาใหม่</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Subjects List / Right Score Items Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left: Subjects List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              เลือกวิชาที่ต้องการตั้งค่า
            </div>

            <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
              {subjects.map((sub) => {
                const isSelected = sub.id === activeSubject?.id;
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
                          {sub.code} • {sub.credit} หน่วยกิต
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

        {/* Right: Score Items Configuration for Selected Subject */}
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
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
                    onClick={handleAutoBalance}
                    className="px-3 py-1.5 text-xs font-bold bg-white/90 hover:bg-white text-slate-800 rounded-lg border border-slate-300 shadow-2xs flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ปรับให้ได้ 50 อัตโนมัติ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setItemName('');
                      setItemMaxScore(10);
                      setItemCategory('regular');
                      setIsAddItemOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1 transition-all"
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
                        <td className="py-2.5 px-4 text-center font-bold text-indigo-700 text-base">
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
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="แก้ไขรายการ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
                          ยังไม่มีรายการคะแนนในเทอมนี้ คลิก "เพิ่มรายการคะแนน" หรือ "ปรับให้ได้ 50 อัตโนมัติ"
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

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>เพิ่มรายวิชาใหม่</span>
              </h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-white/80 hover:text-white">
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
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
              <button onClick={() => setIsEditSubjectOpen(false)} className="text-white/80 hover:text-white">
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

      {/* Add Score Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-sky-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <span>เพิ่มรายการคะแนน</span>
              </h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-white/80 hover:text-white">
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
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
              <button onClick={() => setIsEditItemOpen(false)} className="text-white/80 hover:text-white">
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
    </div>
  );
};
