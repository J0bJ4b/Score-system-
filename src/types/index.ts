export interface Classroom {
  id: string; // e.g. room-p5-1, room-p6-1
  name: string; // e.g. ป.5/1, ป.6/1
  level: string; // e.g. ประถมศึกษาปีที่ 5, ประถมศึกษาปีที่ 6
  academic_year: string; // e.g. 2569
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
  academic_year: string; // เช่น 2569
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

export type CertificateType =
  | 'academic_excellence' // เรียนดีเด่น (GPA >= 3.50 หรือ 4.00)
  | 'top_subject' // คะแนนยอดเยี่ยมประจำรายวิชา
  | 'outstanding_improvement' // พัฒนาการเรียนรู้ยอดเยี่ยม
  | 'desirable_conduct' // คุณธรรม จริยธรรม และคุณลักษณะอันพึงประสงค์
  | 'student_activity' // กิจกรรมพัฒนาผู้เรียน / ลูกเสือ-เนตรนารี
  | 'custom'; // กำหนดเอง

export interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  student_code?: string;
  classroom_id?: string;
  classroom_name?: string;
  type: CertificateType;
  title: string;
  subtitle?: string;
  subject_name?: string;
  academic_year: string;
  issue_date?: string;
  school_name?: string;
  homeroom_teacher?: string;
  principal_name?: string;
  theme_color?: 'gold' | 'blue' | 'emerald' | 'crimson';
  notes?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificateSettings {
  school_name: string;
  academic_year: string;
  issue_date: string;
  principal_name: string;
  homeroom_teacher: string;
  default_theme: 'gold' | 'blue' | 'emerald' | 'crimson';
  school_logo_type: 'garuda' | 'education' | 'seal' | 'none';
  sign_mode: 'digital' | 'line_only';
}

export interface LineNotifySettings {
  enabled: boolean;
  token: string;
  target_group_name: string; // เช่น กลุ่มผู้ปกครอง ป.5/1
  school_signature: string; // เช่น โรงเรียนบ้านป่าส่าน
  notify_on_score_saved: boolean; // แจ้งเตือนเมื่อครูบันทึกคะแนนเสร็จสิ้น
  notify_on_midterm_final: boolean; // แจ้งเตือนเมื่อครูประกาศคะแนนสอบกลางภาค/ปลายภาคเสร็จสิ้น
  notify_on_low_score: boolean; // แจ้งเตือนกรณีคะแนนเก็บต่ำกว่าเกณฑ์
  notify_on_missing_or_absent: boolean; // แจ้งเตือนกรณีมีงานค้างส่ง (ติด "ร" หรือขาดส่งงาน "มส")
  low_score_threshold_percent: number; // เกณฑ์คะแนนต่ำกว่า % เช่น 50%
  auto_notify_enabled: boolean; // ส่งอัตโนมัติหรือให้ครูกดอนุมัติ
}

export interface ScoreWeightingConfig {
  subject_id?: string;
  regular_ratio: number; // e.g. 70 or 60 or 80
  midterm_ratio: number; // e.g. 15 or 20 or 10
  final_ratio: number; // e.g. 15 or 20 or 10
  num_regular_items: number; // e.g. 3 items
  num_midterm_items: number; // e.g. 1 item
  num_final_items: number; // e.g. 1 item
  name?: string;
}

export interface GradingScaleBand {
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  description: string;
  badgeColor: string;
}

export interface CustomGradingScaleSettings {
  systemType: 'standard_8' | 'letter_grade' | 'custom';
  bands: GradingScaleBand[];
  passingScore: number;
  atRiskThreshold: number;
}

export type NotificationType =
  | 'score_saved'
  | 'midterm_final'
  | 'low_score_alert'
  | 'missing_work_alert'
  | 'custom_broadcast'
  | 'test_ping';

export interface NotificationLog {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipient_group: string;
  classroom?: string;
  subject_name?: string;
  term_name?: string;
  status: 'success' | 'failed' | 'simulated';
  timestamp: string;
  student_count?: number;
  error_message?: string;
}

