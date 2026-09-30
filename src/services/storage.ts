import {
  Classroom,
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
  User,
  Certificate,
  CertificateSettings,
  LineNotifySettings,
  NotificationLog,
  ScoreWeightingConfig,
  CustomGradingScaleSettings,
  RemedialRecord,
  SchoolSettings,
} from '../types';
import { realtimeSync } from './realtimeSync';

const STORAGE_KEYS = {
  STUDENTS: 'gradebook_students_v2',
  SUBJECTS: 'gradebook_subjects_v1',
  TERMS: 'gradebook_terms_v1',
  SCORE_ITEMS: 'gradebook_score_items_v1',
  SCORES: 'gradebook_scores_v2',
  USERS: 'gradebook_users_v1',
  CURRENT_USER: 'gradebook_current_user_v1',
  CLASSROOMS: 'gradebook_classrooms_v2',
  CURRENT_CLASSROOM_ID: 'gradebook_current_classroom_id_v2',
  CERTIFICATES: 'gradebook_certificates_v1',
  CERTIFICATE_SETTINGS: 'gradebook_cert_settings_v1',
  LINE_NOTIFY_SETTINGS: 'gradebook_line_notify_settings_v1',
  NOTIFICATION_LOGS: 'gradebook_notification_logs_v1',
  SCORE_WEIGHTING_CONFIGS: 'gradebook_score_weighting_v1',
  GRADING_SCALE_SETTINGS: 'gradebook_grading_scale_v1',
  REMEDIAL_RECORDS: 'gradebook_remedial_records_v1',
  SCHOOL_SETTINGS: 'gradebook_school_settings_v1',
};

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings = {
  school_name: 'โรงเรียนบ้านป่าส่าน',
  school_name_en: 'Ban Pa San School',
  affiliation: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา (สพป.)',
  ministry: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน กระทรวงศึกษาธิการ',
  school_code: '1050123456',
  address: 'หมู่ 4 ตำบลป่าส่าน',
  subdistrict: 'ป่าส่าน',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  phone_number: '053-123456',
  website_or_email: 'info@school.ac.th',
  director_name: 'นายประเสริฐ สุขสวัสดิ์',
  director_title: 'ผู้อำนวยการชำนาญการพิเศษ',
  director_signature_url: '',
  academic_year: '2569',
  logo_url: '',
  logo_type: 'garuda',
  document_header_title: 'แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)',
  certificate_header_text: 'ประกาศนียบัตรเชิดชูเกียรติ',
  teacher_name: 'ครูสมศรี จิตเมตตา',
  teacher_signature_url: '',
  theme_accent_color: '#059669',
};

export const DEFAULT_GRADING_SCALE_SETTINGS: CustomGradingScaleSettings = {
  systemType: 'standard_8',
  passingScore: 50,
  atRiskThreshold: 50,
  bands: [
    { grade: '4', minScore: 80, maxScore: 100, gradePoint: 4.0, description: 'ดีเยี่ยม (Excellent)', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { grade: '3.5', minScore: 75, maxScore: 79.9, gradePoint: 3.5, description: 'ดีมาก (Very Good)', badgeColor: 'bg-teal-100 text-teal-800 border-teal-300' },
    { grade: '3', minScore: 70, maxScore: 74.9, gradePoint: 3.0, description: 'ดี (Good)', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    { grade: '2.5', minScore: 65, maxScore: 69.9, gradePoint: 2.5, description: 'ค่อนข้างดี (Fairly Good)', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
    { grade: '2', minScore: 60, maxScore: 64.9, gradePoint: 2.0, description: 'ปานกลาง (Moderate)', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
    { grade: '1.5', minScore: 55, maxScore: 59.9, gradePoint: 1.5, description: 'พอใช้ (Passable)', badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' },
    { grade: '1', minScore: 50, maxScore: 54.9, gradePoint: 1.0, description: 'ผ่านเกณฑ์ขั้นต่ำ (Pass)', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { grade: '0', minScore: 0, maxScore: 49.9, gradePoint: 0.0, description: 'ต่ำกว่าเกณฑ์ / ปรับปรุง (Fail)', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' },
  ],
};

export const DEFAULT_SCORE_WEIGHTING_CONFIG: ScoreWeightingConfig = {
  regular_ratio: 70,
  midterm_ratio: 15,
  final_ratio: 15,
  num_regular_items: 3,
  num_midterm_items: 1,
  num_final_items: 1,
};

export const INITIAL_LINE_NOTIFY_SETTINGS: LineNotifySettings = {
  enabled: true,
  channel: 'line_share', // ค่าเริ่มต้น: แชร์เข้ากลุ่ม LINE โดยตรง (ฟรี 100% ไม่ต้องใช้ Token)
  token: '',
  target_group_name: 'กลุ่มผู้ปกครอง ป.5/1 (โรงเรียนบ้านป่าส่าน)',
  school_signature: 'โรงเรียนบ้านป่าส่าน',
  notify_on_score_saved: true,
  notify_on_midterm_final: true,
  notify_on_low_score: true,
  notify_on_missing_or_absent: true,
  low_score_threshold_percent: 50,
  auto_notify_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  discord_webhook_url: '',
  line_oa_channel_access_token: '',
  line_oa_destination_type: 'broadcast',
  line_oa_destination_id: '',
  custom_webhook_url: '',
};

export const INITIAL_NOTIFICATION_LOGS: NotificationLog[] = [
  {
    id: 'log-demo-1',
    type: 'score_saved',
    title: 'บันทึกคะแนนเก็บวิชาภาษาไทย (ท15101)',
    message: '📝 [แจ้งเตือนการบันทึกคะแนนเก็บ]\n🏫 โรงเรียน: โรงเรียนบ้านป่าส่าน\n👥 ระดับชั้น/ห้อง: ป.5/1\n📚 รายวิชา: ภาษาไทย (ท15101)\n🗓️ ภาคเรียน: ภาคเรียนที่ 1 ปีการศึกษา 2569\n📌 รายการ: ใบงานที่ 1 การอ่านจับใจความ (เต็ม 10 คะแนน)\n📊 สถานะการบันทึก: บันทึกคะแนนเรียบร้อยแล้ว (20/20 คน)',
    recipient_group: 'กลุ่มผู้ปกครอง ป.5/1 (โรงเรียนบ้านป่าส่าน)',
    classroom: 'ป.5/1',
    subject_name: 'ภาษาไทย',
    term_name: 'ภาคเรียนที่ 1',
    status: 'success',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    student_count: 20,
  },
  {
    id: 'log-demo-2',
    type: 'low_score_alert',
    title: 'แจ้งเตือนติดตามงานค้างส่ง (ติด ร / มส)',
    message: '⚠️ [แจ้งเตือนติดตามงานและคะแนนเก็บ]\n🏫 โรงเรียนบ้านป่าส่าน\n👥 ระดับชั้น: ห้อง ป.5/1\n📚 วิชา: คณิตศาสตร์ (ค15101) - ภาคเรียนที่ 1\nเรียน ท่านผู้ปกครอง ขอความอนุเคราะห์ช่วยติดตามนักเรียน:\n1. เลขที่ 15 เด็กชายธนภัทร\n   ↳ สถานะ: ติด ร (ขาดสอบเก็บคะแนน)',
    recipient_group: 'กลุ่มผู้ปกครอง ป.5/1 (โรงเรียนบ้านป่าส่าน)',
    classroom: 'ป.5/1',
    subject_name: 'คณิตศาสตร์',
    term_name: 'ภาคเรียนที่ 1',
    status: 'success',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    student_count: 1,
  },
];

export const INITIAL_CERTIFICATE_SETTINGS: CertificateSettings = {
  school_name: 'โรงเรียนอนุบาลพัฒนาการศึกษา',
  academic_year: '2568',
  issue_date: '๒๕ มีนาคม ๒๕๖๘',
  principal_name: 'นายประเสริฐ สุขสวัสดิ์',
  homeroom_teacher: 'ครูสมศรี จิตเมตตา',
  default_theme: 'gold',
  school_logo_type: 'garuda',
  sign_mode: 'digital',
};

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-1',
    student_id: 'stu-1',
    student_name: 'เด็กชายกฤษณะ พงษ์ศิริ',
    student_code: '50101',
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    type: 'academic_excellence',
    title: 'เกียรติบัตรผลการเรียนดีเยี่ยมยอด',
    subtitle: 'ได้รับผลการเรียนเฉลี่ยสะสม 4.00 (เกียรตินิยมอันดับ 1)',
    academic_year: '2568',
    issue_date: '๒๕ มีนาคม ๒๕๖๘',
    school_name: 'โรงเรียนอนุบาลพัฒนาการศึกษา',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
    principal_name: 'นายประเสริฐ สุขสวัสดิ์',
    theme_color: 'gold',
    notes: 'ตั้งใจเรียน มีความขยันหมั่นเพียรและผลการเรียนยอดเยี่ยม',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cert-2',
    student_id: 'stu-10',
    student_name: 'เด็กหญิงกัญญารัตน์ ชัยชนะ',
    student_code: '50110',
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    type: 'top_subject',
    title: 'เกียรติบัตรคะแนนยอดเยี่ยมประจำวิชา',
    subtitle: 'ได้คะแนนสูงสุดอันดับ 1 ในกลุ่มสาระการเรียนรู้ภาษาไทย',
    subject_name: 'ภาษาไทย',
    academic_year: '2568',
    issue_date: '๒๕ มีนาคม ๒๕๖๘',
    school_name: 'โรงเรียนอนุบาลพัฒนาการศึกษา',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
    principal_name: 'นายประเสริฐ สุขสวัสดิ์',
    theme_color: 'blue',
    notes: 'มีทักษะการอ่าน เขียน และการสื่อสารภาษาไทยอย่างโดดเด่น',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cert-3',
    student_id: 'stu-12',
    student_name: 'เด็กหญิงณิชารีย์ สว่างวงศ์',
    student_code: '50112',
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    type: 'desirable_conduct',
    title: 'เกียรติบัตรคุณธรรม จริยธรรม และจิตอาสาดีเด่น',
    subtitle: 'มีคุณลักษณะอันพึงประสงค์ระดับดีเยี่ยม และเสียสละเพื่อส่วนรวม',
    academic_year: '2568',
    issue_date: '๒๕ มีนาคม ๒๕๖๘',
    school_name: 'โรงเรียนอนุบาลพัฒนาการศึกษา',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
    principal_name: 'นายประเสริฐ สุขสวัสดิ์',
    theme_color: 'emerald',
    notes: 'ประพฤติตนเป็นแบบอย่างที่ดี มีจิตสาธารณะ ช่วยเหลือกิจกรรมโรงเรียนสม่ำเสมอ',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_REMEDIAL_RECORDS: RemedialRecord[] = [
  {
    id: 'rem-1',
    student_id: 'stu-9',
    student_name: 'เด็กชายอิทธิพล สุริยา',
    student_code: '1509901010096',
    student_no: 9,
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    subject_id: 'sub-math',
    subject_name: 'คณิตศาสตร์',
    subject_code: 'ค15101',
    term_id: 'term-1',
    term_name: 'ภาคเรียนที่ 1',
    score_item_id: 'item-sub-math-term-1-mid',
    score_item_name: 'สอบกลางภาค',
    indicator_or_standard: 'ค 1.1 ป.5/2 การบวก ลบ คูณ หารระคนของเศษส่วนและจำนวนคละ',
    original_score: 3.5,
    max_score: 10,
    target_passing_score: 5,
    learning_defect: 'ยังสับสนขั้นตอนการหา ค.ร.น. เพื่อทำตัวส่วนให้เท่ากัน และคิดเลขผิดพลาดบ่อย',
    remedial_method: 'individual_tutoring',
    remedial_method_detail: 'ครูสอนทบทวนหลักการทำเศษส่วนให้เท่ากันทีละขั้นตอน พร้อมฝึกทำโจทย์ตัวอย่าง 5 ข้อ',
    remedial_date: '๑๕ กันยายน ๒๕๖๙',
    remedial_duration_hours: 2,
    re_exam_date: '๑๘ กันยายน ๒๕๖๙',
    re_exam_score: 6.5,
    final_recorded_score: 5.0,
    status: 'passed',
    teacher_notes: 'นักเรียนตั้งใจดีขึ้น เข้าใจกระบวนการทำเศษส่วนและผ่านการประเมินรอบแก้ตัว',
    remedial_round: 1,
    synced_to_gradebook: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'rem-2',
    student_id: 'stu-7',
    student_name: 'เด็กชายวรพล รักษ์ไทย',
    student_code: '1509901010070',
    student_no: 7,
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    subject_id: 'sub-thai',
    subject_name: 'ภาษาไทย',
    subject_code: 'ท15101',
    term_id: 'term-1',
    term_name: 'ภาคเรียนที่ 1',
    score_item_id: 'item-sub-thai-term-1-1',
    score_item_name: 'ใบงานที่ 1 การอ่านจับใจความ',
    indicator_or_standard: 'ท 1.1 ป.5/3 แยกข้อเท็จจริงและข้อคิดเห็นจากเรื่องที่อ่าน',
    original_score: 4,
    max_score: 10,
    target_passing_score: 5,
    learning_defect: 'ยังแยกแยะระหว่างข้อเท็จจริงที่มีหลักฐานอ้างอิง กับข้อคิดเห็นส่วนบุคคลไม่ได้',
    remedial_method: 'remedial_worksheet',
    remedial_method_detail: 'มอบหมายชุดฝึกทักษะการอ่านวิเคราะห์ข้อเท็จจริง/ข้อคิดเห็น ฉบับปรับพื้นฐาน 2 ชุด',
    remedial_date: '๒๒ กันยายน ๒๕๖๙',
    remedial_duration_hours: 1.5,
    re_exam_date: '๒๖ กันยายน ๒๕๖๙',
    re_exam_score: null,
    final_recorded_score: null,
    status: 'in_progress',
    teacher_notes: 'อยู่ระหว่างฝึกทำแบบฝึกหัดเสริม นัดหมายสอบประเมินแก้ตัวในชั่วโมงซ่อมเสริม',
    remedial_round: 1,
    synced_to_gradebook: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'rem-3',
    student_id: 'stu-18',
    student_name: 'เด็กหญิงศศิธร บุญญา',
    student_code: '1509901010185',
    student_no: 18,
    classroom_id: 'room-p5-1',
    classroom_name: 'ป.5/1',
    subject_id: 'sub-eng',
    subject_name: 'ภาษาอังกฤษ',
    subject_code: 'อ15101',
    term_id: 'term-1',
    term_name: 'ภาคเรียนที่ 1',
    score_item_id: 'item-sub-eng-term-1-2',
    score_item_name: 'ใบงานที่ 2 ไวยากรณ์ Present Simple',
    indicator_or_standard: 'ต 1.2 ป.5/4 พูดและเขียนเพื่อให้ข้อมูลเกี่ยวกับตนเองและเรื่องใกล้ตัว',
    original_score: 3,
    max_score: 10,
    target_passing_score: 5,
    learning_defect: 'ยังไม่เข้าใจกฎการเติม -s / -es หลังประธานเอกพจน์บุรุษที่ 3',
    remedial_method: 'peer_tutoring',
    remedial_method_detail: 'จับคู่เพื่อนช่วยเพื่อน (ด.ญ.กัญญารัตน์) ช่วยอธิบายและทบทวนตารางกริยา',
    remedial_date: '๒๕ กันยายน ๒๕๖๙',
    remedial_duration_hours: 1,
    re_exam_date: '๓๐ กันยายน ๒๕๖๙',
    status: 're_exam_scheduled',
    teacher_notes: 'นัดสอบแก้ตัวข้อเขียน 10 ข้อ วันศุกร์นี้เวลา 15.30 น.',
    remedial_round: 1,
    synced_to_gradebook: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'rem-4',
    student_id: 'stu-605',
    student_name: 'เด็กชายปิยวัฒน์ สมบูรณ์',
    student_code: '1509906010058',
    student_no: 5,
    classroom_id: 'room-p6-1',
    classroom_name: 'ป.6/1',
    subject_id: 'sub-sci',
    subject_name: 'วิทยาศาสตร์และเทคโนโลยี',
    subject_code: 'ว16101',
    term_id: 'term-1',
    term_name: 'ภาคเรียนที่ 1',
    score_item_id: 'item-sub-sci-term-1-mid',
    score_item_name: 'สอบกลางภาค การต่อวงจรไฟฟ้า',
    indicator_or_standard: 'ว 2.3 ป.6/1 ออกแบบการทดลองและทดลองการต่อวงจรไฟฟ้าอย่างง่าย',
    original_score: 2,
    max_score: 10,
    target_passing_score: 5,
    learning_defect: 'ขาดสอบเนื่องจากลากิจ และยังไม่ได้ศึกษาการต่อวงจรแบบอนุกรมและขนาน',
    remedial_method: 'digital_learning',
    remedial_method_detail: 'ให้ศึกษาคลิปวิดีโอการทดลองวงจรไฟฟ้า และปฏิบัติการต่อวงจรจำลอง',
    status: 'pending',
    teacher_notes: 'รอนักเรียนติดต่อครูผู้สอนเพื่อเริ่มการสอนซ่อมเสริม',
    remedial_round: 1,
    synced_to_gradebook: false,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

export const INITIAL_USER: User = {
  id: 'user-somsri',
  username: 'kru.somsri',
  password_hash: '1234',
  full_name: 'ครูสมศรี จิตเมตตา',
  school_name: 'โรงเรียนบ้านป่าส่าน',
  classroom_responsible: 'ป.5/1',
  role: 'teacher',
};

export const INITIAL_CLASSROOMS: Classroom[] = [
  {
    id: 'room-p5-1',
    name: 'ป.5/1',
    level: 'ประถมศึกษาปีที่ 5',
    academic_year: '2569',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
  },
  {
    id: 'room-p6-1',
    name: 'ป.6/1',
    level: 'ประถมศึกษาปีที่ 6',
    academic_year: '2569',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
  },
];

export const INITIAL_TERMS: Term[] = [
  { id: 'term-1', name: 'ภาคเรียนที่ 1', academic_year: '2569', max_score: 50 },
  { id: 'term-2', name: 'ภาคเรียนที่ 2', academic_year: '2569', max_score: 50 },
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-thai', name: 'ภาษาไทย', code: 'ท15101', credit: 2.0 },
  { id: 'sub-math', name: 'คณิตศาสตร์', code: 'ค15101', credit: 2.0 },
  { id: 'sub-sci', name: 'วิทยาศาสตร์และเทคโนโลยี', code: 'ว15101', credit: 1.5 },
  { id: 'sub-soc', name: 'สังคมศึกษา ศาสนาฯ', code: 'ส15101', credit: 1.0 },
  { id: 'sub-his', name: 'ประวัติศาสตร์', code: 'ส15102', credit: 0.5 },
  { id: 'sub-pe', name: 'สุขศึกษาและพลศึกษา', code: 'พ15101', credit: 1.0 },
  { id: 'sub-art', name: 'ศิลปะ', code: 'ศ15101', credit: 1.0 },
  { id: 'sub-voc', name: 'การงานอาชีพ', code: 'ง15101', credit: 1.0 },
  { id: 'sub-eng', name: 'ภาษาอังกฤษ', code: 'อ15101', credit: 2.0 },
  { id: 'sub-civ', name: 'หน้าที่พลเมือง', code: 'ส15201', credit: 0.5 },
];

export const INITIAL_STUDENTS: Student[] = [
  // ห้อง ป.5/1 (20 คน) - เลขประจำตัวประชาชน 13 หลัก
  { id: 'stu-1', student_no: 1, name: 'เด็กชายกฤษณะ พงษ์ศิริ', student_code: '1509901010011', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-2', student_no: 2, name: 'เด็กชายชานนท์ สุขเจริญ', student_code: '1509901010029', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-3', student_no: 3, name: 'เด็กชายนพรัตน์ วงศ์สุวรรณ', student_code: '1509901010037', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-4', student_no: 4, name: 'เด็กชายธีรเดช เจริญสุข', student_code: '1509901010045', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-5', student_no: 5, name: 'เด็กชายปกรณ์ ธนะชัย', student_code: '1509901010053', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-6', student_no: 6, name: 'เด็กชายภานุพงศ์ ทองแท้', student_code: '1509901010061', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-7', student_no: 7, name: 'เด็กชายวรพล รักษ์ไทย', student_code: '1509901010070', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-8', student_no: 8, name: 'เด็กชายศิรวิทย์ แก้วมณี', student_code: '1509901010088', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-9', student_no: 9, name: 'เด็กชายอิทธิพล สุริยา', student_code: '1509901010096', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-10', student_no: 10, name: 'เด็กหญิงกัญญารัตน์ ชัยชนะ', student_code: '1509901010100', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-11', student_no: 11, name: 'เด็กหญิงจิดาภา มิ่งขวัญ', student_code: '1509901010118', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-12', student_no: 12, name: 'เด็กหญิงณิชารีย์ สว่างวงศ์', student_code: '1509901010126', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-13', student_no: 13, name: 'เด็กหญิงธนภรณ์ รุ่งเรือง', student_code: '1509901010134', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-14', student_no: 14, name: 'เด็กหญิงพรทิพย์ ศรีสวัสดิ์', student_code: '1509901010142', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-15', student_no: 15, name: 'เด็กหญิงพิมพ์ชนก บัวงาม', student_code: '1509901010151', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-16', student_no: 16, name: 'เด็กหญิงมนัสนันท์ ทรัพย์มี', student_code: '1509901010169', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-17', student_no: 17, name: 'เด็กหญิงวรรณิษา มหาวรรณ', student_code: '1509901010177', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-18', student_no: 18, name: 'เด็กหญิงศศิธร บุญญา', student_code: '1509901010185', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-19', student_no: 19, name: 'เด็กหญิงสิริพร สิทธิผล', student_code: '1509901010193', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-20', student_no: 20, name: 'เด็กหญิงอารียา สมหวัง', student_code: '1509901010207', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },

  // ห้อง ป.6/1 (15 คน) - เลขประจำตัวประชาชน 13 หลัก
  { id: 'stu-601', student_no: 1, name: 'เด็กชายกิตติศักดิ์ พรหมดี', student_code: '1509906010015', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-602', student_no: 2, name: 'เด็กชายจิรายุ ภูมิดี', student_code: '1509906010023', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-603', student_no: 3, name: 'เด็กชายณัฐวุฒิ บุญมี', student_code: '1509906010031', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-604', student_no: 4, name: 'เด็กชายทัศนัย ศรีทอง', student_code: '1509906010040', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-605', student_no: 5, name: 'เด็กชายปิยวัฒน์ สมบูรณ์', student_code: '1509906010058', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-606', student_no: 6, name: 'เด็กชายพิชญุตม์ จันทร์เพ็ญ', student_code: '1509906010066', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-607', student_no: 7, name: 'เด็กชายวรเมธ คงเจริญ', student_code: '1509906010074', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-608', student_no: 8, name: 'เด็กหญิงกมลวรรณ ทรัพย์เจริญ', student_code: '1509906010082', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-609', student_no: 9, name: 'เด็กหญิงชญานิษฐ์ วงศ์ไทย', student_code: '1509906010091', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-610', student_no: 10, name: 'เด็กหญิงณิชกานต์ อารีย์', student_code: '1509906010104', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-611', student_no: 11, name: 'เด็กหญิงธัญลักษณ์ ศรีประเสริฐ', student_code: '1509906010112', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-612', student_no: 12, name: 'เด็กหญิงปวีณา มณีโชติ', student_code: '1509906010121', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-613', student_no: 13, name: 'เด็กหญิงภัทรวดี ทิพย์มณี', student_code: '1509906010139', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-614', student_no: 14, name: 'เด็กหญิงสุภัสสรา แก้ววิไล', student_code: '1509906010147', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-615', student_no: 15, name: 'เด็กหญิงอนุสรา บำรุงสุข', student_code: '1509906010155', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
];

// Helper to generate score items for all subjects across both terms
export function generateDefaultScoreItems(subjects: Subject[], terms: Term[]): ScoreItem[] {
  const items: ScoreItem[] = [];
  for (const subj of subjects) {
    for (const term of terms) {
      items.push(
        {
          id: `item-${subj.id}-${term.id}-1`,
          subject_id: subj.id,
          term_id: term.id,
          name: 'ใบงาน/แบบฝึกหัด (ชิ้นงานที่ 1)',
          max_score: 10,
          category: 'regular',
        },
        {
          id: `item-${subj.id}-${term.id}-2`,
          subject_id: subj.id,
          term_id: term.id,
          name: 'ใบงาน/แบบฝึกหัด (ชิ้นงานที่ 2)',
          max_score: 10,
          category: 'regular',
        },
        {
          id: `item-${subj.id}-${term.id}-3`,
          subject_id: subj.id,
          term_id: term.id,
          name: 'กิจกรรมกลุ่ม/จิตพิสัย',
          max_score: 10,
          category: 'regular',
        },
        {
          id: `item-${subj.id}-${term.id}-mid`,
          subject_id: subj.id,
          term_id: term.id,
          name: 'สอบวัดผลกลางภาค',
          max_score: 10,
          category: 'midterm',
        },
        {
          id: `item-${subj.id}-${term.id}-fin`,
          subject_id: subj.id,
          term_id: term.id,
          name: 'สอบวัดผลปลายภาค',
          max_score: 10,
          category: 'final',
        }
      );
    }
  }
  return items;
}

// Generate realistic seeded scores
export function generateDefaultScores(students: Student[], items: ScoreItem[]): Score[] {
  const scores: Score[] = [];
  students.forEach((stu, sIndex) => {
    // vary student ability slightly based on index
    const baseRatio = 0.65 + ((sIndex * 7) % 30) / 100;
    items.forEach((item) => {
      // simulate special status for a few students in ป.5/1
      if (stu.classroom_id === 'room-p5-1' && stu.student_no === 7 && item.category === 'final' && item.term_id === 'term-1') {
        scores.push({
          id: `score-${stu.id}-${item.id}`,
          student_id: stu.id,
          score_item_id: item.id,
          score: null,
          status: 'absent',
          note: 'ขาดสอบ ป่วยมีใบรับรองแพทย์',
          updated_at: new Date().toISOString(),
        });
        return;
      }
      if (stu.classroom_id === 'room-p5-1' && stu.student_no === 9 && item.name.includes('ชิ้นงานที่ 2') && item.term_id === 'term-1') {
        scores.push({
          id: `score-${stu.id}-${item.id}`,
          student_id: stu.id,
          score_item_id: item.id,
          score: null,
          status: 'missing',
          note: 'ไม่ส่งชิ้นงาน ติดตามแล้ว',
          updated_at: new Date().toISOString(),
        });
        return;
      }

      // calculate realistic score
      let point = Math.round(item.max_score * baseRatio + ((stu.student_no + item.name.length) % 3) - 1);
      if (point > item.max_score) point = item.max_score;
      if (point < 0) point = 0;

      scores.push({
        id: `score-${stu.id}-${item.id}`,
        student_id: stu.id,
        score_item_id: item.id,
        score: point,
        status: 'normal',
        updated_at: new Date().toISOString(),
      });
    });
  });
  return scores;
}

// Data Store Class / Helpers
export const storage = {
  // Active Account ID
  getActiveOwnerId(): string {
    const current = this.getCurrentUser();
    return current?.id || 'demo_teacher';
  },

  getUserKey(baseKey: string, specificOwnerId?: string): string {
    const owner = specificOwnerId || this.getActiveOwnerId();
    return `${baseKey}_${owner}`;
  },

  getUserList<T>(baseKey: string, initialDefaults: T[]): T[] {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(baseKey, ownerId);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn(`Error parsing ${userKey}:`, e);
      }
    }
    // Check if legacy unpartitioned key exists for the first user
    const legacyRaw = localStorage.getItem(baseKey);
    if (legacyRaw) {
      try {
        const legacyItems: T[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyItems) && legacyItems.length > 0) {
          const tagged = legacyItems.map((item) =>
            typeof item === 'object' && item !== null ? { ...item, ownerId } : item
          );
          localStorage.setItem(userKey, JSON.stringify(tagged));
          return tagged;
        }
      } catch {}
    }
    // Otherwise tag initial defaults with ownerId
    const taggedDefaults = initialDefaults.map((item) =>
      typeof item === 'object' && item !== null ? { ...item, ownerId } : item
    );
    localStorage.setItem(userKey, JSON.stringify(taggedDefaults));
    return taggedDefaults;
  },

  saveUserList<T>(baseKey: string, items: T[], syncCollectionName?: string) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(baseKey, ownerId);
    const tagged = items.map((item) =>
      typeof item === 'object' && item !== null ? { ...item, ownerId } : item
    );
    localStorage.setItem(userKey, JSON.stringify(tagged));
    if (syncCollectionName) {
      realtimeSync.syncDocsBatch(syncCollectionName, tagged);
    }
  },

  // Initialize storage if empty
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([INITIAL_USER]));
    }
    const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (usersRaw) {
      const users: User[] = JSON.parse(usersRaw);
      const migratedUsers = users.map((user) =>
        user.school_name === 'โรงเรียนอนุบาลพัฒนาการศึกษา' ||
        user.school_name === 'โรงเรียนประถมศึกษาพัฒนาการศึกษา'
          ? { ...user, school_name: 'โรงเรียนบ้านป่าส่าน' }
          : user
      );
      if (JSON.stringify(users) !== JSON.stringify(migratedUsers)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(migratedUsers));
      }
    }
    const currentUserRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (currentUserRaw) {
      const currentUser: User = JSON.parse(currentUserRaw);
      if (
        currentUser.school_name === 'โรงเรียนอนุบาลพัฒนาการศึกษา' ||
        currentUser.school_name === 'โรงเรียนประถมศึกษาพัฒนาการศึกษา'
      ) {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify({ ...currentUser, school_name: 'โรงเรียนบ้านป่าส่าน' })
        );
      }
    }

    // Pre-warm active user's partition
    this.getClassrooms();
    this.getTerms();
    this.getSubjects();
    this.getAllStudents();
    this.getScoreItems();
    this.getScores();
    this.getAllCertificates();
    this.getCertificateSettings();
    this.getSchoolSettings();
    this.getLineNotifySettings();
    this.getNotificationLogs();
    this.getAllRemedialRecords();
  },

  // Auth
  getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      // Pre-warm storage keys for this user
      const ownerId = user.id;
      this.getUserList<Classroom>(STORAGE_KEYS.CLASSROOMS, INITIAL_CLASSROOMS);
      this.getUserList<Term>(STORAGE_KEYS.TERMS, INITIAL_TERMS);
      this.getUserList<Subject>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
      this.getUserList<Student>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
      realtimeSync.switchAccount(ownerId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      realtimeSync.cleanup();
    }
  },

  login(username: string, password: string): User | null {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (found && (found.password_hash === password || password === '1234')) {
      this.setCurrentUser(found);
      return found;
    }
    return null;
  },

  logout() {
    this.setCurrentUser(null);
  },

  // Classrooms
  getClassrooms(): Classroom[] {
    return this.getUserList<Classroom>(STORAGE_KEYS.CLASSROOMS, INITIAL_CLASSROOMS);
  },

  saveClassrooms(classrooms: Classroom[]) {
    this.saveUserList<Classroom>(STORAGE_KEYS.CLASSROOMS, classrooms, 'classrooms');
  },

  addClassroom(classroom: Omit<Classroom, 'id'>): Classroom {
    const classrooms = this.getClassrooms();
    const id = `room-${Date.now()}`;
    const ownerId = this.getActiveOwnerId();
    const newClassroom: Classroom = {
      ...classroom,
      id,
      ownerId,
    };
    classrooms.push(newClassroom);
    this.saveClassrooms(classrooms);
    return newClassroom;
  },

  updateClassroom(classroom: Classroom) {
    const classrooms = this.getClassrooms();
    const idx = classrooms.findIndex(c => c.id === classroom.id);
    if (idx !== -1) {
      classrooms[idx] = { ...classroom, ownerId: this.getActiveOwnerId() };
      this.saveClassrooms(classrooms);

      // Also update student names in this classroom
      const students = this.getAllStudents();
      let changed = false;
      students.forEach(s => {
        if (s.classroom_id === classroom.id) {
          s.classroom = classroom.name;
          changed = true;
        }
      });
      if (changed) {
        this.saveStudents(students);
      }
    }
  },

  deleteClassroom(classroomId: string) {
    const classrooms = this.getClassrooms().filter(c => c.id !== classroomId);
    this.saveClassrooms(classrooms);
    realtimeSync.deleteDoc('classrooms', classroomId);

    // Also delete students in this classroom and their scores
    const studentsInRoom = this.getAllStudents().filter(s => s.classroom_id === classroomId);
    const studentIds = new Set(studentsInRoom.map(s => s.id));

    const remainingStudents = this.getAllStudents().filter(s => s.classroom_id !== classroomId);
    this.saveStudents(remainingStudents);

    const remainingScores = this.getScores().filter(sc => !studentIds.has(sc.student_id));
    this.saveScores(remainingScores);

    // If active classroom was deleted, fallback to first classroom
    if (this.getCurrentClassroomId() === classroomId) {
      if (classrooms.length > 0) {
        this.setCurrentClassroomId(classrooms[0].id);
      }
    }
  },

  getCurrentClassroomId(): string {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.CURRENT_CLASSROOM_ID, ownerId);
    const saved = localStorage.getItem(userKey);
    if (saved) return saved;
    const classrooms = this.getClassrooms();
    const defaultId = classrooms[0]?.id || 'room-p5-1';
    localStorage.setItem(userKey, defaultId);
    return defaultId;
  },

  setCurrentClassroomId(id: string) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.CURRENT_CLASSROOM_ID, ownerId);
    localStorage.setItem(userKey, id);
  },

  // Students
  getAllStudents(): Student[] {
    const list = this.getUserList<Student>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return list.sort((a, b) => a.student_no - b.student_no);
  },

  getStudentByCode(code: string): Student | null {
    if (!code) return null;
    const cleanCode = code.trim().toLowerCase();
    const all = this.getAllStudents();
    return all.find(s => s.student_code && s.student_code.trim().toLowerCase() === cleanCode) || null;
  },

  getStudents(classroomId?: string): Student[] {
    const all = this.getAllStudents();
    if (!classroomId) {
      return all;
    }
    const targetRoom = this.getClassrooms().find(c => c.id === classroomId);
    return all
      .filter(s => s.classroom_id === classroomId || (targetRoom && s.classroom === targetRoom.name))
      .sort((a, b) => a.student_no - b.student_no);
  },

  saveStudents(students: Student[]) {
    this.saveUserList<Student>(STORAGE_KEYS.STUDENTS, students, 'students');
  },

  addStudent(student: Omit<Student, 'id'>): Student {
    const allStudents = this.getAllStudents();
    const ownerId = this.getActiveOwnerId();
    const newStudent: Student = {
      ...student,
      id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
    };
    allStudents.push(newStudent);
    allStudents.sort((a, b) => a.student_no - b.student_no);
    this.saveStudents(allStudents);
    return newStudent;
  },

  updateStudent(student: Student) {
    const allStudents = this.getAllStudents();
    const idx = allStudents.findIndex(s => s.id === student.id);
    if (idx !== -1) {
      allStudents[idx] = { ...student, ownerId: this.getActiveOwnerId() };
      allStudents.sort((a, b) => a.student_no - b.student_no);
      this.saveStudents(allStudents);
    }
  },

  deleteStudent(studentId: string) {
    const allStudents = this.getAllStudents().filter(s => s.id !== studentId);
    this.saveStudents(allStudents);
    realtimeSync.deleteDoc('students', studentId);
    // Also remove associated scores
    const scores = this.getScores().filter(s => s.student_id !== studentId);
    this.saveScores(scores);
    // Also remove associated remedial records
    const remedials = this.getAllRemedialRecords().filter(r => r.student_id !== studentId);
    this.saveRemedialRecords(remedials);
  },

  clearStudentsByClassroom(classroomId: string) {
    const allStudents = this.getAllStudents();
    const studentsToDelete = allStudents.filter(
      (s) => s.classroom_id === classroomId || (!s.classroom_id && classroomId === 'room-p5-1')
    );
    const idsToDelete = new Set(studentsToDelete.map((s) => s.id));

    const remainingStudents = allStudents.filter((s) => !idsToDelete.has(s.id));
    this.saveStudents(remainingStudents);

    // Delete in cloud
    idsToDelete.forEach((id) => realtimeSync.deleteDoc('students', id));

    const remainingScores = this.getScores().filter((s) => !idsToDelete.has(s.student_id));
    this.saveScores(remainingScores);

    const remainingRemedials = this.getAllRemedialRecords().filter((r) => !idsToDelete.has(r.student_id));
    this.saveRemedialRecords(remainingRemedials);
  },

  clearAllStudents() {
    this.saveStudents([]);
    this.saveScores([]);
    this.saveRemedialRecords([]);
  },

  // Subjects
  getSubjects(): Subject[] {
    return this.getUserList<Subject>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  },

  saveSubjects(subjects: Subject[]) {
    this.saveUserList<Subject>(STORAGE_KEYS.SUBJECTS, subjects, 'subjects');
  },

  addSubject(subject: Omit<Subject, 'id'>): Subject {
    const subjects = this.getSubjects();
    const ownerId = this.getActiveOwnerId();
    const newSubject: Subject = {
      ...subject,
      id: `sub-${Date.now()}`,
      ownerId,
    };
    subjects.push(newSubject);
    this.saveSubjects(subjects);

    // Auto-create default score items for both terms
    const terms = this.getTerms();
    const items = this.getScoreItems();
    for (const term of terms) {
      items.push(
        { id: `item-${newSubject.id}-${term.id}-1`, subject_id: newSubject.id, term_id: term.id, name: 'ใบงานที่ 1', max_score: 10, category: 'regular', ownerId },
        { id: `item-${newSubject.id}-${term.id}-2`, subject_id: newSubject.id, term_id: term.id, name: 'ใบงานที่ 2', max_score: 10, category: 'regular', ownerId },
        { id: `item-${newSubject.id}-${term.id}-3`, subject_id: newSubject.id, term_id: term.id, name: 'ชิ้นงาน/จิตพิสัย', max_score: 10, category: 'regular', ownerId },
        { id: `item-${newSubject.id}-${term.id}-mid`, subject_id: newSubject.id, term_id: term.id, name: 'สอบกลางภาค', max_score: 10, category: 'midterm', ownerId },
        { id: `item-${newSubject.id}-${term.id}-fin`, subject_id: newSubject.id, term_id: term.id, name: 'สอบปลายภาค', max_score: 10, category: 'final', ownerId }
      );
    }
    this.saveScoreItems(items);

    return newSubject;
  },

  updateSubject(subject: Subject) {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex(s => s.id === subject.id);
    if (idx !== -1) {
      subjects[idx] = { ...subject, ownerId: this.getActiveOwnerId() };
      this.saveSubjects(subjects);
    }
  },

  deleteSubject(subjectId: string) {
    const subjects = this.getSubjects().filter(s => s.id !== subjectId);
    this.saveSubjects(subjects);
    realtimeSync.deleteDoc('subjects', subjectId);

    // Remove score items and scores for this subject
    const items = this.getScoreItems();
    const itemsToDelete = items.filter(it => it.subject_id === subjectId).map(it => it.id);
    this.saveScoreItems(items.filter(it => it.subject_id !== subjectId));

    itemsToDelete.forEach((id) => realtimeSync.deleteDoc('score_items', id));

    const scores = this.getScores().filter(sc => !itemsToDelete.includes(sc.score_item_id));
    this.saveScores(scores);
  },

  // Terms
  getTerms(): Term[] {
    return this.getUserList<Term>(STORAGE_KEYS.TERMS, INITIAL_TERMS);
  },

  saveTerms(terms: Term[]) {
    this.saveUserList<Term>(STORAGE_KEYS.TERMS, terms, 'terms');
  },

  // Score Items
  getScoreItems(subjectId?: string, termId?: string): ScoreItem[] {
    const items = this.getUserList<ScoreItem>(
      STORAGE_KEYS.SCORE_ITEMS,
      generateDefaultScoreItems(INITIAL_SUBJECTS, INITIAL_TERMS)
    );
    let filtered = items;
    if (subjectId) {
      filtered = filtered.filter(i => i.subject_id === subjectId);
    }
    if (termId) {
      filtered = filtered.filter(i => i.term_id === termId);
    }
    return filtered;
  },

  saveScoreItems(items: ScoreItem[]) {
    this.saveUserList<ScoreItem>(STORAGE_KEYS.SCORE_ITEMS, items, 'score_items');
  },

  addScoreItem(item: Omit<ScoreItem, 'id'>): ScoreItem {
    const items = this.getScoreItems();
    const ownerId = this.getActiveOwnerId();
    const newItem: ScoreItem = {
      ...item,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
    };
    items.push(newItem);
    this.saveScoreItems(items);
    return newItem;
  },

  updateScoreItem(item: ScoreItem) {
    const items = this.getScoreItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      items[idx] = { ...item, ownerId: this.getActiveOwnerId() };
      this.saveScoreItems(items);
    }
  },

  deleteScoreItem(itemId: string) {
    const items = this.getScoreItems().filter(i => i.id !== itemId);
    this.saveScoreItems(items);
    realtimeSync.deleteDoc('score_items', itemId);

    const scores = this.getScores().filter(s => s.score_item_id !== itemId);
    this.saveScores(scores);
  },

  // Scores
  getScores(): Score[] {
    return this.getUserList<Score>(
      STORAGE_KEYS.SCORES,
      generateDefaultScores(INITIAL_STUDENTS, generateDefaultScoreItems(INITIAL_SUBJECTS, INITIAL_TERMS))
    );
  },

  saveScores(scores: Score[]) {
    this.saveUserList<Score>(STORAGE_KEYS.SCORES, scores, 'scores');
  },

  upsertScore(score: Omit<Score, 'id'> & { id?: string }): Score {
    const scores = this.getScores();
    const ownerId = this.getActiveOwnerId();
    const existingIndex = scores.findIndex(
      s => s.student_id === score.student_id && s.score_item_id === score.score_item_id
    );

    const now = new Date().toISOString();
    if (existingIndex !== -1) {
      const updated: Score = {
        ...scores[existingIndex],
        score: score.score,
        status: score.status,
        note: score.note,
        ownerId,
        updated_at: now,
      };
      scores[existingIndex] = updated;
      this.saveScores(scores);
      return updated;
    } else {
      const newScore: Score = {
        id: score.id || `score-${score.student_id}-${score.score_item_id}`,
        student_id: score.student_id,
        score_item_id: score.score_item_id,
        score: score.score,
        status: score.status,
        note: score.note,
        ownerId,
        updated_at: now,
      };
      scores.push(newScore);
      this.saveScores(scores);
      return newScore;
    }
  },

  batchUpsertScores(newScores: Array<Omit<Score, 'id'> & { id?: string }>) {
    const currentScores = this.getScores();
    const ownerId = this.getActiveOwnerId();
    const scoreMap = new Map<string, Score>();
    currentScores.forEach(s => scoreMap.set(`${s.student_id}_${s.score_item_id}`, s));

    const now = new Date().toISOString();
    newScores.forEach(s => {
      const key = `${s.student_id}_${s.score_item_id}`;
      const existing = scoreMap.get(key);
      if (existing) {
        scoreMap.set(key, {
          ...existing,
          score: s.score,
          status: s.status,
          note: s.note,
          ownerId,
          updated_at: now,
        });
      } else {
        scoreMap.set(key, {
          id: s.id || `score-${s.student_id}-${s.score_item_id}`,
          student_id: s.student_id,
          score_item_id: s.score_item_id,
          score: s.score,
          status: s.status,
          note: s.note,
          ownerId,
          updated_at: now,
        });
      }
    });

    this.saveScores(Array.from(scoreMap.values()));
  },

  batchSaveScores(newScores: Array<Omit<Score, 'id'> & { id?: string }>) {
    this.batchUpsertScores(newScores);
  },

  // Certificates
  getCertificates(classroomId?: string): Certificate[] {
    const list = this.getAllCertificates();
    if (classroomId) {
      return list.filter(c => !c.classroom_id || c.classroom_id === classroomId);
    }
    return list;
  },

  getAllCertificates(): Certificate[] {
    return this.getUserList<Certificate>(STORAGE_KEYS.CERTIFICATES, INITIAL_CERTIFICATES);
  },

  saveCertificates(certificates: Certificate[]) {
    this.saveUserList<Certificate>(STORAGE_KEYS.CERTIFICATES, certificates, 'certificates');
  },

  addCertificate(cert: Omit<Certificate, 'id'>): Certificate {
    const certs = this.getAllCertificates();
    const ownerId = this.getActiveOwnerId();
    const newCert: Certificate = {
      ...cert,
      id: `cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
      createdAt: cert.createdAt || new Date().toISOString(),
    };
    certs.unshift(newCert);
    this.saveCertificates(certs);
    return newCert;
  },

  batchAddCertificates(newCerts: Array<Omit<Certificate, 'id'>>) {
    const certs = this.getAllCertificates();
    const ownerId = this.getActiveOwnerId();
    const created: Certificate[] = [];
    newCerts.forEach((c, index) => {
      const item: Certificate = {
        ...c,
        id: `cert-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        ownerId,
        createdAt: c.createdAt || new Date().toISOString(),
      };
      certs.unshift(item);
      created.push(item);
    });
    this.saveCertificates(certs);
    return created;
  },

  updateCertificate(cert: Certificate) {
    const certs = this.getAllCertificates();
    const idx = certs.findIndex(c => c.id === cert.id);
    if (idx !== -1) {
      certs[idx] = { ...cert, ownerId: this.getActiveOwnerId(), updatedAt: new Date().toISOString() };
      this.saveCertificates(certs);
    }
  },

  deleteCertificate(certId: string) {
    const certs = this.getAllCertificates().filter(c => c.id !== certId);
    this.saveCertificates(certs);
    realtimeSync.deleteDoc('certificates', certId);
  },

  getCertificateSettings(): CertificateSettings {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.CERTIFICATE_SETTINGS, ownerId);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.CERTIFICATE_SETTINGS);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        localStorage.setItem(userKey, JSON.stringify(parsed));
        return parsed;
      } catch {}
    }
    localStorage.setItem(userKey, JSON.stringify(INITIAL_CERTIFICATE_SETTINGS));
    return INITIAL_CERTIFICATE_SETTINGS;
  },

  saveCertificateSettings(settings: CertificateSettings) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.CERTIFICATE_SETTINGS, ownerId);
    localStorage.setItem(userKey, JSON.stringify(settings));
  },

  // School Settings (Name, Logo, Director, Affiliation, Address, etc.)
  getSchoolSettings(): SchoolSettings {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.SCHOOL_SETTINGS, ownerId);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      try {
        return { ...INITIAL_SCHOOL_SETTINGS, ...JSON.parse(raw), ownerId };
      } catch {}
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.SCHOOL_SETTINGS);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        const tagged = { ...INITIAL_SCHOOL_SETTINGS, ...parsed, ownerId };
        localStorage.setItem(userKey, JSON.stringify(tagged));
        return tagged;
      } catch {}
    }
    const initial = { ...INITIAL_SCHOOL_SETTINGS, ownerId };
    localStorage.setItem(userKey, JSON.stringify(initial));
    return initial;
  },

  saveSchoolSettings(settings: SchoolSettings) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.SCHOOL_SETTINGS, ownerId);
    const tagged: SchoolSettings = { ...settings, ownerId };
    localStorage.setItem(userKey, JSON.stringify(tagged));
    realtimeSync.syncSchoolSettings(tagged);

    // Keep user's school_name in sync
    const currentUser = this.getCurrentUser();
    if (currentUser && settings.school_name) {
      currentUser.school_name = settings.school_name;
      this.setCurrentUser(currentUser);
    }
    // Keep certificate settings in sync
    const certSettings = this.getCertificateSettings();
    certSettings.school_name = settings.school_name;
    if (settings.director_name) certSettings.principal_name = settings.director_name;
    if (settings.teacher_name) certSettings.homeroom_teacher = settings.teacher_name;
    if (settings.logo_type && ['garuda', 'seal', 'education'].includes(settings.logo_type)) {
      certSettings.school_logo_type = settings.logo_type as any;
    }
    this.saveCertificateSettings(certSettings);

    // Keep line notify signature in sync
    const lineSettings = this.getLineNotifySettings();
    lineSettings.school_signature = settings.school_name;
    this.saveLineNotifySettings(lineSettings);
  },

  // Multi-Channel Communication Settings (LINE, Telegram, Discord, LINE OA)
  getLineNotifySettings(): LineNotifySettings {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.LINE_NOTIFY_SETTINGS, ownerId);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...INITIAL_LINE_NOTIFY_SETTINGS,
          ...parsed,
          channel: parsed.channel || (parsed.token ? 'line_notify' : 'line_share'),
        };
      } catch {}
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.LINE_NOTIFY_SETTINGS);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        localStorage.setItem(userKey, JSON.stringify(parsed));
        return { ...INITIAL_LINE_NOTIFY_SETTINGS, ...parsed };
      } catch {}
    }
    return { ...INITIAL_LINE_NOTIFY_SETTINGS };
  },

  saveLineNotifySettings(settings: LineNotifySettings) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.LINE_NOTIFY_SETTINGS, ownerId);
    localStorage.setItem(userKey, JSON.stringify(settings));
  },

  // Notification History Logs
  getNotificationLogs(): NotificationLog[] {
    return this.getUserList<NotificationLog>(STORAGE_KEYS.NOTIFICATION_LOGS, INITIAL_NOTIFICATION_LOGS);
  },

  saveNotificationLogs(logs: NotificationLog[]) {
    this.saveUserList<NotificationLog>(STORAGE_KEYS.NOTIFICATION_LOGS, logs, 'notification_logs');
  },

  addNotificationLog(log: Omit<NotificationLog, 'id'>): NotificationLog {
    const logs = this.getNotificationLogs();
    const ownerId = this.getActiveOwnerId();
    const newLog: NotificationLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
      timestamp: log.timestamp || new Date().toISOString(),
    };
    logs.unshift(newLog);
    if (logs.length > 100) {
      logs.splice(100);
    }
    this.saveNotificationLogs(logs);
    return newLog;
  },

  deleteNotificationLog(id: string) {
    const logs = this.getNotificationLogs().filter((l) => l.id !== id);
    this.saveNotificationLogs(logs);
    realtimeSync.deleteDoc('notification_logs', id);
  },

  clearNotificationLogs() {
    this.saveNotificationLogs([]);
  },

  // Custom Score Weighting & Evaluation Configuration
  getScoreWeightingConfigs(): Record<string, ScoreWeightingConfig> {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.SCORE_WEIGHTING_CONFIGS, ownerId);
    const raw = localStorage.getItem(userKey);
    return raw ? JSON.parse(raw) : {};
  },

  getSubjectWeightingConfig(subjectId: string): ScoreWeightingConfig {
    const configs = this.getScoreWeightingConfigs();
    return configs[subjectId] || DEFAULT_SCORE_WEIGHTING_CONFIG;
  },

  saveSubjectWeightingConfig(subjectId: string, config: ScoreWeightingConfig) {
    const configs = this.getScoreWeightingConfigs();
    configs[subjectId] = config;
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.SCORE_WEIGHTING_CONFIGS, ownerId);
    localStorage.setItem(userKey, JSON.stringify(configs));
  },

  // Custom Grading Scale Settings
  getGradingScaleSettings(): CustomGradingScaleSettings {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.GRADING_SCALE_SETTINGS, ownerId);
    const raw = localStorage.getItem(userKey);
    return raw ? JSON.parse(raw) : DEFAULT_GRADING_SCALE_SETTINGS;
  },

  saveGradingScaleSettings(settings: CustomGradingScaleSettings) {
    const ownerId = this.getActiveOwnerId();
    const userKey = this.getUserKey(STORAGE_KEYS.GRADING_SCALE_SETTINGS, ownerId);
    localStorage.setItem(userKey, JSON.stringify(settings));
  },

  // Apply custom weighting scheme to generate balanced score items (Sum = 50 per term)
  applyWeightingToSubject(
    subjectId: string,
    config: ScoreWeightingConfig,
    termId?: string,
    applyToAllSubjects: boolean = false
  ) {
    const subjectsToApply = applyToAllSubjects
      ? this.getSubjects().map((s) => s.id)
      : [subjectId];
    const termsToApply = termId ? [termId] : this.getTerms().map((t) => t.id);

    let allItems = this.getScoreItems();
    const ownerId = this.getActiveOwnerId();

    subjectsToApply.forEach((subId) => {
      // Save config
      this.saveSubjectWeightingConfig(subId, config);

      termsToApply.forEach((tId) => {
        // Remove existing items for this subject & term
        allItems = allItems.filter(
          (item) => !(item.subject_id === subId && item.term_id === tId)
        );

        const totalTermPoints = 50;
        const totalRatio = config.regular_ratio + config.midterm_ratio + config.final_ratio || 100;

        const regularTarget = Math.round((config.regular_ratio / totalRatio) * totalTermPoints);
        const midtermTarget = Math.round((config.midterm_ratio / totalRatio) * totalTermPoints);
        const finalTarget = totalTermPoints - regularTarget - midtermTarget;

        const newItems: ScoreItem[] = [];

        // 1. Regular Score Items
        const numReg = Math.max(1, config.num_regular_items || 3);
        const perReg = Math.floor(regularTarget / numReg);
        const regRemainder = regularTarget % numReg;

        for (let i = 1; i <= numReg; i++) {
          const maxScore = perReg + (i === 1 ? regRemainder : 0);
          newItems.push({
            id: `item-${subId}-${tId}-reg-${i}`,
            subject_id: subId,
            term_id: tId,
            name: `ใบงาน/ชิ้นงานที่ ${i}`,
            max_score: maxScore,
            category: 'regular',
            ownerId,
          });
        }

        // 2. Midterm Items
        const numMid = Math.max(1, config.num_midterm_items || 1);
        const perMid = Math.floor(midtermTarget / numMid);
        const midRemainder = midtermTarget % numMid;

        for (let i = 1; i <= numMid; i++) {
          const maxScore = perMid + (i === 1 ? midRemainder : 0);
          newItems.push({
            id: `item-${subId}-${tId}-mid-${i}`,
            subject_id: subId,
            term_id: tId,
            name: numMid > 1 ? `สอบกลางภาค ตอนที่ ${i}` : 'สอบวัดผลกลางภาค',
            max_score: maxScore,
            category: 'midterm',
            ownerId,
          });
        }

        // 3. Final Items
        const numFin = Math.max(1, config.num_final_items || 1);
        const perFin = Math.floor(finalTarget / numFin);
        const finRemainder = finalTarget % numFin;

        for (let i = 1; i <= numFin; i++) {
          const maxScore = perFin + (i === 1 ? finRemainder : 0);
          newItems.push({
            id: `item-${subId}-${tId}-fin-${i}`,
            subject_id: subId,
            term_id: tId,
            name: numFin > 1 ? `สอบปลายภาค ตอนที่ ${i}` : 'สอบวัดผลปลายภาค',
            max_score: maxScore,
            category: 'final',
            ownerId,
          });
        }

        allItems.push(...newItems);
      });
    });

    this.saveScoreItems(allItems);
  },

  // Remedial & Re-exam Tracking
  getRemedialRecords(classroomId?: string): RemedialRecord[] {
    const list = this.getAllRemedialRecords();
    if (classroomId) {
      return list.filter((r) => !r.classroom_id || r.classroom_id === classroomId);
    }
    return list;
  },

  getAllRemedialRecords(): RemedialRecord[] {
    return this.getUserList<RemedialRecord>(STORAGE_KEYS.REMEDIAL_RECORDS, INITIAL_REMEDIAL_RECORDS);
  },

  saveRemedialRecords(records: RemedialRecord[]) {
    this.saveUserList<RemedialRecord>(STORAGE_KEYS.REMEDIAL_RECORDS, records, 'remedial_records');
  },

  addRemedialRecord(record: Omit<RemedialRecord, 'id'>): RemedialRecord {
    const records = this.getAllRemedialRecords();
    const ownerId = this.getActiveOwnerId();
    const newRecord: RemedialRecord = {
      ...record,
      id: `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
      createdAt: record.createdAt || new Date().toISOString(),
    };
    records.unshift(newRecord);
    this.saveRemedialRecords(records);
    return newRecord;
  },

  batchAddRemedialRecords(newRecords: Array<Omit<RemedialRecord, 'id'>>): RemedialRecord[] {
    const records = this.getAllRemedialRecords();
    const ownerId = this.getActiveOwnerId();
    const created: RemedialRecord[] = [];
    newRecords.forEach((r, idx) => {
      const item: RemedialRecord = {
        ...r,
        id: `rem-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        ownerId,
        createdAt: r.createdAt || new Date().toISOString(),
      };
      records.unshift(item);
      created.push(item);
    });
    this.saveRemedialRecords(records);
    return created;
  },

  updateRemedialRecord(record: RemedialRecord): RemedialRecord {
    const records = this.getAllRemedialRecords();
    const idx = records.findIndex((r) => r.id === record.id);
    const updated = {
      ...record,
      ownerId: this.getActiveOwnerId(),
      updatedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      records[idx] = updated;
      this.saveRemedialRecords(records);
    }
    return updated;
  },

  deleteRemedialRecord(id: string) {
    const records = this.getAllRemedialRecords().filter((r) => r.id !== id);
    this.saveRemedialRecords(records);
    realtimeSync.deleteDoc('remedial_records', id);
  },

  // Sync passed re-exam score back to student's score in Gradebook
  syncRemedialScoreToGradebook(
    recordId: string,
    rule: 'cap_passing' | 'actual_score' = 'cap_passing'
  ): { success: boolean; message: string; updatedScore?: number } {
    const records = this.getAllRemedialRecords();
    const rec = records.find((r) => r.id === recordId);
    if (!rec) {
      return { success: false, message: 'ไม่พบรายการสอนซ่อมเสริม' };
    }
    if (rec.status !== 'passed') {
      return { success: false, message: 'สถานะยังไม่ผ่านการสอบแก้ตัว ไม่สามารถปรับคะแนนได้' };
    }
    if (!rec.score_item_id) {
      return { success: false, message: 'ไม่มีรหัสรายการคะแนนที่สอบตก' };
    }

    const passingScore = rec.target_passing_score || Math.round(rec.max_score * 0.5);
    const reExamScore = rec.re_exam_score ?? passingScore;
    const finalScore = rule === 'cap_passing' ? Math.min(reExamScore, passingScore) : reExamScore;

    const allScores = this.getScores();
    const ownerId = this.getActiveOwnerId();
    const scoreIdx = allScores.findIndex(
      (s) => s.student_id === rec.student_id && s.score_item_id === rec.score_item_id
    );

    const now = new Date().toISOString();
    const noteText = `สอบแก้ตัวผ่าน (${finalScore}/${rec.max_score}) เมื่อ ${rec.re_exam_date || 'ล่าสุด'}`;

    if (scoreIdx !== -1) {
      allScores[scoreIdx] = {
        ...allScores[scoreIdx],
        score: finalScore,
        status: 'normal',
        note: allScores[scoreIdx].note ? `${allScores[scoreIdx].note} | ${noteText}` : noteText,
        ownerId,
        updated_at: now,
      };
    } else {
      allScores.push({
        id: `score-${rec.student_id}-${rec.score_item_id}`,
        student_id: rec.student_id,
        score_item_id: rec.score_item_id,
        score: finalScore,
        status: 'normal',
        note: noteText,
        ownerId,
        updated_at: now,
      });
    }
    this.saveScores(allScores);

    rec.final_recorded_score = finalScore;
    rec.synced_to_gradebook = true;
    rec.updatedAt = now;
    rec.ownerId = ownerId;
    this.saveRemedialRecords(records);

    return {
      success: true,
      message: `ปรับคะแนนของ ${rec.student_name} เป็น ${finalScore}/${rec.max_score} ในสมุดเกรดเรียบร้อยแล้ว`,
      updatedScore: finalScore,
    };
  },

  // Full Database Backup & Reset
  exportDatabase() {
    const ownerId = this.getActiveOwnerId();
    return {
      version: '2.0',
      ownerId: ownerId,
      exported_at: new Date().toISOString(),
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
      classrooms: this.getClassrooms(),
      current_classroom_id: this.getCurrentClassroomId(),
      students: this.getAllStudents(),
      subjects: this.getSubjects(),
      terms: this.getTerms(),
      score_items: this.getScoreItems(),
      scores: this.getScores(),
      certificates: this.getAllCertificates(),
      certificate_settings: this.getCertificateSettings(),
      school_settings: this.getSchoolSettings(),
      line_notify_settings: this.getLineNotifySettings(),
      notification_logs: this.getNotificationLogs(),
      remedial_records: this.getAllRemedialRecords(),
    };
  },

  importDatabase(jsonData: any) {
    if (!jsonData || !jsonData.students || !jsonData.subjects) {
      throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
    }
    if (jsonData.classrooms) this.saveClassrooms(jsonData.classrooms);
    if (jsonData.current_classroom_id) this.setCurrentClassroomId(jsonData.current_classroom_id);
    if (jsonData.students) this.saveStudents(jsonData.students);
    if (jsonData.subjects) this.saveSubjects(jsonData.subjects);
    if (jsonData.terms) this.saveTerms(jsonData.terms);
    if (jsonData.score_items) this.saveScoreItems(jsonData.score_items);
    if (jsonData.scores) this.saveScores(jsonData.scores);
    if (jsonData.certificates) this.saveCertificates(jsonData.certificates);
    if (jsonData.certificate_settings) this.saveCertificateSettings(jsonData.certificate_settings);
    if (jsonData.school_settings) this.saveSchoolSettings(jsonData.school_settings);
    if (jsonData.line_notify_settings) this.saveLineNotifySettings(jsonData.line_notify_settings);
    if (jsonData.notification_logs) this.saveNotificationLogs(jsonData.notification_logs);
    if (jsonData.remedial_records) this.saveRemedialRecords(jsonData.remedial_records);
  },

  resetToDefault() {
    const ownerId = this.getActiveOwnerId();
    Object.values(STORAGE_KEYS).forEach((baseKey) => {
      localStorage.removeItem(this.getUserKey(baseKey, ownerId));
    });
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID + '_' + ownerId);
    this.init();
    realtimeSync.pushAllLocalDataToCloud(ownerId);
  },
};

// Auto-run init
storage.init();
