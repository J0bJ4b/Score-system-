# 📚 ระบบบันทึกคะแนนและประเมินผลการเรียนนักเรียน (Primary School Grading System)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

เว็บแอปพลิเคชันระบบบริหารจัดการ บันทึกคะแนน และประเมินผลการเรียนสำหรับระดับประถมศึกษา (เน้นระดับชั้น ป.5 - ป.6) ออกแบบมาเพื่ออำนวยความสะดวกให้แก่ครูประจำชั้นและครูผู้สอนในการตัดเกรด บันทึกคะแนนรายตัวชี้วัด คำนวณเกรดและผลการเรียนอัตโนมัติ พร้อมทั้งมีระบบสำหรับนักเรียนและผู้ปกครองในการตรวจสอบผลการเรียนได้อย่างสะดวกรวดเร็วโดยไม่ต้องล็อกอิน

---

## 🌟 จุดเด่นและฟังก์ชันการใช้งาน (Key Features)

### 1. 🔍 ระบบตรวจสอบคะแนนสำหรับนักเรียน (Student Portal)
- **เข้าดูผลการเรียนได้ทันที**: นักเรียนหรือผู้ปกครองสามารถกรอกเพียง **เลขประจำตัวนักเรียน (Student ID)** เพื่อดูผลการเรียนและคะแนนสะสมได้ทันทีจากหน้าแรก ไม่ต้องล็อกอินหรือสมัครสมาชิก
- **ความเป็นส่วนตัว**: แสดงข้อมูลเฉพาะของนักเรียนตามรหัสที่ระบุ พร้อมแสดงเกรดเฉลี่ย (GPA), คะแนนรวม, และผลการประเมินแยกตามรายวิชา
- **สรุปรายงานสวยงาม**: แสดงกราฟและตารางคะแนนที่เข้าใจง่าย เหมาะสำหรับการเปิดดูบนสมาร์ตโฟนและแท็บเล็ต

### 2. 🔐 ระบบยืนยันตัวตนและการเข้าสู่ระบบ (Authentication & Security)
- **Google / Gmail Authentication จริง**: รองรับการลงชื่อเข้าใช้ด้วยบัญชี Google ผ่าน Firebase Authentication (Popup)
- **Demo Mode**: มีปุ่มทดสอบเข้าสู่ระบบจำลองสำหรับครูประจำชั้น (ป.5/1, ป.5/2, ป.6/1) เพื่อความสะดวกในการสาธิตและทดสอบระบบ
- **ความปลอดภัยระดับสูง**: ควบคุมสิทธิ์การเข้าถึงข้อมูลผ่าน Firebase Security Rules (`firestore.rules`)

### 3. 📝 ระบบบันทึกคะแนนและคำนวณเกรดอัตโนมัติ (Score Entry & Grade Calculation)
- **รองรับ 2 ภาคเรียน**: บันทึกคะแนนภาคเรียนที่ 1 (50 คะแนน) และภาคเรียนที่ 2 (50 คะแนน) รวมเป็นคะแนนเต็ม 100 คะแนน
- **สัดส่วนคะแนนยืดหยุ่น**: แยกคะแนนเก็บระหว่างภาค, คะแนนสอบกลางภาค, และคะแนนสอบปลายภาค
- **เกณฑ์การตัดเกรดมาตรฐานประถมศึกษา**:
  - `80 - 100` : **เกรด 4.0** (ดีเยี่ยม)
  - `75 - 79`  : **เกรด 3.5** (ดีมาก)
  - `70 - 74`  : **เกรด 3.0** (ดี)
  - `65 - 69`  : **เกรด 2.5** (ค่อนข้างดี)
  - `60 - 64`  : **เกรด 2.0** (ปานกลาง)
  - `55 - 59`  : **เกรด 1.5** (พอใช้)
  - `50 - 54`  : **เกรด 1.0** (ผ่านเกณฑ์ขั้นต่ำ)
  - `0 - 49`   : **เกรด 0** (ต่ำกว่าเกณฑ์)
- **ระบบตรวจสอบความถูกต้อง (Validation)**: แจ้งเตือนทันทีเมื่อกรอกคะแนนเกินเกณฑ์ที่กำหนดหรือใส่ข้อมูลผิดรูปแบบ

### 4. 🏫 ระบบจัดการห้องเรียนและข้อมูลนักเรียน (Classroom & Student Management)
- **สลับห้องเรียนได้สะดวก**: รองรับหลายห้องเรียน (เช่น ป.5/1, ป.5/2, ป.6/1)
- **จัดการรายชื่อนักเรียน**: เพิ่ม ลบ แก้ไข ข้อมูลนักเรียน (เลขที่, รหัสประจำตัว, ชื่อ-นามสกุล, เพศ, สถานะ)
- **นำเข้าและส่งออก**: รองรับการส่งออกข้อมูลนักเรียนเพื่อนำไปใช้งานต่อ

### 5. 📖 ระบบจัดการรายวิชา (Subject Management)
- เพิ่ม/แก้ไขรายวิชาพื้นฐานและรายวิชาเพิ่มเติม (เช่น ภาษาไทย, คณิตศาสตร์, วิทยาศาสตร์และเทคโนโลยี, สังคมศึกษาฯ, ภาษาอังกฤษ ฯลฯ)
- กำหนดรหัสวิชา หน่วยกิต และกลุ่มสาระการเรียนรู้

### 6. 📊 รายงานผลและใบ ปพ.6 รายบุคคล (Reports & Printouts)
- **รายงานสรุปรายวิชา (Subject Summary)**: ดูสถิติคลิกเดียว ทั้งคะแนนเฉลี่ย, ค่าสูงสุด-ต่ำสุด, อัตราการผ่านเกณฑ์ และการกระจายตัวของเกรด
- **ใบบันทึกผลการเรียนรายบุคคล (Individual Summary Report)**: ออกแบบตามมาตรฐาน ปพ.6 สั่งพิมพ์ (Print / Save as PDF) ได้ทันทีในรูปแบบกระดาษ A4 สวยงาม พร้อมลายมือชื่อครูประจำชั้น

### 7. 🔄 การเชื่อมต่อ Google Sheets & สำรองข้อมูล (Sync & Backup)
- **Google Sheets Sync**: เชื่อมต่อและซิงค์ข้อมูลคะแนนไปยัง Google Sheets เพื่อจัดเก็บและแชร์ข้อมูลกับฝ่ายวิชาการ
- **Data Backup & Restore**: ส่งออกข้อมูลทั้งหมดเป็นไฟล์ JSON และนำเข้ากู้คืนข้อมูลได้ง่าย

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | รายละเอียดเทคโนโลยี |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 8](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite` |
| **Icons & Animation** | [Lucide React](https://lucide.dev/) + [Motion](https://motion.dev/) |
| **Database & Auth** | [Firebase v12](https://firebase.google.com/) (Authentication & Cloud Firestore) |
| **Typography** | Google Fonts ([Prompt](https://fonts.google.com/specimen/Prompt) & [Sarabun](https://fonts.google.com/specimen/Sarabun)) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── src/
│   ├── components/             # คอมโพเนนต์ส่วนกลาง (Navbar, Sidebar, Modals)
│   │   ├── ClassroomManagerModal.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── pages/                  # หน้าการทำงานหลักของระบบ
│   │   ├── LoginPage.tsx              # หน้าล็อกอิน (Google Auth + รหัสนักเรียน)
│   │   ├── StudentPortalPage.tsx      # หน้าพอร์ทัลตรวจผลคะแนนของนักเรียน
│   │   ├── DashboardPage.tsx          # แดชบอร์ดภาพรวมผลการเรียน
│   │   ├── ScoreEntryPage.tsx         # บันทึกคะแนนและคำนวณเกรด
│   │   ├── StudentManagementPage.tsx  # จัดการรายชื่อนักเรียน
│   │   ├── SubjectManagementPage.tsx  # จัดการรายวิชา
│   │   ├── SubjectSummaryPage.tsx     # สรุปคะแนนตามรายวิชา
│   │   ├── IndividualSummaryPage.tsx  # รายงานผลรายบุคคล (ปพ.6)
│   │   ├── GoogleSheetsSyncPage.tsx   # เชื่อมต่อ Google Sheets
│   │   └── BackupPage.tsx             # สำรองและกู้คืนข้อมูล
│   ├── services/               # บริการเชื่อมต่อฐานข้อมูลและหน่วยความจำ
│   │   ├── firebase.ts                # การตั้งค่า Firebase Auth & Firestore
│   │   └── storage.ts                 # การจัดเก็บข้อมูลและ Local Storage Fallback
│   ├── types/                  # Type Definitions (TypeScript)
│   │   └── index.ts
│   ├── utils/                  # ฟังก์ชันคำนวณเกรดและแปลงรูปแบบข้อมูล
│   ├── App.tsx                 # รูทคอมโพเนนต์หลักและการจัดการ State
│   ├── main.tsx                # จุดเริ่มต้นแอปพลิเคชัน
│   └── index.css               # สไตล์ส่วนกลางและฟอนต์ภาษาไทย
├── firestore.rules             # กฎความปลอดภัยของ Firebase Cloud Firestore
├── firebase-blueprint.json     # สคีมาและการออกแบบฐานข้อมูล Firebase
├── metadata.json               # ข้อมูลระบุรายละเอียดของแอปพลิเคชัน
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

หากต้องการเชื่อมต่อกับ Firebase ของท่านเอง สามารถระบุค่าการเชื่อมต่อใน `firebase-applet-config.json` หรือผ่าน Environment Variables:
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

- `npm run dev` : เริ่มต้นเซิร์ฟเวอร์สำหรับพัฒนาบนพอร์ต 3000 (`vite --port=3000 --host=0.0.0.0`)
- `npm run build` : บิลด์โปรเจกต์สำหรับ Production ลงในโฟลเดอร์ `dist/`
- `npm run preview` : ทดสอบพรีวิวผลลัพธ์ของไฟล์ที่ผ่านการบิลด์แล้ว
- `npm run lint` : ตรวจสอบความถูกต้องของไวยากรณ์ TypeScript (`tsc --noEmit`)
- `npm run clean` : ลบไฟล์ที่สร้างจากการบิลด์

---

## 🔒 กฎความปลอดภัย Firestore (Security Rules)

ระบบมีไฟล์ `firestore.rules` กำหนดสิทธิ์อย่างรัดกุม:
- ผู้ใช้ที่ผ่านการยืนยันตัวตนด้วย Google หรือครูผู้สอนเท่านั้นที่สามารถบันทึกและแก้ไขคะแนนได้
- กำหนดการตรวจสอบความถูกต้องของข้อมูล (Schema Validation) ก่อนบันทึกลงฐานข้อมูล
- บล็อกการเข้าถึงจากผู้ใช้ที่ไม่ได้รับอนุญาตโดยค่าเริ่มต้น (Default Deny)

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต **Apache-2.0 License** ดูรายละเอียดเพิ่มเติมได้ที่ไฟล์ [LICENSE](LICENSE)
