/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * หน้าต่างจัดการบันทึกพฤติกรรมและพัฒนาการนักเรียนรายบุคคล
 * (Quick Behavioral & Developmental Notes Modal)
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentBehavioralNote, StudentNoteCategory } from '../types';
import { storage } from '../services/storage';
import { formatCitizenId } from '../utils/dmcParser';
import {
  X,
  NotebookPen,
  Calendar,
  Sparkles,
  Tag,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Heart,
  TrendingUp,
  Award,
  Bell,
  User,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface StudentBehavioralNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onNotesUpdated?: () => void;
  onNavigateToIndividualSummary?: (student: Student) => void;
}

const CATEGORY_CONFIG: Record<
  StudentNoteCategory,
  { label: string; icon: React.ElementType; color: string; badgeColor: string; description: string }
> = {
  behavior: {
    label: 'พฤติกรรมในชั้นเรียน',
    icon: CheckCircle2,
    color: 'emerald',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'วินัย สมาธิ ความรับผิดชอบ การมีส่วนร่วมในกิจกรรม',
  },
  development: {
    label: 'พัฒนาการการเรียนรู้',
    icon: TrendingUp,
    color: 'blue',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'ทักษะทางวิชาการ ความเข้าใจ การคิดวิเคราะห์ การอ่านและการคำนวณ',
  },
  wellbeing: {
    label: 'สุขภาพ อารมณ์ และสังคม',
    icon: Heart,
    color: 'rose',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'การเข้าสังคม มนุษยสัมพันธ์ ความสุข ความร่าเริง และสุขภาพ',
  },
  talent: {
    label: 'จุดเด่น & ความถนัด',
    icon: Award,
    color: 'purple',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'ความเป็นผู้นำ กีฬา ศิลปะ ดนตรี และความสามารถเฉพาะตัว',
  },
  followup: {
    label: 'ประเด็นติดตาม / ผู้ปกครอง',
    icon: Bell,
    color: 'amber',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'สิ่งที่ควรสังเกตเพิ่มเติม หรือการประสานความร่วมมือกับผู้ปกครอง',
  },
};

const PRESET_NOTE_CHIPS: { text: string; category: StudentNoteCategory; tag: string }[] = [
  { text: 'ส่งงานตรงเวลา มีความรับผิดชอบในการเรียนดีเยี่ยม', category: 'behavior', tag: 'ชื่นชม' },
  { text: 'มีสมาธิตั้งใจฟังและกล้าซักถามเมื่อสงสัยในบทเรียน', category: 'behavior', tag: 'ตั้งใจดี' },
  { text: 'มีน้ำใจช่วยเหลือเพื่อนร่วมห้องและช่วยงานครูสม่ำเสมอ', category: 'wellbeing', tag: 'จิตอาสา' },
  { text: 'พัฒนาการด้านการอ่านและการสะกดคำก้าวหน้าขึ้นมาก', category: 'development', tag: 'ก้าวหน้า' },
  { text: 'คิดคำนวณและแก้โจทย์ปัญหาคณิตศาสตร์ได้คล่องแคล่ว', category: 'development', tag: 'ยอดเยี่ยม' },
  { text: 'มีทักษะความเป็นผู้นำ สามารถนำกลุ่มเพื่อนทำกิจกรรมได้ดี', category: 'talent', tag: 'จุดเด่น' },
  { text: 'ควรส่งเสริมสมาธิในชั่วโมงเรียนเพิ่มเติมในบางช่วง', category: 'followup', tag: 'สังเกต' },
  { text: 'ควรติดตามการทบทวนบทเรียนและทำแบบฝึกหัดอย่างต่อเนื่อง', category: 'followup', tag: 'ติดตาม' },
];

export const StudentBehavioralNotesModal: React.FC<StudentBehavioralNotesModalProps> = ({
  isOpen,
  onClose,
  student,
  onNotesUpdated,
  onNavigateToIndividualSummary,
}) => {
  const [notes, setNotes] = useState<StudentBehavioralNote[]>([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<StudentNoteCategory>('behavior');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tag, setTag] = useState('ชื่นชม');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reloadNotes = () => {
    if (!student) return;
    const items = storage.getStudentNotes(student.id);
    setNotes(items);
  };

  useEffect(() => {
    if (isOpen && student) {
      reloadNotes();
      resetForm();
      setConfirmDeleteId(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const resetForm = () => {
    setContent('');
    setCategory('behavior');
    setDate(new Date().toISOString().slice(0, 10));
    setTag('ชื่นชม');
    setEditingNoteId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const teacher = storage.getCurrentUser();
    const teacherName = teacher?.full_name || 'ครูประจำชั้น';

    if (editingNoteId) {
      storage.updateStudentNote(editingNoteId, {
        content: content.trim(),
        category,
        date,
        tag: tag.trim() || undefined,
        teacherName,
      });
    } else {
      storage.addStudentNote({
        studentId: student.id,
        studentName: student.name,
        classroomId: student.classroom_id,
        date,
        category,
        content: content.trim(),
        tag: tag.trim() || undefined,
        teacherName,
      });
    }

    resetForm();
    reloadNotes();
    if (onNotesUpdated) onNotesUpdated();
  };

  const handleEdit = (note: StudentBehavioralNote) => {
    setEditingNoteId(note.id);
    setContent(note.content);
    setCategory(note.category);
    setDate(note.date);
    setTag(note.tag || '');
  };

  const handleDelete = (noteId: string) => {
    storage.deleteStudentNote(noteId);
    setConfirmDeleteId(null);
    reloadNotes();
    if (onNotesUpdated) onNotesUpdated();
  };

  const handleSelectChip = (chip: { text: string; category: StudentNoteCategory; tag: string }) => {
    setContent((prev) => (prev ? `${prev} ${chip.text}` : chip.text));
    setCategory(chip.category);
    setTag(chip.tag);
  };

  const filteredNotes = notes.filter((n) => {
    if (filterCategory === 'all') return true;
    return n.category === filterCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white px-5 sm:px-7 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-xs">
              <NotebookPen className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-bold">
                  บันทึกพฤติกรรม & พัฒนาการ
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  เลขที่ {student.student_no} • {student.classroom}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight mt-0.5">
                {student.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToIndividualSummary && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToIndividualSummary(student);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors cursor-pointer"
                title="เปิดหน้ารายงานผลการเรียนรายบุคคล (Individual Summary View)"
              >
                <span>ดูหน้ารายบุคคล</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
          {/* Form to Add / Edit Note */}
          <form
            onSubmit={handleSave}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-800">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>
                  {editingNoteId ? 'แก้ไขบันทึกพฤติกรรม/พัฒนาการ' : 'เพิ่มบันทึกพฤติกรรม/พัฒนาการใหม่'}
                </span>
              </div>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>

            {/* Category and Date Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  หมวดหมู่การสังเกต *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StudentNoteCategory)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label} ({cfg.description})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  วันที่บันทึก *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ข้อความด่วนสำหรับครู (คลิกเพื่อใส่ข้อความ):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NOTE_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectChip(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 transition-colors text-left cursor-pointer shadow-2xs"
                  >
                    + {chip.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                ข้อความบันทึกแบบไม่เป็นทางการ (คำสังเกต / พัฒนาการ) *
              </label>
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="พิมพ์ข้อสังเกตพฤติกรรม เช่น วันนี้ตั้งใจตอบคำถามเรื่องการบวกเศษส่วนได้คล่องแคล่ว..."
                required
                className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 leading-relaxed"
              />
            </div>

            {/* Tag and Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">
                  ป้ายกำกับ:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ชื่นชม', 'ก้าวหน้า', 'สังเกต', 'จิตอาสา', 'ติดตาม'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer border ${
                        tag === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="ป้ายอื่นๆ..."
                    className="w-24 px-2 py-0.5 text-[10px] bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!content.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{editingNoteId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}</span>
              </button>
            </div>
          </form>

          {/* Notes History Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900">
                  ประวัติบันทึกพฤติกรรมและพัฒนาการ ({notes.length} รายการ)
                </h4>
                <span className="text-[11px] text-slate-500">
                  เรียงตามวันที่ล่าสุด
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 flex-wrap text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                    filterCategory === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({notes.length})
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => {
                  const count = notes.filter((n) => n.category === k).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilterCategory(k)}
                      className={`px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                        filterCategory === k
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes List */}
            {filteredNotes.length > 0 ? (
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const cfg = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.behavior;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 shadow-2xs space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.badgeColor}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{cfg.label}</span>
                          </span>

                          {note.tag && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                              #{note.tag}
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{note.date}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(note)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="แก้ไขบันทึก"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === note.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200">
                              <span className="text-[10px] text-rose-700 font-bold">ยืนยันลบ?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                              >
                                ลบ
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="ลบบันทึก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                        {note.content}
                      </p>

                      <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                        <span>บันทึกโดย: {note.teacherName || 'ครูประจำชั้น'}</span>
                        {note.updatedAt && (
                          <span className="italic">แก้ไขเมื่อ {new Date(note.updatedAt).toLocaleDateString('th-TH')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-2">
                <NotebookPen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs">
                  {filterCategory === 'all'
                    ? 'ยังไม่มีบันทึกพฤติกรรมหรือพัฒนาการสำหรับนักเรียนคนนี้'
                    : 'ไม่มีบันทึกในหมวดหมู่นี้'}
                </p>
                <p className="text-[11px] text-slate-400">
                  คุณครูสามารถใช้แบบฟอร์มด้านบนเพื่อเริ่มบันทึกข้อสังเกตได้ทันที
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            บันทึกเหล่านี้สามารถดูได้ใน <strong>หน้ารายงานผลการเรียนรายบุคคล (Individual Summary)</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
