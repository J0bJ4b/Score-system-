export interface Classroom {
  id: string; // e.g. room-p5-1, room-p6-1
  name: string; // e.g. ป.5/1, ป.6/1
  level: string; // e.g. ประถมศึกษาปีที่ 5, ประถมศึกษาปีที่ 6
  academic_year: string; // e.g. 2568
  homeroom_teacher?: string; // ครูประจำชั้น
}

export interface Student {
  id: string;
  student_no: number; // เลขที่
  name: string; // ชื่อ-สกุล
  student_code: string; // เลขประจำตัวนักเรียน
  classroom_id?: string; // id ห้องเรียน เช่น room-p5-1
  classroom: string; // ห้อง เช่น ป.5/1
  gender?: 'ชาย' | 'หญิง';
}

export interface Subject {
  id: string;
  name: string; // ชื่อวิชา เช่น ภาษาไทย, คณิตศาสตร์
  code: string; // รหัสวิชา เช่น ท15101
  credit: number; // น้ำหนักหน่วยกิต
}

export interface Term {
  id: string;
  name: string; // ภาคเรียนที่ 1, ภาคเรียนที่ 2
  academic_year: string; // เช่น 2568
  max_score: number; // default 50
}

export type ScoreCategory = 'regular' | 'midterm' | 'final';

export interface ScoreItem {
  id: string;
  subject_id: string;
  term_id: string;
  name: string; // ชื่อรายการ เช่น ใบงานที่ 1, สอบกลางภาค
  max_score: number; // คะแนนเต็มของรายการนี้
  category?: ScoreCategory; // ประเภทคะแนน (คะแนนเก็บ / กลางภาค / ปลายภาค)
}

export type ScoreStatus = 'normal' | 'absent' | 'missing'; // ปกติ | ขาดสอบ (ร) | ไม่ส่งงาน (มส)

export interface Score {
  id: string;
  student_id: string;
  score_item_id: string;
  score: number | null; // คะแนนที่ได้
  status: ScoreStatus; // สถานะ
  note?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string; // ชื่อ-สกุลครู
  email?: string;
  photo_url?: string;
  school_name?: string; // โรงเรียน
  classroom_responsible?: string; // ชั้นที่ประจำ
  role?: 'teacher' | 'admin';
  provider?: 'google' | 'password' | 'demo';
}

export interface SubjectTermSummary {
  term1_score: number;
  term2_score: number;
  total_score: number;
  grade: string;
  grade_point: number;
  status_flag?: 'ร' | 'มส' | 'ปกติ';
}

export interface StudentFullReport {
  student: Student;
  subjects: {
    subject: Subject;
    term1_score: number;
    term2_score: number;
    total_score: number;
    grade: string;
    grade_point: number;
    status: string;
  }[];
  total_credits: number;
  gpa: number;
  rank?: number;
}
