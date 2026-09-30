# 📚 ระบบบันทึกคะแนนและประเมินผลการเรียนนักเรียน (Primary School Grading System)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

เว็บแอปพลิเคชันระบบบริหารจัดการ บันทึกคะแนน และประเมินผลการเรียนสำหรับระดับประถมศึกษา (ป.1 - ป.6) และมัธยมศึกษาตอนต้น ออกแบบมาเพื่ออำนวยความสะดวกให้แก่ครูประจำชั้นและครูผู้สอนในการตัดเกรด บันทึกคะแนนรายตัวชี้วัด คำนวณเกรดเฉลี่ยอัตโนมัติ ออกเอกสารทางการศึกษา (ปพ.5, ปพ.6, เกียรติบัตร, บัตรนักเรียนพร้อม QR Code) พร้อมระบบแยกข้อมูลอิสระขาดจากกัน 100% ต่อบัญชี และระบบถอดรหัสไฟล์ DMC สพฐ. ป้องกันปัญหาภาษาต่างดาว 100%

---

## 🌟 จุดเด่นและฟังก์ชันการใช้งานหลัก (Key Features)

### 1. 🛡️ การแยกข้อมูลอิสระขาดจากกันตามแต่ละบัญชี 100% (Account-Level Data Isolation)
- **แยกขาดจากกันสมบูรณ์แบบ**: แต่ละบัญชีครู (ทั้งการเข้าสู่ระบบด้วย Google Account หรือ Demo Teacher) จะมีห้องเรียน นักเรียน รายวิชา ภาคเรียน คะแนน เกียรติบัตร และการตั้งค่าโรงเรียนเป็นของตนเองโดยเฉพาะ
- **ความเป็นส่วนตัวขั้นสูงสุด**: บัญชีอื่นหรือโรงเรียนอื่นจะไม่เห็นและไม่สามารถเข้าถึงหรือแก้ไขข้อมูลของเราได้
- **ความปลอดภัยระดับ Firebase Rules**: คลาวด์ไฟร์สโตร์ตรวจสอบ `request.auth.uid == resource.data.ownerId` อย่างรัดกุม ป้องกันการดึงหรือบันทึกข้อมูลข้ามบัญชี
- **การซิงค์ข้อมูลเรียลไทม์ (Real-time Cloud Sync)**: ข้อมูลอัปเดตแบบอัตโนมัติระหว่างอุปกรณ์ พร้อมรองรับโหมดออฟไลน์ด้วย Local Storage Scoped Partitioning

---

### 2. 📥 ระบบนำเข้าข้อมูลนักเรียนจากระบบ DMC สพฐ. อัจฉริยะ (DMC Smart Import & Thai Decoder)
- **รองรับไฟล์ส่งออกจากระบบ DMC โดยตรง**: สามารถนำไฟล์ที่ดาวน์โหลดจาก `portal.bopp-obec.info/dmc` มาอัปโหลดเข้าสู่ระบบได้ทันที
- **แก้ปัญหาภาษาต่างดาว / ภาษามั่ว 100% (Mojibake Auto-Fix)**:
  - มีตัวตรวจจับรหัสภาษาไทย **Windows-874 / TIS-620 (ANSI Thai)** อัตโนมัติ พร้อม **Pure JavaScript Decoder Fallback** แปลงไบต์ภาษาไทย `0xA1 - 0xFB` ตรงเข้าสู่ Unicode ไทยอย่างแม่นยำบนทุกอุปกรณ์
  - รองรับทั้งไฟล์ `.csv`, `.xlsx`, `.xls`, `.txt`, `.tsv`
  - มีปุ่ม **"✨ กู้คืนภาษาไทย (แก้ภาษามั่ว)"** สำหรับกู้คืนข้อความที่คัดลอกมาแล้วตัวอักษรเพี้ยน
- **สกัดเฉพาะข้อมูลที่จำเป็นอัตโนมัติ**:
  - ดึงข้อมูล: **เลขที่, เลขประจำตัวประชาชน 13 หลัก, คำนำหน้า, ชื่อ-สกุล, เพศ, ชั้นเรียน**
  - ตัดคอลัมน์ส่วนเกินออกอัตโนมัติ: วันเกิด, ที่อยู่, เบอร์โทร, ชื่อผู้ปกครอง, สัญชาติ, ศาสนา ฯลฯ
  - มีระบบตรวจสอบความถูกต้องของเลขประจำตัวประชาชน 13 หลัก (Thai National ID Checksum)

---

### 3. 🔍 พอร์ทัลตรวจสอบผลการเรียนสำหรับนักเรียนและผู้ปกครอง (Student Portal)
- **เข้าดูผลการเรียนได้ทันที**: นักเรียนหรือผู้ปกครองกรอกเพียง **เลขประจำตัวประชาชน 13 หลัก** หรือ **เลขประจำตัวนักเรียน** เพื่อดูผลการเรียนและคะแนนสะสมได้ทันทีจากหน้าแรก โดยไม่ต้องลงทะเบียนหรือจำรหัสผ่าน
- **สแกน QR Code ตรวจผลสอบ**: สแกนจากบัตรประจำตัวนักเรียนเพื่อเข้าสู่หน้ารายงานผลการเรียนของตนเองได้ทันที
- **รายงานผลแบบ Interactive**: แสดงเกรดเฉลี่ยสะสม (GPA), คะแนนรวม, กราฟเปรียบเทียบผลสัมฤทธิ์ และข้อเสนอแนะในการพัฒนา

---

### 4. 📝 ระบบบันทึกคะแนนและตัดเกรดอัตโนมัติ (Score Entry & Grade Calculator)
- **รองรับ 2 ภาคเรียน**: บันทึกคะแนนภาคเรียนที่ 1 (50 คะแนน) และภาคเรียนที่ 2 (50 คะแนน) รวม 100 คะแนนเต็ม
- **สัดส่วนคะแนนยืดหยุ่น**: แยกคะแนนเก็บระหว่างภาค, คะแนนสอบกลางภาค, และคะแนนสอบปลายภาค
- **เกณฑ์การตัดเกรดมาตรฐานกระทรวงศึกษาธิการ**:
  - `80 - 100` : **เกรด 4.0** (ดีเยี่ยม)
  - `75 - 79`  : **เกรด 3.5** (ดีมาก)
  - `70 - 74`  : **เกรด 3.0** (ดี)
  - `65 - 69`  : **เกรด 2.5** (ค่อนข้างดี)
  - `60 - 64`  : **เกรด 2.0** (ปานกลาง)
  - `55 - 59`  : **เกรด 1.5** (พอใช้)
  - `50 - 54`  : **เกรด 1.0** (ผ่านเกณฑ์ขั้นต่ำ)
  - `0 - 49`   : **เกรด 0** (ต่ำกว่าเกณฑ์)
- **ระบบ Validation ป้องกันข้อผิดพลาด**: ตรวจจับการกรอกคะแนนเกินเกณฑ์ หรือข้อมูลซ้ำซ้อนแบบเรียลไทม์

---

### 5. 🖨️ ระบบเอกสารวิชาการทางการศึกษา (Educational Reports & Printouts)
- **แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)**: สร้างสมุด ปพ.5 ครบถ้วนตามระเบียบกระทรวงศึกษาธิการ รองรับการพิมพ์และส่งออกเป็น PDF
- **ระเบียนแสดงผลการเรียนรายบุคคล (ปพ.6)**: พิมพ์รายงานผลการเรียนรายบุคคลขนาด A4 สวยงาม พร้อมตราสัญลักษณ์โรงเรียน ลายมือชื่อครูประจำชั้น และนายทะเบียน
- **สรุปรายงานผลสัมฤทธิ์รายวิชา (Subject Summary)**: วิเคราะห์ค่าสถิติ Mean, Median, Min, Max, ส่วนเบี่ยงเบนมาตรฐาน (SD) และกราฟการกระจายตัวของเกรด

---

### 6. 🪪 ระบบพิมพ์บัตรประจำตัวนักเรียน (Student ID Card & QR Generator)
- ออกแบบและจัดพิมพ์บัตรประจำตัวนักเรียนขนาดมาตรฐาน
- มี QR Code บนบัตรสำหรับสแกนเข้าตรวจดูผลการเรียนบนมือถือของผู้ปกครองได้ทันที
- รองรับการพิมพ์ทีละคนหรือพิมพ์ยกห้องพร้อมกันในกระดาษ A4

---

### 7. 🏆 ระบบออกเกียรติบัตรและประกาศนียบัตร (Certificate Generator)
- ออกเกียรติบัตรสำหรับนักเรียนที่มีผลการเรียนดีเด่น (เกรดเฉลี่ย 3.50 ขึ้นไป หรือคะแนนสูงสุดในแต่ละวิชา)
- ออกเกียรติบัตรสำหรับกิจกรรมพัฒนาผู้เรียนและคุณลักษณะอันพึงประสงค์
- ปรับแต่งข้อความ ลายเซ็นผู้อำนวยการ และตราโรงเรียนได้ตามต้องการ

---

### 8. 🩺 ระบบติดตามการสอนซ่อมเสริม (Remedial Tracking)
- ติดตามนักเรียนที่ได้คะแนนต่ำกว่าเกณฑ์ หรือติดเกรด 0
- บันทึกประวัติการมอบหมายงานซ่อมเสริม ผลการสอบแก้ตัว และการปรับเกรดเป็นผ่าน (เกรด 1.0) ตามระเบียบการวัดผล

---

### 9. 🏫 การตั้งค่าข้อมูลสถานศึกษา (School Profile & Settings)
- กำหนดชื่อโรงเรียน (ภาษาไทย / อังกฤษ), สังกัด (สพป./สพม./อปท./สช.)
- ที่อยู่, เบอร์โทรศัพท์, รหัสสถานศึกษา 10 หลัก
- อัปโหลดตราสัญลักษณ์โรงเรียน (School Logo) เพื่อใช้บนหัวกระดาษเอกสารทางการทั้งหมด

---

### 10. 🔄 การเชื่อมต่อ Google Sheets & การสำรองข้อมูล (Data Sync & Backup)
- **Google Sheets Sync**: ซิงค์ข้อมูลคะแนนและรายชื่อนักเรียนไปยัง Google Sheets แบบ 2 ทิศทาง
- **JSON Backup & Restore**: ส่งออกข้อมูลทั้งหมดของบัญชีเป็นไฟล์ JSON และนำเข้ากู้คืนได้ทุกเวลา

---

### 11. 🌙 ระบบโหมดกลางคืนและโหมดสว่าง (Night / Dark Mode Toggle)
- **สลับธีมได้ทันทีในคลิกเดียว**: สลับระหว่างโหมดสว่าง (Light Mode) และโหมดมืด (Dark Mode) ถนอมสายตาสำหรับการทำงานในเวลากลางคืน
- **รองรับทุกหน้าจอ**: ปุ่มเปิด-ปิดโหมดกลางคืนเข้าถึงได้จากทุกที่ ทั้งแถบ Navbar ด้านบน, แถบเมนูด้านข้าง Sidebar, หน้าเข้าสู่ระบบ และพอร์ทัลตรวจผลการเรียนของนักเรียน
- **บันทึกการตั้งค่าอัตโนมัติ**: จดจำค่าที่เลือกไว้ในอุปกรณ์ของผู้ใช้ (LocalStorage Persistence) และตรวจจับการตั้งค่าของระบบ (System Theme Preference)
- **ปลอดภัยต่อการพิมพ์ (Print-Safe)**: เมื่อสั่งพิมพ์เอกสารทางการ (ปพ.5, ปพ.6, เกียรติบัตร, บัตรนักเรียน) ระบบจะคงพื้นหลังสีขาวสะอาดตา 100% เสมอ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | รายละเอียดเทคโนโลยี |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 8](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite` |
| **Icons & Visuals** | [Lucide React](https://lucide.dev/) + [Motion](https://motion.dev/) |
| **Database & Auth** | [Firebase v12](https://firebase.google.com/) (Google Authentication & Cloud Firestore) |
| **Data Parsing & Spreadsheets** | [XLSX (SheetJS)](https://sheetjs.com/) + Custom Thai Windows-874 / TIS-620 Pure JS Decoder |
| **QR Code Generation** | `qrcode.react` |
| **Typography** | Google Fonts ([Prompt](https://fonts.google.com/specimen/Prompt) & [Sarabun](https://fonts.google.com/specimen/Sarabun)) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── src/
│   ├── components/                 # คอมโพเนนต์และโมดัลส่วนกลาง
│   │   ├── ClassroomManagerModal.tsx      # จัดการเพิ่ม/แก้ไขห้องเรียน
│   │   ├── DmcImportModal.tsx             # โมดัลนำเข้าข้อมูล DMC พร้อมระบบถอดรหัสภาษาไทย
│   │   ├── Navbar.tsx                     # แถบเมนูด้านบน พร้อมสถานะความปลอดภัยแยกบัญชี 100%
│   │   ├── ScoreCsvImportExportModal.tsx  # นำเข้า/ส่งออกคะแนนเป็น CSV/Excel
│   │   ├── Sidebar.tsx                    # เมนูการนำทางหลักของระบบ
│   │   ├── SmartStudentPasteModal.tsx     # วางรายชื่อนักเรียนแบบตรวจจับอัตโนมัติ
│   │   └── ThemeToggle.tsx                # ปุ่มสลับโหมดกลางคืน/โหมดสว่าง
│   ├── context/                    # React Contexts
│   │   └── ThemeContext.tsx               # ตัวจัดการธีมและ Dark Mode State กลาง
│   ├── pages/                      # หน้าการทำงานทั้งหมดของระบบ
│   │   ├── LoginPage.tsx                  # หน้าเข้าสู่ระบบ (Google Auth + รหัสนักเรียน)
│   │   ├── StudentPortalPage.tsx          # พอร์ทัลตรวจผลคะแนนของนักเรียน/ผู้ปกครอง
│   │   ├── DashboardPage.tsx              # แดชบอร์ดภาพรวมสถิติและผลการเรียน
│   │   ├── ScoreEntryPage.tsx             # หน้าบันทึกคะแนนและคำนวณเกรด
│   │   ├── StudentManagementPage.tsx      # จัดการรายชื่อนักเรียน นำเข้า/ส่งออก
│   │   ├── SubjectManagementPage.tsx      # จัดการรายวิชาและกลุ่มสาระการเรียนรู้
│   │   ├── SubjectSummaryPage.tsx         # สรุปคะแนน สถิติ Mean/SD และการกระจายเกรด
│   │   ├── IndividualSummaryPage.tsx      # ใบบันทึกผลการเรียนรายบุคคล (ปพ.6)
│   │   ├── Pp5BookPage.tsx                # สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
│   │   ├── StudentIDCardPage.tsx          # พิมพ์บัตรประจำตัวนักเรียนและ QR Code
│   │   ├── CertificatePage.tsx            # ออกเกียรติบัตรผลการเรียนดีเด่น
│   │   ├── RemedialTrackingPage.tsx       # ติดตามและบันทึกผลการสอนซ่อมเสริม
│   │   ├── SchoolSettingsPage.tsx         # ตั้งค่าข้อมูลโรงเรียน ตราสัญลักษณ์ และผู้บริหาร
│   │   ├── NotificationSettingsPage.tsx   # ระบบแจ้งเตือนผลการเรียนทาง Line/SMS
│   │   ├── GoogleSheetsSyncPage.tsx       # เชื่อมต่อและซิงค์ข้อมูล Google Sheets
│   │   └── BackupPage.tsx                 # สำรองและกู้คืนฐานข้อมูล JSON
│   ├── services/                   # เลเยอร์จัดการข้อมูลและการเชื่อมต่อ
│   │   ├── firebase.ts                    # การตั้งค่า Firebase Auth & Firestore Client
│   │   ├── realtimeSync.ts                # บริการซิงค์ข้อมูลเรียลไทม์แยกตามบัญชีผู้ใช้
│   │   └── storage.ts                     # หน่วยจัดเก็บข้อมูล Scoped per Account & Local Fallback
│   ├── utils/                      # ฟังก์ชันคำนวณและประมวลผลไฟล์
│   │   ├── csvScoreHandler.ts             # จัดการไฟล์คะแนน CSV/Excel
│   │   ├── dmcParser.ts                   # สกัดและคัดกรองข้อมูลจากตาราง DMC สพฐ.
│   │   ├── fileEncoding.ts                # ถอดรหัส Windows-874 / TIS-620 / Mojibake Auto-Fixer
│   │   └── gradeCalculator.ts             # คำนวณเกรด สถิติ และการส่งออกเอกสาร
│   ├── types/                      # Type Definitions (TypeScript)
│   │   └── index.ts
│   ├── App.tsx                     # คอมโพเนนต์หลักและการจัดการ State กลาง
│   ├── main.tsx                    # จุดเริ่มต้นแอปพลิเคชัน
│   └── index.css                   # Global Styles & Typography
├── firestore.rules                 # กฎความปลอดภัย Firestore (100% Account Isolation)
├── firebase-blueprint.json         # สคีมาและการออกแบบฐานข้อมูล Firebase
├── metadata.json                   # รายละเอียดแอปพลิเคชัน
├── package.json
└── vite.config.ts
```

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### ข้อกำหนดเบื้องต้น (Prerequisites)
- [Node.js](https://nodejs.org/) เวอร์ชัน 18.0 ขึ้นไป
- [npm](https://www.npmjs.com/) หรือ [bun](https://bun.sh/)

### 1. โคลนคลังโค้ด (Clone Repository)
```bash
git clone https://github.com/your-username/primary-school-grading-system.git
cd primary-school-grading-system
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่าสภาพแวดล้อม (Environment Setup)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```

หากต้องการเชื่อมต่อกับ Firebase ของท่านเอง สามารถระบุการตั้งค่าใน `firebase-applet-config.json` หรือผ่าน Environment Variables:
```json
{
  "apiKey": "YOUR_FIREBASE_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### 4. รันโปรเจกต์ในโหมดพัฒนา (Start Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 📜 สคริปต์ที่พร้อมใช้งาน (Available Scripts)

- `npm run dev` : เริ่มต้นเซิร์ฟเวอร์สำหรับการพัฒนาบนพอร์ต 3000 (`vite --port=3000 --host=0.0.0.0`)
- `npm run build` : ตรวจสอบความถูกต้องและสร้าง Production Build ในโฟลเดอร์ `dist/`
- `npm run preview` : พรีวิวผลลัพธ์ของไฟล์ที่บิลด์แล้วบน Local Server
- `npm run lint` : ตรวจสอบความถูกต้องของประเภทข้อมูลและไวยากรณ์ TypeScript (`tsc --noEmit`)
- `npm run clean` : ลบโฟลเดอร์ผลลัพธ์การบิลด์ (`dist/`)

---

## 🔒 สถาปัตยกรรมความปลอดภัย (Security & Privacy Architecture)

1. **การยืนยันตัวตน (Authentication)**:
   - บัญชีครูยืนยันตัวตนผ่าน Google OAuth ใน Firebase Auth
   - นักเรียนและผู้ปกครองตรวจสอบคะแนนผ่านรหัสประจำตัวโดยไม่มีสิทธิ์เข้าถึงส่วนแก้ไขข้อมูล
2. **การแยกข้อมูลขาดจากกัน 100% (Strict Account Isolation)**:
   - เอกสารทุกชุดในคอลเลกชัน (`classrooms`, `students`, `subjects`, `terms`, `score_items`, `scores`, `certificates`, `remedial_records`, `school_settings`) มีฟิลด์ `ownerId` ระบุเจ้าของบัญชี
   - Firestore Security Rules กำหนดให้:
     - `read`: เฉพาะเจ้าของบัญชี หรือการค้นหาคะแนนของนักเรียนผ่าน Student Code
     - `create`, `update`, `delete`: บังคับตรวจสอบ `request.auth.uid == request.resource.data.ownerId` และไม่อนุญาตให้แก้ไขข้อมูลของผู้อื่นโดยเด็ดขาด

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต **Apache-2.0 License** ดูรายละเอียดเพิ่มเติมได้ที่ไฟล์ [LICENSE](LICENSE)
