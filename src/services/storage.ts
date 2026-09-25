import { Classroom, Student, Subject, Term, ScoreItem, Score, User } from '../types';

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
};

export const INITIAL_USER: User = {
  id: 'user-somsri',
  username: 'kru.somsri',
  password_hash: '1234',
  full_name: 'ครูสมศรี จิตเมตตา',
  school_name: 'โรงเรียนอนุบาลพัฒนาการศึกษา',
  classroom_responsible: 'ป.5/1',
  role: 'teacher',
};

export const INITIAL_CLASSROOMS: Classroom[] = [
  {
    id: 'room-p5-1',
    name: 'ป.5/1',
    level: 'ประถมศึกษาปีที่ 5',
    academic_year: '2568',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
  },
  {
    id: 'room-p6-1',
    name: 'ป.6/1',
    level: 'ประถมศึกษาปีที่ 6',
    academic_year: '2568',
    homeroom_teacher: 'ครูสมศรี จิตเมตตา',
  },
];

export const INITIAL_TERMS: Term[] = [
  { id: 'term-1', name: 'ภาคเรียนที่ 1', academic_year: '2568', max_score: 50 },
  { id: 'term-2', name: 'ภาคเรียนที่ 2', academic_year: '2568', max_score: 50 },
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
  // ห้อง ป.5/1 (20 คน)
  { id: 'stu-1', student_no: 1, name: 'เด็กชายกฤษณะ พงษ์ศิริ', student_code: '50101', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-2', student_no: 2, name: 'เด็กชายชานนท์ สุขเจริญ', student_code: '50102', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-3', student_no: 3, name: 'เด็กชายนพรัตน์ วงศ์สุวรรณ', student_code: '50103', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-4', student_no: 4, name: 'เด็กชายธีรเดช เจริญสุข', student_code: '50104', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-5', student_no: 5, name: 'เด็กชายปกรณ์ ธนะชัย', student_code: '50105', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-6', student_no: 6, name: 'เด็กชายภานุพงศ์ ทองแท้', student_code: '50106', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-7', student_no: 7, name: 'เด็กชายวรพล รักษ์ไทย', student_code: '50107', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-8', student_no: 8, name: 'เด็กชายศิรวิทย์ แก้วมณี', student_code: '50108', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-9', student_no: 9, name: 'เด็กชายอิทธิพล สุริยา', student_code: '50109', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'ชาย' },
  { id: 'stu-10', student_no: 10, name: 'เด็กหญิงกัญญารัตน์ ชัยชนะ', student_code: '50110', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-11', student_no: 11, name: 'เด็กหญิงจิดาภา มิ่งขวัญ', student_code: '50111', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-12', student_no: 12, name: 'เด็กหญิงณิชารีย์ สว่างวงศ์', student_code: '50112', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-13', student_no: 13, name: 'เด็กหญิงธนภรณ์ รุ่งเรือง', student_code: '50113', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-14', student_no: 14, name: 'เด็กหญิงพรทิพย์ ศรีสวัสดิ์', student_code: '50114', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-15', student_no: 15, name: 'เด็กหญิงพิมพ์ชนก บัวงาม', student_code: '50115', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-16', student_no: 16, name: 'เด็กหญิงมนัสนันท์ ทรัพย์มี', student_code: '50116', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-17', student_no: 17, name: 'เด็กหญิงวรรณิษา มหาวรรณ', student_code: '50117', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-18', student_no: 18, name: 'เด็กหญิงศศิธร บุญญา', student_code: '50118', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-19', student_no: 19, name: 'เด็กหญิงสิริพร สิทธิผล', student_code: '50119', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },
  { id: 'stu-20', student_no: 20, name: 'เด็กหญิงอารียา สมหวัง', student_code: '50120', classroom_id: 'room-p5-1', classroom: 'ป.5/1', gender: 'หญิง' },

  // ห้อง ป.6/1 (15 คน)
  { id: 'stu-601', student_no: 1, name: 'เด็กชายกิตติศักดิ์ พรหมดี', student_code: '60101', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-602', student_no: 2, name: 'เด็กชายจิรายุ ภูมิดี', student_code: '60102', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-603', student_no: 3, name: 'เด็กชายณัฐวุฒิ บุญมี', student_code: '60103', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-604', student_no: 4, name: 'เด็กชายทัศนัย ศรีทอง', student_code: '60104', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-605', student_no: 5, name: 'เด็กชายปิยวัฒน์ สมบูรณ์', student_code: '60105', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-606', student_no: 6, name: 'เด็กชายพิชญุตม์ จันทร์เพ็ญ', student_code: '60106', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-607', student_no: 7, name: 'เด็กชายวรเมธ คงเจริญ', student_code: '60107', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'ชาย' },
  { id: 'stu-608', student_no: 8, name: 'เด็กหญิงกมลวรรณ ทรัพย์เจริญ', student_code: '60108', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-609', student_no: 9, name: 'เด็กหญิงชญานิษฐ์ วงศ์ไทย', student_code: '60109', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-610', student_no: 10, name: 'เด็กหญิงณิชกานต์ อารีย์', student_code: '60110', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-611', student_no: 11, name: 'เด็กหญิงธัญลักษณ์ ศรีประเสริฐ', student_code: '60111', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-612', student_no: 12, name: 'เด็กหญิงปวีณา มณีโชติ', student_code: '60112', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-613', student_no: 13, name: 'เด็กหญิงภัทรวดี ทิพย์มณี', student_code: '60113', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-614', student_no: 14, name: 'เด็กหญิงสุภัสสรา แก้ววิไล', student_code: '60114', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
  { id: 'stu-615', student_no: 15, name: 'เด็กหญิงอนุสรา บำรุงสุข', student_code: '60115', classroom_id: 'room-p6-1', classroom: 'ป.6/1', gender: 'หญิง' },
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
  // Initialize storage if empty
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([INITIAL_USER]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLASSROOMS)) {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(INITIAL_CLASSROOMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID, INITIAL_CLASSROOMS[0].id);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TERMS)) {
      localStorage.setItem(STORAGE_KEYS.TERMS, JSON.stringify(INITIAL_TERMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCORE_ITEMS)) {
      const items = generateDefaultScoreItems(INITIAL_SUBJECTS, INITIAL_TERMS);
      localStorage.setItem(STORAGE_KEYS.SCORE_ITEMS, JSON.stringify(items));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCORES)) {
      const students = INITIAL_STUDENTS;
      const items = generateDefaultScoreItems(INITIAL_SUBJECTS, INITIAL_TERMS);
      const scores = generateDefaultScores(students, items);
      localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
    }
  },

  // Auth
  getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
    return raw ? JSON.parse(raw) : INITIAL_CLASSROOMS;
  },

  saveClassrooms(classrooms: Classroom[]) {
    localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms));
  },

  addClassroom(classroom: Omit<Classroom, 'id'>): Classroom {
    const classrooms = this.getClassrooms();
    const id = `room-${Date.now()}`;
    const newClassroom: Classroom = {
      ...classroom,
      id,
    };
    classrooms.push(newClassroom);
    this.saveClassrooms(classrooms);
    return newClassroom;
  },

  updateClassroom(classroom: Classroom) {
    const classrooms = this.getClassrooms();
    const idx = classrooms.findIndex(c => c.id === classroom.id);
    if (idx !== -1) {
      classrooms[idx] = classroom;
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
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID);
    if (saved) return saved;
    const classrooms = this.getClassrooms();
    return classrooms[0]?.id || 'room-p5-1';
  },

  setCurrentClassroomId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID, id);
  },

  // Students
  getAllStudents(): Student[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const list: Student[] = raw ? JSON.parse(raw) : [];
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
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  addStudent(student: Omit<Student, 'id'>): Student {
    const allStudents = this.getAllStudents();
    const newStudent: Student = {
      ...student,
      id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
      allStudents[idx] = student;
      allStudents.sort((a, b) => a.student_no - b.student_no);
      this.saveStudents(allStudents);
    }
  },

  deleteStudent(studentId: string) {
    const allStudents = this.getAllStudents().filter(s => s.id !== studentId);
    this.saveStudents(allStudents);
    // Also remove associated scores
    const scores = this.getScores().filter(s => s.student_id !== studentId);
    this.saveScores(scores);
  },

  // Subjects
  getSubjects(): Subject[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return raw ? JSON.parse(raw) : [];
  },

  saveSubjects(subjects: Subject[]) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  addSubject(subject: Omit<Subject, 'id'>): Subject {
    const subjects = this.getSubjects();
    const newSubject: Subject = {
      ...subject,
      id: `sub-${Date.now()}`,
    };
    subjects.push(newSubject);
    this.saveSubjects(subjects);

    // Auto-create default score items for both terms
    const terms = this.getTerms();
    const items = this.getScoreItems();
    for (const term of terms) {
      items.push(
        { id: `item-${newSubject.id}-${term.id}-1`, subject_id: newSubject.id, term_id: term.id, name: 'ใบงานที่ 1', max_score: 10, category: 'regular' },
        { id: `item-${newSubject.id}-${term.id}-2`, subject_id: newSubject.id, term_id: term.id, name: 'ใบงานที่ 2', max_score: 10, category: 'regular' },
        { id: `item-${newSubject.id}-${term.id}-3`, subject_id: newSubject.id, term_id: term.id, name: 'ชิ้นงาน/จิตพิสัย', max_score: 10, category: 'regular' },
        { id: `item-${newSubject.id}-${term.id}-mid`, subject_id: newSubject.id, term_id: term.id, name: 'สอบกลางภาค', max_score: 10, category: 'midterm' },
        { id: `item-${newSubject.id}-${term.id}-fin`, subject_id: newSubject.id, term_id: term.id, name: 'สอบปลายภาค', max_score: 10, category: 'final' }
      );
    }
    this.saveScoreItems(items);

    return newSubject;
  },

  updateSubject(subject: Subject) {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex(s => s.id === subject.id);
    if (idx !== -1) {
      subjects[idx] = subject;
      this.saveSubjects(subjects);
    }
  },

  deleteSubject(subjectId: string) {
    const subjects = this.getSubjects().filter(s => s.id !== subjectId);
    this.saveSubjects(subjects);
    // Remove score items and scores for this subject
    const items = this.getScoreItems();
    const itemsToDelete = items.filter(it => it.subject_id === subjectId).map(it => it.id);
    this.saveScoreItems(items.filter(it => it.subject_id !== subjectId));

    const scores = this.getScores().filter(sc => !itemsToDelete.includes(sc.score_item_id));
    this.saveScores(scores);
  },

  // Terms
  getTerms(): Term[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TERMS);
    return raw ? JSON.parse(raw) : INITIAL_TERMS;
  },

  saveTerms(terms: Term[]) {
    localStorage.setItem(STORAGE_KEYS.TERMS, JSON.stringify(terms));
  },

  // Score Items
  getScoreItems(subjectId?: string, termId?: string): ScoreItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SCORE_ITEMS);
    let items: ScoreItem[] = raw ? JSON.parse(raw) : [];
    if (subjectId) {
      items = items.filter(i => i.subject_id === subjectId);
    }
    if (termId) {
      items = items.filter(i => i.term_id === termId);
    }
    return items;
  },

  saveScoreItems(items: ScoreItem[]) {
    localStorage.setItem(STORAGE_KEYS.SCORE_ITEMS, JSON.stringify(items));
  },

  addScoreItem(item: Omit<ScoreItem, 'id'>): ScoreItem {
    const items = this.getScoreItems();
    const newItem: ScoreItem = {
      ...item,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    items.push(newItem);
    this.saveScoreItems(items);
    return newItem;
  },

  updateScoreItem(item: ScoreItem) {
    const items = this.getScoreItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      items[idx] = item;
      this.saveScoreItems(items);
    }
  },

  deleteScoreItem(itemId: string) {
    const items = this.getScoreItems().filter(i => i.id !== itemId);
    this.saveScoreItems(items);
    const scores = this.getScores().filter(s => s.score_item_id !== itemId);
    this.saveScores(scores);
  },

  // Scores
  getScores(): Score[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SCORES);
    return raw ? JSON.parse(raw) : [];
  },

  saveScores(scores: Score[]) {
    localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
  },

  upsertScore(score: Omit<Score, 'id'> & { id?: string }): Score {
    const scores = this.getScores();
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
        updated_at: now,
      };
      scores.push(newScore);
      this.saveScores(scores);
      return newScore;
    }
  },

  batchUpsertScores(newScores: Array<Omit<Score, 'id'> & { id?: string }>) {
    const currentScores = this.getScores();
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
          updated_at: now,
        });
      }
    });

    this.saveScores(Array.from(scoreMap.values()));
  },

  // Full Database Backup & Reset
  exportDatabase() {
    return {
      version: '2.0',
      exported_at: new Date().toISOString(),
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
      classrooms: this.getClassrooms(),
      current_classroom_id: this.getCurrentClassroomId(),
      students: this.getAllStudents(),
      subjects: this.getSubjects(),
      terms: this.getTerms(),
      score_items: this.getScoreItems(),
      scores: this.getScores(),
    };
  },

  importDatabase(jsonData: any) {
    if (!jsonData || !jsonData.students || !jsonData.subjects) {
      throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
    }
    if (jsonData.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(jsonData.users));
    if (jsonData.classrooms) localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(jsonData.classrooms));
    if (jsonData.current_classroom_id) localStorage.setItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID, jsonData.current_classroom_id);
    if (jsonData.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(jsonData.students));
    if (jsonData.subjects) localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(jsonData.subjects));
    if (jsonData.terms) localStorage.setItem(STORAGE_KEYS.TERMS, JSON.stringify(jsonData.terms));
    if (jsonData.score_items) localStorage.setItem(STORAGE_KEYS.SCORE_ITEMS, JSON.stringify(jsonData.score_items));
    if (jsonData.scores) localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(jsonData.scores));
  },

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.TERMS);
    localStorage.removeItem(STORAGE_KEYS.SCORE_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.SCORES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CLASSROOMS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CLASSROOM_ID);
    this.init();
  },
};

// Auto-run init
storage.init();
