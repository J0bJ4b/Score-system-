import { Student, StudentFullReport, FeedbackTone, StudentLearningFeedback } from '../types';

interface GenerateFeedbackOptions {
  tone?: FeedbackTone;
  includeStudentName?: boolean;
}

/**
 * วิเคราะห์ผลสัมฤทธิ์และสร้างข้อเสนอแนะเพื่อการเรียนรู้เฉพาะบุคคล (Personalized Learning Feedback)
 * อิงจากเกรดเฉลี่ย (GPA) และผลการเรียนรายวิชา
 */
export function generateStudentLearningFeedback(
  student: Student,
  report: StudentFullReport,
  options: GenerateFeedbackOptions = {}
): StudentLearningFeedback {
  const tone = options.tone || 'balanced';
  const gpa = report.gpa;
  const subjects = report.subjects || [];

  // 1. คัดแยกวิชาเด่น (Strengths) และวิชาที่ควรส่งเสริม (Growth Areas)
  const validSubjects = [...subjects].sort((a, b) => b.total_score - a.total_score);

  const topSubjects = validSubjects
    .filter((s) => parseFloat(s.grade) >= 3.0 || s.total_score >= 70)
    .slice(0, 3)
    .map((s) => s.subject.name);

  const lowSubjects = validSubjects
    .filter((s) => s.status === 'มส' || s.status === 'ร' || parseFloat(s.grade) < 2.5 || s.total_score < 65)
    .reverse()
    .slice(0, 2)
    .map((s) => s.subject.name);

  const hasMissingWork = validSubjects.some((s) => s.status === 'มส');
  const hasAbsentExam = validSubjects.some((s) => s.status === 'ร');

  // คำนวณเปอร์เซ็นต์คะแนนรวมเฉลี่ย
  const totalRaw = validSubjects.reduce((acc, s) => acc + s.total_score, 0);
  const maxPossible = validSubjects.length * 100;
  const totalScorePercentage = maxPossible > 0 ? Math.round((totalRaw / maxPossible) * 100) : 0;

  // กำหนดระดับ Tier
  let performanceTier: StudentLearningFeedback['performanceTier'] = 'moderate';
  if (gpa >= 3.5) {
    performanceTier = 'excellent';
  } else if (gpa >= 3.0) {
    performanceTier = 'very_good';
  } else if (gpa >= 2.5) {
    performanceTier = 'good';
  } else if (gpa >= 2.0 && !hasMissingWork && !hasAbsentExam) {
    performanceTier = 'moderate';
  } else {
    performanceTier = 'needs_attention';
  }

  // 2. สร้างข้อคิดเห็นตามระดับและโทนที่เลือก
  const strengthText =
    topSubjects.length > 0
      ? `มีความโดดเด่นและเข้าใจเนื้อหาเป็นอย่างดีในกลุ่มสาระ${topSubjects.join(', ')}`
      : 'มีความพยายามและมีพัฒนาการที่ดีในการเรียนรู้';

  const growthText =
    lowSubjects.length > 0
      ? `ควรเพิ่มเวลาทบทวนและฝึกทำแบบฝึกหัดเพิ่มเติมในรายวิชา${lowSubjects.join(', ')}`
      : 'ควรรักษามาตรฐานและต่อยอดการค้นคว้าเรียนรู้ด้วยตนเองอย่างต่อเนื่อง';

  let comment = '';
  const studentPrefix = options.includeStudentName !== false ? `${student.name} ` : 'นักเรียน';

  if (tone === 'academic') {
    // โทนเน้นวิชาการและความเป็นเลิศ
    if (performanceTier === 'excellent') {
      comment = `${studentPrefix}มีศักยภาพทางวิชาการและทักษะการคิดวิเคราะห์ในระดับยอดเยี่ยม (GPA ${gpa.toFixed(2)}) ${strengthText} ขอแนะนำให้ส่งเสริมการเข้าร่วมกิจกรรมแข่งขันทางวิชาการหรือโครงงานต่อยอด เพื่อพัฒนาความเป็นผู้นำทางวิชาการอย่างเต็มศักยภาพ`;
    } else if (performanceTier === 'very_good') {
      comment = `${studentPrefix}มีผลการเรียนดีมาก (GPA ${gpa.toFixed(2)}) สามารถทำความเข้าใจและประยุกต์ใช้ความรู้ได้ดี ${strengthText} ${growthText} เพื่อยกระดับสู่ความเป็นเลิศในทุกกลุ่มสาระ`;
    } else if (performanceTier === 'good' || performanceTier === 'moderate') {
      comment = `${studentPrefix}มีพื้นฐานความรู้ในเกณฑ์มาตรฐาน (GPA ${gpa.toFixed(2)}) ${strengthText} หากเพิ่มการวางแผนอ่านหนังสือล่วงหน้าและการฝึกทำโจทย์อย่างเป็นระบบในรายวิชา${lowSubjects.length > 0 ? lowSubjects.join(', ') : 'ที่คะแนนยังไม่คงที่'} จะช่วยเพิ่มคะแนนเฉลี่ยได้อย่างมีนัยสำคัญ`;
    } else {
      comment = `${studentPrefix}ควรได้รับการปรับปรุงพื้นฐานความรู้และกระบวนการเรียนรู้เฉพาะวิชา (GPA ${gpa.toFixed(2)}) โดยเฉพาะในวิชา${lowSubjects.length > 0 ? lowSubjects.join(', ') : 'หลัก'} แนะนำให้ขอคำแนะนำจากครูประจำวิชาและจัดตารางทบทวนบทเรียนรายวัน`;
    }
  } else if (tone === 'encouraging') {
    // โทนเสริมพลังบวก ให้กำลังใจ
    if (performanceTier === 'excellent') {
      comment = `น่าชื่นชมเป็นอย่างยิ่ง! ${studentPrefix}มีความตั้งใจและมุ่งมั่นในการเรียนจนประสบความสำเร็จด้วยผลการเรียนยอดเยี่ยม (GPA ${gpa.toFixed(2)}) ${strengthText} ขอให้ภาคภูมิใจในความพยายาม และเป็นแบบอย่างที่ดีแก่เพื่อนร่วมชั้นต่อไป`;
    } else if (performanceTier === 'very_good') {
      comment = `ยอดเยี่ยมมาก! ${studentPrefix}มีความกระตือรือร้นและใส่ใจในการเรียนอย่างสม่ำเสมอ (GPA ${gpa.toFixed(2)}) ${strengthText} เชื่อมั่นว่าหากมีความตั้งใจและฝึกฝนเพิ่มเติมใน${growthText} จะสามารถพัฒนาตนเองสู่ระดับสูงสุดได้อย่างแน่นอน`;
    } else if (performanceTier === 'good' || performanceTier === 'moderate') {
      comment = `${studentPrefix}มีความตั้งใจและมีพัฒนาการที่ดีขึ้นอย่างต่อเนื่อง (GPA ${gpa.toFixed(2)}) ${strengthText} ขอเป็นกำลังใจให้ไม่ท้อถอย โดยเน้นทบทวนบทเรียนใน${growthText} ครูเชื่อมั่นในศักยภาพของนักเรียน`;
    } else {
      comment = `${studentPrefix}มีศักยภาพที่สามารถพัฒนาให้ดีขึ้นได้ ขอเพียงมีความเชื่อมั่นในตนเอง ไม่ย่อท้อ และหมั่นส่งงานให้ครบตรงเวลา โดยเฉพาะ${growthText} ขอให้เริ่มลงมือทำทีละก้าว ครูพร้อมให้คำปรึกษาและสนับสนุนเสมอ`;
    }
  } else if (tone === 'ministry_standard') {
    // โทนมาตรฐาน สพฐ. กระชับสำหรับ ปพ.6
    if (performanceTier === 'excellent') {
      comment = `ผลการเรียนอยู่ในเกณฑ์ดีเยี่ยม (GPA ${gpa.toFixed(2)}) มีความรับผิดชอบต่องานดีเด่น มีวินัยใฝ่เรียนรู้ และมีผลสัมฤทธิ์สูงในทุกกลุ่มสาระ ควรส่งเสริมความเป็นเลิศต่อไป`;
    } else if (performanceTier === 'very_good') {
      comment = `ผลการเรียนอยู่ในเกณฑ์ดีมาก (GPA ${gpa.toFixed(2)}) ให้ความร่วมมือในกิจกรรมการเรียนสม่ำเสมอ ${growthText} เพื่อผลสัมฤทธิ์ที่ดียิ่งขึ้น`;
    } else if (performanceTier === 'good') {
      comment = `ผลการเรียนอยู่ในเกณฑ์ดี (GPA ${gpa.toFixed(2)}) มีความตั้งใจเรียนตามเกณฑ์มาตรฐาน ควรหมั่นทบทวนบทเรียนและส่งงานตรงเวลา`;
    } else if (performanceTier === 'moderate') {
      comment = `ผลการเรียนอยู่ในเกณฑ์ปานกลาง (GPA ${gpa.toFixed(2)}) ผ่านเกณฑ์การประเมิน ควรได้รับการกระตุ้นและส่งเสริมการทบทวนบทเรียนอย่างสม่ำเสมอ`;
    } else {
      comment = `ผลการเรียนต้องได้รับการปรับปรุงและดูแลช่วยเหลือ (GPA ${gpa.toFixed(2)}) ควรจัดสอนซ่อมเสริมและติดตามการส่งงานที่ค้างอย่างใกล้ชิด`;
    }
  } else {
    // โทนสมดุล ครบถ้วน (Balanced - Default)
    if (performanceTier === 'excellent') {
      comment = `${studentPrefix}มีความรับผิดชอบและวินัยในการเรียนรู้ระดับยอดเยี่ยม มีผลการเรียนเฉลี่ย ${gpa.toFixed(2)} ${strengthText} แสดงถึงความเข้าใจเนื้อหาอย่างลึกซึ้ง แนะนำให้รักษามาตรฐานนี้และแบ่งปันความรู้ช่วยเหลือเพื่อนๆ ในห้องเรียน`;
    } else if (performanceTier === 'very_good') {
      comment = `${studentPrefix}มีความตั้งใจเรียนและส่งงานสม่ำเสมอ ผลการเรียนอยู่ในเกณฑ์ดีมาก (GPA ${gpa.toFixed(2)}) ${strengthText} หากเพิ่มเวลาทบทวนบทเรียนใน${growthText} จะช่วยให้ผลสัมฤทธิ์สมบูรณ์แบบยิ่งขึ้น`;
    } else if (performanceTier === 'good') {
      comment = `${studentPrefix}มีพัฒนาการทางการเรียนรู้ที่ดีและมีความรับผิดชอบต่อหน้าที่ (GPA ${gpa.toFixed(2)}) ${strengthText} ข้อแนะนำคือควรจัดสรรเวลาทบทวนบทเรียนสม่ำเสมอใน${growthText}`;
    } else if (performanceTier === 'moderate') {
      comment = `${studentPrefix}มีผลการเรียนอยู่ในเกณฑ์ผ่านเกณฑ์มาตรฐาน (GPA ${gpa.toFixed(2)}) ${strengthText} แต่ยังต้องเพิ่มความรอบคอบและจัดเวลาทำการบ้านให้เสร็จตรงเวลา โดยเฉพาะใน${growthText}`;
    } else {
      let warning = '';
      if (hasMissingWork) warning = ' เนื่องจากยังมีภาระงานที่ค้างส่ง (มส)';
      if (hasAbsentExam) warning = ' เนื่องจากมีประวัติขาดสอบบางรายวิชา (ร)';
      comment = `${studentPrefix}ควรได้รับการดูแลและส่งเสริมการเรียนรู้อย่างใกล้ชิด (GPA ${gpa.toFixed(2)})${warning} แนะนำให้ประสานงานกับครูผู้สอนเพื่อรับการสอนซ่อมเสริมและส่งงานให้ครบถ้วนเพื่อปรับปรุงผลการเรียนให้ผ่านเกณฑ์`;
    }
  }

  // 3. สร้างข้อแนะนำเชิงปฏิบัติ 3 ข้อ (Action Steps)
  const actionSteps: string[] = [];
  if (performanceTier === 'excellent') {
    actionSteps.push('รักษามาตรฐานการเรียนสม่ำเสมอและทำสรุปทบทวนบทเรียน (Mind Map) ประจำสัปดาห์');
    actionSteps.push('ท้าทายตนเองด้วยการค้นคว้าโจทย์ระดับประยุกต์หรือเข้าร่วมกิจกรรมการแข่งขันทางวิชาการ');
    actionSteps.push('ฝึกการเป็นผู้นำทางวิชาการด้วยการแลกเปลี่ยนเรียนรู้และติวเนื้อหาให้เพื่อนในห้อง');
  } else if (performanceTier === 'very_good' || performanceTier === 'good') {
    actionSteps.push(`จัดตารางทบทวนวิชา${lowSubjects.length > 0 ? lowSubjects.join(' และ ') : 'หลัก'} สัปดาห์ละ 2-3 ครั้ง ครั้งละ 30 นาที`);
    actionSteps.push('จดบันทึกประเด็นสำคัญในห้องเรียนและซักถามครูผู้สอนทันทีเมื่อเกิดข้อสงสัย');
    actionSteps.push('ส่งชิ้นงานและใบงานครบถ้วนตรงตามเวลาที่กำหนดเพื่อรักษาคะแนนเก็บเต็ม');
  } else {
    actionSteps.push('จัดทำตารางเวลาทำการบ้านและทบทวนบทเรียนทุกวัน วันละ 30-45 นาที');
    actionSteps.push('ตรวจสอบสมุดการบ้านและส่งงานที่ค้างให้ครบถ้วนทุกรายวิชา');
    actionSteps.push('ขอคำแนะนำและการสอนซ่อมเสริมจากครูประจำวิชาในหัวข้อที่ไม่เข้าใจ');
  }

  return {
    id: `fb-${student.id}`,
    studentId: student.id,
    studentName: student.name,
    classroomId: student.classroom_id,
    tone,
    comment,
    strengths: topSubjects,
    growthAreas: lowSubjects,
    actionSteps,
    performanceTier,
    gpa,
    totalScorePercentage,
    isCustomized: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * สร้างข้อเสนอแนะเพื่อการเรียนรู้ให้นักเรียนทั้งห้องในคลิกเดียว (Batch Generation)
 */
export function generateClassroomFeedbackBatch(
  students: Student[],
  getReportFn: (student: Student) => StudentFullReport,
  tone: FeedbackTone = 'balanced'
): Record<string, StudentLearningFeedback> {
  const result: Record<string, StudentLearningFeedback> = {};

  for (const stu of students) {
    try {
      const report = getReportFn(stu);
      result[stu.id] = generateStudentLearningFeedback(stu, report, { tone });
    } catch {
      // Fallback if report calculation encounters empty data
    }
  }

  return result;
}
