export interface Classroom {
  id: string; // e.g. room-p5-1, room-p6-1
  name: string; // e.g. ป.5/1, ป.6/1
  level: string; // e.g. ประถมศึกษาปีที่ 5, ประถมศึกษาปีที่ 6
  academic_year: string; // e.g. 2569
  homeroom_teacher?: string; // ครูประจำชั้น
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  student_no: number; // เลขที่
  name: string; // ชื่อ-สกุล
  student_code: string; // เลขประจำตัวประชาชน 13 หลัก (Citizen ID / National ID)
  citizen_id?: string; // เลขประจำตัวประชาชน 13 หลัก (สำรอง)
  classroom_id?: string; // id ห้องเรียน เช่น room-p5-1
  classroom: string; // ห้อง เช่น ป.5/1
  gender?: 'ชาย' | 'หญิง';
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  name: string; // ชื่อวิชา เช่น ภาษาไทย, คณิตศาสตร์
  code: string; // รหัสวิชา เช่น ท15101
  credit: number; // น้ำหนักหน่วยกิต
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Term {
  id: string;
  name: string; // ภาคเรียนที่ 1, ภาคเรียนที่ 2
  academic_year: string; // เช่น 2569
  max_score: number; // default 50
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ScoreCategory = 'regular' | 'midterm' | 'final';

export interface ScoreItem {
  id: string;
  subject_id: string;
  term_id: string;
  name: string; // ชื่อรายการ เช่น ใบงานที่ 1, สอบกลางภาค
  max_score: number; // คะแนนเต็มของรายการนี้
  category?: ScoreCategory; // ประเภทคะแนน (คะแนนเก็บ / กลางภาค / ปลายภาค)
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type NotificationChannel =
  | 'line_share' // แชร์เข้า LINE โดยตรง (ฟรี 100% ไม่ต้องใช้ Token)
  | 'telegram' // Telegram Bot API (ฟรี 100% ข้อความไม่จำกัด)
  | 'line_oa' // LINE Official Account Messaging API (แทน LINE Notify ทางการ)
  | 'discord' // Discord Webhook (ฟรี 100%)
  | 'webhook' // Custom Webhook / Google Apps Script
  | 'line_notify'; // ระบบเดิม (ปิดบริการแล้ว)

export interface LineNotifySettings {
  enabled: boolean;
  channel?: NotificationChannel; // ช่องทางการแจ้งเตือนที่เลือกใช้
  token: string; // LINE Notify Token (เดิม)
  target_group_name: string; // เช่น กลุ่มผู้ปกครอง ป.5/1
  school_signature: string; // เช่น โรงเรียนบ้านป่าส่าน
  notify_on_score_saved: boolean; // แจ้งเตือนเมื่อครูบันทึกคะแนนเสร็จสิ้น
  notify_on_midterm_final: boolean; // แจ้งเตือนเมื่อครูประกาศคะแนนสอบกลางภาค/ปลายภาคเสร็จสิ้น
  notify_on_low_score: boolean; // แจ้งเตือนกรณีคะแนนเก็บต่ำกว่าเกณฑ์
  notify_on_missing_or_absent: boolean; // แจ้งเตือนกรณีมีงานค้างส่ง (ติด "ร" หรือขาดส่งงาน "มส")
  low_score_threshold_percent: number; // เกณฑ์คะแนนต่ำกว่า % เช่น 50%
  auto_notify_enabled: boolean; // ส่งอัตโนมัติหรือให้ครูกดอนุมัติ

  // Telegram Settings
  telegram_bot_token?: string; // Bot Token จาก @BotFather เช่น 123456:ABC-DEF...
  telegram_chat_id?: string; // Chat ID หรือ Group ID เช่น -100123456789 หรือ @mygroup

  // Discord Settings
  discord_webhook_url?: string; // Webhook URL จาก Discord เช่น https://discord.com/api/webhooks/...

  // LINE Official Account (Messaging API)
  line_oa_channel_access_token?: string; // Channel Access Token (Long-lived)
  line_oa_destination_type?: 'broadcast' | 'user_group'; // ส่งแบบ Broadcast หรือระบุ ID
  line_oa_destination_id?: string; // User ID หรือ Group ID (กรณีส่งแบบเจาะจง)

  // Custom Webhook / Google Apps Script
  custom_webhook_url?: string; // Webhook URL เช่น Google Apps Script Web App URL
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
  | 'remedial_scheduled'
  | 'remedial_passed'
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
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RemedialStatus =
  | 'pending' // รอดำเนินการซ่อมเสริม
  | 'in_progress' // อยู่ระหว่างการสอนซ่อมเสริม
  | 're_exam_scheduled' // นัดหมายสอบแก้ตัวแล้ว
  | 'passed' // สอบแก้ตัวผ่านเกณฑ์
  | 'failed'; // ยังไม่ผ่านเกณฑ์

export type RemedialMethod =
  | 'individual_tutoring' // การสอนเสริมรายบุคคล / กลุ่มย่อย
  | 'remedial_worksheet' // มอบหมายใบงาน / แบบฝึกหัดปรับพื้นฐาน
  | 'peer_tutoring' // กิจกรรมเพื่อนช่วยเพื่อน (Peer Tutoring)
  | 'digital_learning' // เรียนรู้ผ่านสื่อคลิป / ห้องเรียนออนไลน์
  | 'project_assignment' // โครงงาน / ชิ้นงานทดแทน
  | 'other'; // วิธีการอื่นๆ

export interface RemedialRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_code?: string;
  student_no?: number;
  classroom_id?: string;
  classroom_name?: string;
  subject_id: string;
  subject_name: string;
  subject_code?: string;
  term_id: string;
  term_name?: string;
  score_item_id?: string;
  score_item_name?: string;
  indicator_or_standard?: string; // ตัวชี้วัด / มาตรฐานการเรียนรู้
  original_score: number; // คะแนนเดิมที่ไม่ผ่าน
  max_score: number; // คะแนนเต็ม
  target_passing_score: number; // คะแนนผ่านเกณฑ์ (เช่น 50% หรือ 60%)
  
  // แผนและการสอนซ่อมเสริม
  learning_defect: string; // จุดบกพร่อง / สาเหตุที่ยังไม่ผ่าน
  remedial_method: RemedialMethod; // วิธียกกระดับและสอนซ่อมเสริม
  remedial_method_detail?: string; // รายละเอียดเพิ่มเติม
  remedial_date?: string; // วันที่สอนซ่อมเสริม
  remedial_duration_hours?: number; // จำนวนชั่วโมงที่ทำการสอนซ่อมเสริม
  
  // การสอบแก้ตัว / ประเมินผล
  re_exam_date?: string; // วันที่สอบแก้ตัว
  re_exam_score?: number | null; // คะแนนที่ได้จากการสอบแก้ตัว
  final_recorded_score?: number | null; // คะแนนจริงที่บันทึกตามเกณฑ์โรงเรียน
  status: RemedialStatus;
  
  // บันทึกความเห็นและการติดตาม
  teacher_notes?: string;
  remedial_round: number; // ครั้งที่สอบแก้ตัว (เช่น ครั้งที่ 1, 2)
  synced_to_gradebook?: boolean; // ปรับคะแนนลงสมุดเกรดบุ๊กแล้วหรือไม่
  
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SchoolLogoType = 'custom' | 'garuda' | 'education' | 'seal' | 'none';

export interface SchoolSettings {
  id?: string;
  ownerId?: string;
  school_name: string; // ชื่อโรงเรียน (ภาษาไทย)
  school_name_en?: string; // ชื่อโรงเรียน (ภาษาอังกฤษ)
  affiliation?: string; // สังกัด เช่น สพป. เชียงใหม่ เขต 1
  ministry?: string; // กระทรวง เช่น สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน กระทรวงศึกษาธิการ
  school_code?: string; // รหัสสถานศึกษา 10 หลัก
  address?: string; // ที่ตั้ง/ถนน
  subdistrict?: string; // ตำบล/แขวง
  district?: string; // อำเภอ/เขต
  province?: string; // จังหวัด
  postal_code?: string; // รหัสไปรษณีย์
  phone_number?: string; // เบอร์โทรศัพท์โรงเรียน
  website_or_email?: string; // เว็บไซต์หรืออีเมล
  director_name: string; // ชื่อผู้อำนวยการโรงเรียน (พร้อมคำนำหน้า)
  director_title?: string; // ตำแหน่ง / วิทยฐานะ
  director_signature_url?: string; // ลายเซ็นดิจิทัล ผอ. (Data URL / PNG)
  academic_year: string; // ปีการศึกษา
  logo_url?: string; // รูปภาพโลโก้โรงเรียน (Base64 Data URL)
  logo_type: SchoolLogoType; // ประเภทตราสัญลักษณ์
  document_header_title?: string; // ข้อความหัวเอกสารแบบรายงานผล ปพ.5
  certificate_header_text?: string; // ข้อความบนหัวเกียรติบัตร
  teacher_name?: string; // ชื่อครูผู้สอน/ครูประจำชั้น
  teacher_signature_url?: string; // ลายเซ็นดิจิทัลครู
  theme_accent_color?: string; // โทนสีเอกสาร
  updatedAt?: string;
}


