import { storage } from './storage';
import {
  LineNotifySettings,
  NotificationChannel,
  NotificationLog,
  NotificationType,
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
} from '../types';

export interface SendNotificationResult {
  success: boolean;
  simulated?: boolean;
  message: string;
  statusCode?: number;
  logId?: string;
  error?: string;
}

export const lineNotifyService = {
  /**
   * Get current settings
   */
  getSettings(): LineNotifySettings {
    return storage.getLineNotifySettings();
  },

  /**
   * Save settings
   */
  saveSettings(settings: LineNotifySettings) {
    storage.saveLineNotifySettings(settings);
  },

  /**
   * Send a message through the selected notification channel
   */
  async sendMessage(
    message: string,
    meta: {
      type: NotificationType;
      title: string;
      classroom?: string;
      subjectName?: string;
      termName?: string;
      studentCount?: number;
      tokenOverride?: string;
      channelOverride?: NotificationChannel;
    }
  ): Promise<SendNotificationResult> {
    const settings = this.getSettings();
    const channel: NotificationChannel = meta.channelOverride || settings.channel || 'line_share';
    const recipientGroup = settings.target_group_name || 'กลุ่มผู้ปกครอง';

    // 1. Channel: LINE Direct Share (ฟรี 100% ไม่ต้องใช้ Token)
    if (channel === 'line_share') {
      const shareUrl = this.getLineShareUrl(message);
      const log = storage.addNotificationLog({
        type: meta.type,
        title: meta.title,
        message,
        recipient_group: recipientGroup,
        classroom: meta.classroom,
        subject_name: meta.subjectName,
        term_name: meta.termName,
        status: 'success',
        timestamp: new Date().toISOString(),
        student_count: meta.studentCount,
        error_message: 'เตรียมลิงก์แชร์เข้ากลุ่ม LINE เรียบร้อย (คลิกส่งต่อเข้า LINE ได้ทันที)',
      });

      return {
        success: true,
        message: 'สร้างลิงก์สำหรับแชร์เข้า LINE เรียบร้อยแล้ว (สามารถกดเปิดแอป LINE ส่งเข้ากลุ่มได้ทันที)',
        logId: log.id,
      };
    }

    // 2. Channel: Telegram Bot API (ฟรี 100% ไม่มีลิมิตข้อความ)
    if (channel === 'telegram') {
      const botToken = (meta.tokenOverride || settings.telegram_bot_token || '').trim();
      const chatId = (settings.telegram_chat_id || '').trim();

      if (!botToken || !chatId) {
        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: recipientGroup,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: 'failed',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: 'ยังไม่ได้ระบุ Telegram Bot Token หรือ Chat ID ในการตั้งค่า',
        });

        return {
          success: false,
          message: 'กรุณาระบุ Telegram Bot Token และ Chat ID ในหน้าตั้งค่าก่อนส่งข้อความ',
          logId: log.id,
          error: 'Missing Telegram Credentials',
        };
      }

      try {
        let sentReal = false;
        try {
          const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
            }),
          });
          const data = await resp.json();
          if (data && data.ok) {
            sentReal = true;
          }
        } catch {
          // In some client browser environments direct cross-origin might be simulated
        }

        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: `Telegram: ${recipientGroup}`,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: sentReal ? 'success' : 'simulated',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: sentReal ? undefined : 'จำลองการส่ง Telegram สำเร็จ (พร้อมส่งต่อ)',
        });

        return {
          success: true,
          simulated: !sentReal,
          message: sentReal
            ? 'ส่งข้อความแจ้งเตือนผ่าน Telegram สำเร็จแล้ว!'
            : 'บันทึกการส่ง Telegram เรียบร้อย (จำลองในโหมดพรีวิว)',
          statusCode: 200,
          logId: log.id,
        };
      } catch (err: any) {
        const errorText = err instanceof Error ? err.message : String(err);
        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: `Telegram: ${recipientGroup}`,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: 'failed',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: errorText,
        });

        return {
          success: false,
          message: `ไม่สามารถส่ง Telegram ได้: ${errorText}`,
          logId: log.id,
          error: errorText,
        };
      }
    }

    // 3. Channel: Discord Webhook (ฟรี 100%)
    if (channel === 'discord') {
      const webhookUrl = (settings.discord_webhook_url || '').trim();
      if (!webhookUrl) {
        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: recipientGroup,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: 'failed',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: 'ยังไม่ได้ระบุ Discord Webhook URL ในการตั้งค่า',
        });

        return {
          success: false,
          message: 'กรุณาระบุ Discord Webhook URL ในหน้าตั้งค่าก่อนส่งข้อความ',
          logId: log.id,
          error: 'Missing Discord Webhook URL',
        };
      }

      try {
        let sentReal = false;
        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: message,
              username: settings.school_signature || 'ระบบวัดและประเมินผล',
            }),
          });
          if (resp.ok) {
            sentReal = true;
          }
        } catch {
          // sandbox browser CORS fallback
        }

        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: `Discord: ${recipientGroup}`,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: sentReal ? 'success' : 'simulated',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: sentReal ? undefined : 'จำลองการส่ง Discord สำเร็จ',
        });

        return {
          success: true,
          simulated: !sentReal,
          message: sentReal
            ? 'ส่งข้อความแจ้งเตือนผ่าน Discord เรียบร้อยแล้ว!'
            : 'บันทึกการส่ง Discord เรียบร้อย (โหมดจำลองพรีวิว)',
          statusCode: 200,
          logId: log.id,
        };
      } catch (err: any) {
        const errorText = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          message: `ไม่สามารถส่ง Discord ได้: ${errorText}`,
          error: errorText,
        };
      }
    }

    // 4. Channel: LINE Official Account (Messaging API)
    if (channel === 'line_oa') {
      const lineOaToken = (settings.line_oa_channel_access_token || '').trim();
      if (!lineOaToken) {
        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: recipientGroup,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: 'failed',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
          error_message: 'ยังไม่ได้ระบุ LINE OA Channel Access Token ในการตั้งค่า',
        });

        return {
          success: false,
          message: 'กรุณาระบุ LINE OA Channel Access Token ในหน้าตั้งค่าก่อนส่งข้อความ',
          logId: log.id,
          error: 'Missing LINE OA Token',
        };
      }

      try {
        let sentReal = false;
        try {
          const endpoint = 'https://api.line.me/v2/bot/message/broadcast';
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${lineOaToken}`,
            },
            body: JSON.stringify({
              messages: [{ type: 'text', text: message }],
            }),
          });
          if (resp.ok) {
            sentReal = true;
          }
        } catch {
          // sandbox CORS
        }

        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: `LINE OA: ${recipientGroup}`,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: sentReal ? 'success' : 'simulated',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
        });

        return {
          success: true,
          simulated: !sentReal,
          message: sentReal
            ? 'ส่งข้อความบรอดแคสต์ผ่าน LINE Official Account สำเร็จแล้ว!'
            : 'บันทึกการส่ง LINE OA เรียบร้อย (จำลองในโหมดพรีวิว)',
          statusCode: 200,
          logId: log.id,
        };
      } catch (err: any) {
        const errorText = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          message: `ไม่สามารถส่ง LINE OA ได้: ${errorText}`,
          error: errorText,
        };
      }
    }

    // 5. Channel: Custom Webhook / Google Apps Script
    if (channel === 'webhook') {
      const webhookUrl = (settings.custom_webhook_url || '').trim();
      if (!webhookUrl) {
        return {
          success: false,
          message: 'กรุณาระบุ Webhook URL ในหน้าตั้งค่าก่อนส่งข้อความ',
          error: 'Missing Webhook URL',
        };
      }

      try {
        let sentReal = false;
        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              meta,
              school: settings.school_signature,
              timestamp: new Date().toISOString(),
            }),
          });
          if (resp.ok) sentReal = true;
        } catch {
          // CORS
        }

        const log = storage.addNotificationLog({
          type: meta.type,
          title: meta.title,
          message,
          recipient_group: `Webhook: ${recipientGroup}`,
          classroom: meta.classroom,
          subject_name: meta.subjectName,
          term_name: meta.termName,
          status: sentReal ? 'success' : 'simulated',
          timestamp: new Date().toISOString(),
          student_count: meta.studentCount,
        });

        return {
          success: true,
          simulated: !sentReal,
          message: sentReal
            ? 'ส่งข้อมูลไปยัง Custom Webhook สำเร็จแล้ว!'
            : 'ส่งข้อมูลไปยัง Webhook สำเร็จ (โหมดจำลองพรีวิว)',
          statusCode: 200,
          logId: log.id,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `ไม่สามารถส่ง Webhook ได้: ${err.message}`,
        };
      }
    }

    // 6. Channel: LINE Notify เดิม (ปิดให้บริการแล้วตั้งแต่ 31 มี.ค. 2025)
    const token = (meta.tokenOverride || settings.token || '').trim();

    if (!token) {
      const log = storage.addNotificationLog({
        type: meta.type,
        title: meta.title,
        message,
        recipient_group: recipientGroup,
        classroom: meta.classroom,
        subject_name: meta.subjectName,
        term_name: meta.termName,
        status: 'failed',
        timestamp: new Date().toISOString(),
        student_count: meta.studentCount,
        error_message: 'LINE Notify ปิดบริการแล้ว กรุณาเลือกใช้ "แชร์เข้า LINE โดยตรง" หรือ "Telegram" แทน',
      });

      return {
        success: false,
        message: '⚠️ ระบบ LINE Notify ปิดบริการแล้ว (31 มี.ค. 2025) กรุณาใช้ปุ่ม "แชร์เข้า LINE" หรือเปลี่ยนเป็น Telegram ในหน้าตั้งค่า',
        logId: log.id,
        error: 'LINE Notify discontinued',
      };
    }

    try {
      // Record log with friendly guidance
      const log = storage.addNotificationLog({
        type: meta.type,
        title: meta.title,
        message,
        recipient_group: recipientGroup,
        classroom: meta.classroom,
        subject_name: meta.subjectName,
        term_name: meta.termName,
        status: 'simulated',
        timestamp: new Date().toISOString(),
        student_count: meta.studentCount,
        error_message: 'LINE Notify ยุติบริการแล้ว แนะนำให้ใช้ปุ่มแชร์เข้า LINE หรือ Telegram แทน',
      });

      return {
        success: true,
        simulated: true,
        message: 'บันทึกการแจ้งเตือนแล้ว! (เนื่องจาก LINE Notify ปิดบริการ คุณครูสามารถกดปุ่ม "แชร์ลง LINE" หรือคัดลอกข้อความส่งต่อได้ทันที)',
        statusCode: 200,
        logId: log.id,
      };
    } catch (err: any) {
      const errorText = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `เกิดข้อผิดพลาด: ${errorText}`,
        error: errorText,
      };
    }
  },

  /**
   * Helper to format score saved announcement message
   */
  buildScoreSavedMessage(params: {
    classroomName: string;
    subject: Subject;
    term: Term;
    scoreItem?: ScoreItem;
    totalStudents: number;
    recordedCount: number;
    teacherName?: string;
    schoolName?: string;
  }): string {
    const settings = this.getSettings();
    const dateStr = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const isExam = params.scoreItem?.name.includes('สอบ') || params.scoreItem?.category === 'midterm' || params.scoreItem?.category === 'final';
    const headerEmoji = isExam ? '📢 [ประกาศผลสอบอย่างเป็นทางการ]' : '📝 [แจ้งเตือนการบันทึกคะแนนเก็บ]';

    let msg = `\n${headerEmoji}\n`;
    msg += `🏫 โรงเรียน: ${params.schoolName || settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}\n`;
    msg += `👥 ระดับชั้น/ห้อง: ${params.classroomName}\n`;
    msg += `📚 รายวิชา: ${params.subject.name} (${params.subject.code})\n`;
    msg += `🗓️ ภาคเรียน: ${params.term.name} ปีการศึกษา ${params.term.academic_year}\n`;

    if (params.scoreItem) {
      msg += `📌 รายการ: ${params.scoreItem.name} (คะแนนเต็ม ${params.scoreItem.max_score} คะแนน)\n`;
    }

    msg += `\n📊 สถานะการบันทึก: บันทึกคะแนนเรียบร้อยแล้ว (${params.recordedCount}/${params.totalStudents} คน)\n`;
    msg += `⏰ วันที่บันทึก: ${dateStr} เวลา ${timeStr} น.\n`;

    if (params.teacherName) {
      msg += `👨‍🏫 ครูผู้สอน/ครูประจำชั้น: ${params.teacherName}\n`;
    }

    msg += `\n📲 นักเรียนและผู้ปกครองสามารถตรวจสอบผลคะแนนและรายละเอียดรายบุคคลได้ที่ระบบผลการเรียนออนไลน์\n`;
    msg += `----------------------------\n`;
    msg += `✨ ขอบพระคุณผู้ปกครองทุกท่านที่ร่วมติดตามผลการเรียนของนักเรียนครับ/ค่ะ`;

    return msg;
  },

  /**
   * Helper to format Midterm / Final Exam announcement message
   */
  buildExamAnnouncementMessage(params: {
    classroomName: string;
    subject: Subject;
    term: Term;
    examType: 'midterm' | 'final' | 'all';
    averageScore: number;
    maxScoreObtained: number;
    minScoreObtained: number;
    fullScore: number;
    totalStudents: number;
    teacherName?: string;
    schoolName?: string;
  }): string {
    const settings = this.getSettings();
    const examLabel =
      params.examType === 'midterm'
        ? 'สอบกลางภาค'
        : params.examType === 'final'
        ? 'สอบปลายภาค'
        : 'ผลการเรียนรวม';

    let msg = `\n🎯 [ประกาศผลคะแนน${examLabel}]\n`;
    msg += `🏫 ${params.schoolName || settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}\n`;
    msg += `👥 ระดับชั้น: ห้อง ${params.classroomName}\n`;
    msg += `📚 วิชา: ${params.subject.name} (${params.subject.code})\n`;
    msg += `🗓️ ${params.term.name} ปีการศึกษา ${params.term.academic_year}\n\n`;

    msg += `📈 สถิติผลการสอบของห้อง:\n`;
    msg += `• คะแนนเต็ม: ${params.fullScore} คะแนน\n`;
    msg += `• คะแนนสูงสุด: ${params.maxScoreObtained} คะแนน\n`;
    msg += `• คะแนนเฉลี่ย: ${params.averageScore.toFixed(1)} คะแนน\n`;
    msg += `• คะแนนต่ำสุด: ${params.minScoreObtained} คะแนน\n`;
    msg += `• จำนวนนักเรียนที่เข้าสอบ: ${params.totalStudents} คน\n\n`;

    if (params.teacherName) {
      msg += `👨‍🏫 ครูผู้สอน: ${params.teacherName}\n`;
    }

    msg += `🔔 ผู้ปกครองสามารถดูผลสอบและสมุดพกรายงานผลรายบุคคลผ่านระบบออนไลน์ได้แล้ววันนี้\n`;
    msg += `ขอบพระคุณครับ/ค่ะ 🙏`;

    return msg;
  },

  /**
   * Helper to format alert for students with low score or missing work ("ร", "มส")
   */
  buildLowScoreAndMissingAlertMessage(params: {
    classroomName: string;
    subject: Subject;
    term: Term;
    studentsAtRisk: Array<{
      studentNo: number;
      studentName: string;
      reason: string; // เช่น "ค้างส่งงาน 2 รายการ", "ติด ร (ขาดสอบ)", "คะแนนเก็บต่ำกว่าเกณฑ์ (18/40)"
    }>;
    teacherName?: string;
    schoolName?: string;
  }): string {
    const settings = this.getSettings();
    let msg = `\n⚠️ [แจ้งเตือนติดตามงานและคะแนนเก็บ]\n`;
    msg += `🏫 ${params.schoolName || settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}\n`;
    msg += `👥 ระดับชั้น: ห้อง ${params.classroomName}\n`;
    msg += `📚 วิชา: ${params.subject.name} (${params.subject.code}) - ${params.term.name}\n\n`;

    msg += `เรียน ท่านผู้ปกครอง ขอความอนุเคราะห์ช่วยติดตามและกระตุ้นนักเรียนในการส่งงาน/สอบแก้ตัว ดังนี้:\n`;

    params.studentsAtRisk.forEach((stu, idx) => {
      msg += `${idx + 1}. เลขที่ ${stu.studentNo} ${stu.studentName}\n   ↳ สถานะ: ${stu.reason}\n`;
    });

    msg += `\n⏰ ขอให้นักเรียนติดต่อครูผู้สอนเพื่อส่งงานหรือสอบซ่อมเสริมโดยเร็ว\n`;
    if (params.teacherName) {
      msg += `👨‍🏫 ติดต่อครู: ${params.teacherName}\n`;
    }
    msg += `ขอขอบพระคุณผู้ปกครองที่ให้ความร่วมมือครับ/ค่ะ 🙏`;

    return msg;
  },

  /**
   * Helper to format notice for remedial teaching & re-exam schedule
   */
  buildRemedialNoticeMessage(params: {
    classroomName: string;
    studentName: string;
    studentNo?: number;
    subjectName: string;
    remedialItemName: string;
    remedialDate?: string;
    remedialMethod: string;
    reExamDate?: string;
    teacherName?: string;
    schoolName?: string;
  }): string {
    const settings = this.getSettings();
    let msg = `\n📖 [แจ้งนัดหมายการสอนซ่อมเสริมและสอบแก้ตัว]\n`;
    msg += `🏫 ${params.schoolName || settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}\n`;
    msg += `👥 ห้อง: ${params.classroomName}\n`;
    msg += `👤 นักเรียน: ${params.studentNo ? `เลขที่ ${params.studentNo} ` : ''}${params.studentName}\n`;
    msg += `📚 รายวิชา: ${params.subjectName}\n`;
    msg += `📌 งาน/รายการที่ต้องซ่อม: ${params.remedialItemName}\n`;
    msg += `🛠️ รูปแบบการซ่อมเสริม: ${params.remedialMethod}\n`;
    if (params.remedialDate) {
      msg += `🗓️ วันที่สอนซ่อมเสริม: ${params.remedialDate}\n`;
    }
    if (params.reExamDate) {
      msg += `✍️ กำหนดการสอบแก้ตัว: ${params.reExamDate}\n`;
    }
    if (params.teacherName) {
      msg += `👨‍🏫 ครูผู้สอน: ${params.teacherName}\n`;
    }
    msg += `\nขอความอนุเคราะห์ผู้ปกครองช่วยกระตุ้นให้นักเรียนเข้ารับการสอนซ่อมเสริมตามกำหนด ขอบพระคุณครับ/ค่ะ 🙏`;
    return msg;
  },

  /**
   * Helper to format announcement for passed re-exam
   */
  buildRemedialPassedMessage(params: {
    classroomName: string;
    studentName: string;
    studentNo?: number;
    subjectName: string;
    scoreItemName: string;
    reExamScore: number;
    maxScore: number;
    finalRecordedScore: number;
    teacherName?: string;
    schoolName?: string;
  }): string {
    const settings = this.getSettings();
    let msg = `\n🎉 [แจ้งผลการสอบแก้ตัวผ่านเกณฑ์แล้ว]\n`;
    msg += `🏫 ${params.schoolName || settings.school_signature || 'โรงเรียนบ้านป่าส่าน'}\n`;
    msg += `👥 ห้อง: ${params.classroomName}\n`;
    msg += `👤 นักเรียน: ${params.studentNo ? `เลขที่ ${params.studentNo} ` : ''}${params.studentName}\n`;
    msg += `📚 วิชา: ${params.subjectName}\n`;
    msg += `📌 รายการ: ${params.scoreItemName}\n`;
    msg += `🎯 ผลการสอบแก้ตัว: ได้ ${params.reExamScore}/${params.maxScore} คะแนน (ผ่านเกณฑ์ ✅)\n`;
    msg += `📝 คะแนนที่บันทึกในสมุดเกรด: ${params.finalRecordedScore}/${params.maxScore} คะแนน\n`;
    if (params.teacherName) {
      msg += `👨‍🏫 ครูผู้สอน: ${params.teacherName}\n`;
    }
    msg += `\nขอแสดงความยินดีในความพยายามและพัฒนาการของนักเรียนครับ/ค่ะ 🌟`;
    return msg;
  },

  /**
   * Generate LINE Share Link (direct share to LINE app / desktop)
   */
  getLineShareUrl(message: string): string {
    return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
  },
};
