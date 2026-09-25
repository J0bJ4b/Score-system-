import React, { useState } from 'react';
import { Classroom, Student } from '../types';
import { storage } from '../services/storage';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Users,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ClassroomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms: Classroom[];
  activeClassroomId: string;
  onSelectClassroom: (classroom: Classroom) => void;
  onClassroomsUpdated: () => void;
}

export const ClassroomManagerModal: React.FC<ClassroomManagerModalProps> = ({
  isOpen,
  onClose,
  classrooms,
  activeClassroomId,
  onSelectClassroom,
  onClassroomsUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState('ประถมศึกษาปีที่ 5');
  const [formYear, setFormYear] = useState('2569');
  const [formTeacher, setFormTeacher] = useState('ครูสมศรี จิตเมตตา');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingClassroom(null);
    setFormName('');
    setFormLevel('ประถมศึกษาปีที่ 5');
    setFormYear('2569');
    setFormTeacher('ครูสมศรี จิตเมตตา');
    setIsEditing(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    setEditingClassroom(c);
    setFormName(c.name);
    setFormLevel(c.level);
    setFormYear(c.academic_year);
    setFormTeacher(c.homeroom_teacher || '');
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingClassroom) {
      storage.updateClassroom({
        ...editingClassroom,
        name: formName.trim(),
        level: formLevel.trim(),
        academic_year: formYear.trim(),
        homeroom_teacher: formTeacher.trim(),
      });
    } else {
      const created = storage.addClassroom({
        name: formName.trim(),
        level: formLevel.trim(),
        academic_year: formYear.trim(),
        homeroom_teacher: formTeacher.trim(),
      });
      onSelectClassroom(created);
    }

    setIsEditing(false);
    onClassroomsUpdated();
  };

  const handleDelete = (c: Classroom) => {
    if (classrooms.length <= 1) {
      alert('ไม่สามารถลบห้องเรียนสุดท้ายได้ ต้องมีอย่างน้อย 1 ห้องเรียนในระบบ');
      return;
    }

    const studentsCount = storage.getStudents(c.id).length;
    if (
      window.confirm(
        `คุณต้องการลบห้องเรียน "${c.name}" หรือไม่?\n\nคำเตือน: นักเรียนในห้องนี้ (${studentsCount} คน) และคะแนนทั้งหมดจะถูกลบออกด้วย`
      )
    ) {
      storage.deleteClassroom(c.id);
      onClassroomsUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-base">
            <School className="w-5 h-5" />
            <span>จัดการห้องเรียนทั้งหมด (Multi-Classroom)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!isEditing ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">
                  ห้องเรียนในความรับผิดชอบ ({classrooms.length} ห้อง)
                </span>
                <button
                  onClick={handleOpenAdd}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1 border border-indigo-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มห้องเรียนใหม่</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {classrooms.map((c) => {
                  const isActive = c.id === activeClassroomId;
                  const studentCount = storage.getStudents(c.id).length;

                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {c.name}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-800">
                                ใช้งานอยู่
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{c.level}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {studentCount} คน
                            </span>
                            <span>•</span>
                            <span>ปีการศึกษา {c.academic_year}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectClassroom(c);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                          >
                            สลับมาห้องนี้
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white"
                          title="แก้ไขข้อมูลห้องเรียน"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                          title="ลบห้องเรียน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span>{editingClassroom ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียนใหม่'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อห้องเรียน (เช่น ป.5/2, ป.6/2) *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น ป.5/2"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับชั้น
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ประถมศึกษาปีที่ 5">ประถมศึกษาปีที่ 5</option>
                    <option value="ประถมศึกษาปีที่ 6">ประถมศึกษาปีที่ 6</option>
                    <option value="ประถมศึกษาปีที่ 4">ประถมศึกษาปีที่ 4</option>
                    <option value="ประถมศึกษาปีที่ 1-3">ประถมศึกษาปีที่ 1-3</option>
                    <option value="มัธยมศึกษาตอนต้น">มัธยมศึกษาตอนต้น</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="2569"
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ครูประจำชั้น
                </label>
                <input
                  type="text"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  placeholder="เช่น ครูสมศรี จิตเมตตา"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  บันทึกห้องเรียน
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between shrink-0">
          <span>สลับห้องเรียนได้ทุกหน้า ระบบจะจำห้องล่าสุดไว้เสมอ</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
