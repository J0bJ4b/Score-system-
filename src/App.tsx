/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, Student, Subject, Term, ScoreItem, Score, Classroom } from './types';
import { storage } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { ClassroomManagerModal } from './components/ClassroomManagerModal';
import { LoginPage } from './pages/LoginPage';
import { signOutFromFirebase } from './services/firebase';
import { ScoreEntryPage } from './pages/ScoreEntryPage';
import { StudentManagementPage } from './pages/StudentManagementPage';
import { SubjectManagementPage } from './pages/SubjectManagementPage';
import { SubjectSummaryPage } from './pages/SubjectSummaryPage';
import { IndividualSummaryPage } from './pages/IndividualSummaryPage';
import { Pp5BookPage } from './pages/Pp5BookPage';
import { StudentIDCardPage } from './pages/StudentIDCardPage';
import { CertificatePage } from './pages/CertificatePage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { BackupPage } from './pages/BackupPage';
import { GoogleSheetsSyncPage } from './pages/GoogleSheetsSyncPage';
import { StudentPortalPage } from './pages/StudentPortalPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('score-entry');
  const [portalStudent, setPortalStudent] = useState<Student | null>(null);

  // Classroom state
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => storage.getClassrooms());
  const [activeClassroomId, setActiveClassroomId] = useState<string>(() => storage.getCurrentClassroomId());
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);

  const activeClassroom =
    classrooms.find((c) => c.id === activeClassroomId) || classrooms[0] || {
      id: 'room-p5-1',
      name: 'ป.5/1',
      level: 'ประถมศึกษาปีที่ 5',
      academic_year: '2569',
      homeroom_teacher: 'ครูสมศรี จิตเมตตา',
    };

  // Core database state
  const [terms, setTerms] = useState<Term[]>(() => storage.getTerms());
  const [currentTerm, setCurrentTerm] = useState<Term>(() => terms[0] || { id: 'term-1', name: 'ภาคเรียนที่ 1', academic_year: '2569', max_score: 50 });
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents(activeClassroomId));
  const [subjects, setSubjects] = useState<Subject[]>(() => storage.getSubjects());
  const [allScoreItems, setAllScoreItems] = useState<ScoreItem[]>(() => storage.getScoreItems());
  const [allScores, setAllScores] = useState<Score[]>(() => storage.getScores());

  // Function to reload all data from storage
  const reloadData = useCallback(() => {
    const loadedClassrooms = storage.getClassrooms();
    setClassrooms(loadedClassrooms);
    const currId = storage.getCurrentClassroomId();
    setActiveClassroomId(currId);
    setStudents(storage.getStudents(currId));

    const loadedTerms = storage.getTerms();
    setTerms(loadedTerms);
    setSubjects(storage.getSubjects());
    setAllScoreItems(storage.getScoreItems());
    setAllScores(storage.getScores());
    setCurrentUser(storage.getCurrentUser());
  }, []);

  useEffect(() => {
    reloadData();

    // Check if user arrived via Student ID Card QR Code scan (?student_code=XXXXX)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('student_code') || urlParams.get('code');
      if (codeFromUrl) {
        const allStudents = storage.getAllStudents();
        const matchedStudent = allStudents.find(
          (s) => s.student_code === codeFromUrl || s.student_code.toLowerCase() === codeFromUrl.toLowerCase()
        );
        if (matchedStudent) {
          setPortalStudent(matchedStudent);
        }
      }
    } catch (e) {
      console.warn('URL params parse error:', e);
    }
  }, [reloadData]);

  // Sync students whenever active classroom changes
  const handleSelectClassroom = (c: Classroom) => {
    setActiveClassroomId(c.id);
    storage.setCurrentClassroomId(c.id);
    setStudents(storage.getStudents(c.id));
  };

  // Auth handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    reloadData();
  };

  const handleLogout = async () => {
    if (currentUser?.provider === 'google') {
      try {
        await signOutFromFirebase();
      } catch (err) {
        console.warn('Firebase signout:', err);
      }
    }
    storage.logout();
    setCurrentUser(null);
  };

  const handleResetData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลเป็นตัวอย่างเริ่มต้น (นักเรียน ป.5/1 และ ป.6/1) หรือไม่?')) {
      storage.resetToDefault();
      reloadData();
    }
  };

  // If in student portal mode directly
  if (portalStudent) {
    return (
      <StudentPortalPage
        initialStudent={portalStudent}
        allStudents={storage.getAllStudents()}
        subjects={subjects}
        allScoreItems={allScoreItems}
        allScores={allScores}
        terms={terms}
        classrooms={classrooms}
        user={currentUser}
        onBackToTeacherApp={() => {
          setPortalStudent(null);
        }}
      />
    );
  }

  // If not logged in, render LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onStudentLogin={(student) => {
          setPortalStudent(student);
        }}
      />
    );
  }

  const classroomName = activeClassroom.name;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Sarabun',sans-serif]">
      {/* Top Navbar with Multi-Classroom Dropdown */}
      <Navbar
        user={currentUser}
        currentTerm={currentTerm}
        terms={terms}
        onSelectTerm={setCurrentTerm}
        classrooms={classrooms}
        activeClassroom={activeClassroom}
        onSelectClassroom={handleSelectClassroom}
        onOpenClassroomManager={() => setIsClassroomModalOpen(true)}
        onOpenStudentPortal={() => setActiveTab('student-portal')}
        onLogout={handleLogout}
        onResetData={handleResetData}
      />

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          studentCount={students.length}
          subjectCount={subjects.length}
          classroomName={classroomName}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0 overflow-y-auto">
          {activeTab === 'score-entry' && (
            <ScoreEntryPage
              currentTerm={currentTerm}
              terms={terms}
              subjects={subjects}
              students={students}
              allScoreItems={allScoreItems}
              allScores={allScores}
              onScoresUpdated={reloadData}
              onSelectTerm={setCurrentTerm}
              onNavigateToSheets={() => setActiveTab('google-sheets')}
              onNavigateToNotifications={() => setActiveTab('notifications')}
              classroomName={classroomName}
              user={currentUser || undefined}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              students={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              classrooms={classrooms}
              onSelectClassroom={handleSelectClassroom}
              onNavigateToGrading={() => setActiveTab('score-entry')}
              onNavigateToSubjectSummary={() => setActiveTab('subject-summary')}
            />
          )}

          {activeTab === 'subject-summary' && (
            <SubjectSummaryPage
              subjects={subjects}
              students={students}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              onNavigateToSheets={() => setActiveTab('google-sheets')}
            />
          )}

          {activeTab === 'pp5-book' && (
            <Pp5BookPage
              students={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              user={currentUser}
            />
          )}

          {activeTab === 'individual-report' && (
            <IndividualSummaryPage
              students={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              user={currentUser}
              classroom={classroomName}
              activeClassroom={activeClassroom}
            />
          )}

          {activeTab === 'id-cards' && (
            <StudentIDCardPage
              students={students}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              user={currentUser}
              onViewStudentPortal={(stu) => setPortalStudent(stu)}
            />
          )}

          {activeTab === 'certificates' && (
            <CertificatePage
              students={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              user={currentUser}
              onNavigateToStudentPortal={(stu) => setPortalStudent(stu)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettingsPage
              students={students}
              subjects={subjects}
              terms={terms}
              allScoreItems={allScoreItems}
              allScores={allScores}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              user={currentUser || {
                id: 'user-default',
                username: 'kru.somsri',
                password_hash: '1234',
                full_name: 'ครูสมศรี จิตเมตตา',
                school_name: 'โรงเรียนบ้านป่าส่าน',
                classroom_responsible: classroomName,
                role: 'teacher',
              }}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagementPage
              students={students}
              onStudentsUpdated={reloadData}
              classroom={classroomName}
              activeClassroom={activeClassroom}
              classrooms={classrooms}
              onNavigateToSheets={() => setActiveTab('google-sheets')}
              onOpenClassroomManager={() => setIsClassroomModalOpen(true)}
              onNavigateToIdCards={() => setActiveTab('id-cards')}
              onViewStudentPortal={(stu) => {
                setPortalStudent(stu);
              }}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectManagementPage
              subjects={subjects}
              terms={terms}
              allScoreItems={allScoreItems}
              onDataUpdated={reloadData}
            />
          )}

          {activeTab === 'google-sheets' && (
            <GoogleSheetsSyncPage
              students={students}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classroom={classroomName}
              user={currentUser}
              onDataUpdated={reloadData}
            />
          )}

          {activeTab === 'student-portal' && (
            <StudentPortalPage
              initialStudent={students[0] || null}
              allStudents={storage.getAllStudents()}
              subjects={subjects}
              allScoreItems={allScoreItems}
              allScores={allScores}
              terms={terms}
              classrooms={classrooms}
              user={currentUser}
              onBackToTeacherApp={() => setActiveTab('score-entry')}
            />
          )}

          {activeTab === 'backup' && (
            <BackupPage onDataRestored={reloadData} />
          )}
        </main>
      </div>

      {/* Classroom Manager Modal */}
      <ClassroomManagerModal
        isOpen={isClassroomModalOpen}
        onClose={() => setIsClassroomModalOpen(false)}
        classrooms={classrooms}
        activeClassroomId={activeClassroomId}
        onSelectClassroom={handleSelectClassroom}
        onClassroomsUpdated={reloadData}
      />
    </div>
  );
}
