import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, ensureFirebaseAuthSession } from './firebase';
import {
  Classroom,
  Student,
  Subject,
  Term,
  ScoreItem,
  Score,
  Certificate,
  RemedialRecord,
  SchoolSettings,
} from '../types';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface SyncListener {
  (status: SyncStatus, lastSyncTime: Date | null, message?: string): void;
}

class RealtimeSyncService {
  private unsubscribers: Unsubscribe[] = [];
  private isInitialized = false;
  private statusListeners: SyncListener[] = [];
  private currentStatus: SyncStatus = 'offline';
  private lastSyncTime: Date | null = null;
  private pendingDebounceTimer: any = null;
  private isWritingToLocalFromRemote = false;

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  public subscribeStatus(listener: SyncListener): () => void {
    this.statusListeners.push(listener);
    listener(this.currentStatus, this.lastSyncTime);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: SyncStatus, message?: string) {
    this.currentStatus = status;
    if (status === 'connected') {
      this.lastSyncTime = new Date();
    }
    this.statusListeners.forEach((l) => l(status, this.lastSyncTime, message));
  }

  /**
   * Initialize real-time listeners across all core gradebook collections
   */
  public async init(onRemoteDataChanged: () => void): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.setStatus('syncing', 'กำลังเชื่อมต่อ Cloud Firestore...');
      await ensureFirebaseAuthSession();

      // Check if cloud database is empty, seed if needed
      await this.checkAndSeedCloudDatabase();

      // Attach collection listeners
      this.listenToCollection<Classroom>('classrooms', 'gradebook_classrooms_v2', onRemoteDataChanged);
      this.listenToCollection<Student>('students', 'gradebook_students_v2', onRemoteDataChanged);
      this.listenToCollection<Subject>('subjects', 'gradebook_subjects_v1', onRemoteDataChanged);
      this.listenToCollection<Term>('terms', 'gradebook_terms_v1', onRemoteDataChanged);
      this.listenToCollection<ScoreItem>('score_items', 'gradebook_score_items_v1', onRemoteDataChanged);
      this.listenToCollection<Score>('scores', 'gradebook_scores_v2', onRemoteDataChanged);
      this.listenToCollection<Certificate>('certificates', 'gradebook_certificates_v1', onRemoteDataChanged);
      this.listenToCollection<RemedialRecord>('remedial_records', 'gradebook_remedial_records_v1', onRemoteDataChanged);

      // Listen to School Settings single doc
      this.listenToSchoolSettings(onRemoteDataChanged);

      this.setStatus('connected', 'เชื่อมต่อระบบคลาวด์เรียลไทม์สำเร็จ');
    } catch (err: any) {
      console.warn('RealtimeSync initialization error:', err);
      this.setStatus('offline', 'ทำงานแบบออฟไลน์ (บันทึกในเครื่อง)');
    }
  }

  /**
   * Listen to a collection and sync changes to localStorage
   */
  private listenToCollection<T extends { id: string }>(
    collectionName: string,
    storageKey: string,
    onChanged: () => void
  ) {
    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (snapshot.empty && !localStorage.getItem(storageKey)) {
            return;
          }

          if (!snapshot.empty) {
            const remoteItems: T[] = snapshot.docs.map((doc) => doc.data() as T);

            // Merge with local storage gracefully
            this.isWritingToLocalFromRemote = true;
            try {
              localStorage.setItem(storageKey, JSON.stringify(remoteItems));
            } finally {
              this.isWritingToLocalFromRemote = false;
            }

            this.setStatus('connected');
            this.debounceTrigger(onChanged);
          }
        },
        (error) => {
          console.warn(`Firestore listener error on ${collectionName}:`, error);
          this.setStatus('offline', 'ออฟไลน์ (ระบบบันทึกในเครื่อง)');
        }
      );

      this.unsubscribers.push(unsub);
    } catch (err) {
      console.warn(`Failed to attach listener for ${collectionName}:`, err);
    }
  }

  /**
   * Listen to school settings single doc
   */
  private listenToSchoolSettings(onChanged: () => void) {
    try {
      const docRef = doc(db, 'school_settings', 'primary');
      const unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            this.isWritingToLocalFromRemote = true;
            try {
              localStorage.setItem('gradebook_school_settings_v1', JSON.stringify(data));
            } finally {
              this.isWritingToLocalFromRemote = false;
            }
            this.setStatus('connected');
            this.debounceTrigger(onChanged);
          }
        },
        (error) => {
          console.warn('Firestore school_settings listener error:', error);
        }
      );
      this.unsubscribers.push(unsub);
    } catch (err) {
      console.warn('Failed to listen to school_settings:', err);
    }
  }

  private debounceTrigger(callback: () => void) {
    if (this.pendingDebounceTimer) {
      clearTimeout(this.pendingDebounceTimer);
    }
    this.pendingDebounceTimer = setTimeout(() => {
      callback();
    }, 80);
  }

  /**
   * If Cloud Firestore has zero students, seed from local database
   */
  private async checkAndSeedCloudDatabase() {
    try {
      const snap = await getDocs(collection(db, 'students'));
      if (snap.empty) {
        console.log('Cloud Firestore is empty, seeding initial database from local storage...');
        await this.pushAllLocalDataToCloud();
      }
    } catch (err) {
      console.warn('Cloud seed check notice (offline or permission):', err);
    }
  }

  /**
   * Push all current local data up to Cloud Firestore
   */
  public async pushAllLocalDataToCloud(): Promise<boolean> {
    try {
      this.setStatus('syncing', 'กำลังอัปโหลดข้อมูลทั้งหมดขึ้น Cloud...');
      await ensureFirebaseAuthSession();

      const batch = writeBatch(db);

      // Helper to batch push items
      const addItemsToBatch = (collectionName: string, items: any[]) => {
        items.forEach((item) => {
          if (item && item.id) {
            const ref = doc(db, collectionName, String(item.id));
            batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
      };

      const getLocalList = (key: string): any[] => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };

      addItemsToBatch('classrooms', getLocalList('gradebook_classrooms_v2'));
      addItemsToBatch('students', getLocalList('gradebook_students_v2'));
      addItemsToBatch('subjects', getLocalList('gradebook_subjects_v1'));
      addItemsToBatch('terms', getLocalList('gradebook_terms_v1'));
      addItemsToBatch('score_items', getLocalList('gradebook_score_items_v1'));
      addItemsToBatch('scores', getLocalList('gradebook_scores_v2'));
      addItemsToBatch('certificates', getLocalList('gradebook_certificates_v1'));
      addItemsToBatch('remedial_records', getLocalList('gradebook_remedial_records_v1'));

      // School Settings
      const schoolSettingsRaw = localStorage.getItem('gradebook_school_settings_v1');
      if (schoolSettingsRaw) {
        try {
          const settings = JSON.parse(schoolSettingsRaw);
          const settingsRef = doc(db, 'school_settings', 'primary');
          batch.set(settingsRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn('Settings parse err:', e);
        }
      }

      await batch.commit();
      this.setStatus('connected', 'ซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว');
      return true;
    } catch (err: any) {
      console.error('Push to Cloud failed:', err);
      this.setStatus('error', err.message || 'ไม่สามารถซิงค์ขึ้น Cloud ได้');
      return false;
    }
  }

  /**
   * Save a single document to Cloud Firestore in the background
   */
  public async syncDoc(collectionName: string, id: string, data: any): Promise<void> {
    if (this.isWritingToLocalFromRemote) return;
    try {
      await ensureFirebaseAuthSession();
      const docRef = doc(db, collectionName, String(id));
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Cloud sync notice for ${collectionName}/${id}:`, err);
    }
  }

  /**
   * Save multiple documents to Cloud Firestore in a single batch
   */
  public async syncDocsBatch(collectionName: string, items: any[]): Promise<void> {
    if (this.isWritingToLocalFromRemote || items.length === 0) return;
    try {
      await ensureFirebaseAuthSession();
      const batch = writeBatch(db);
      items.forEach((item) => {
        if (item && item.id) {
          const docRef = doc(db, collectionName, String(item.id));
          batch.set(docRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
        }
      });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Cloud batch sync notice for ${collectionName}:`, err);
    }
  }

  /**
   * Delete a document from Cloud Firestore
   */
  public async deleteDoc(collectionName: string, id: string): Promise<void> {
    if (this.isWritingToLocalFromRemote) return;
    try {
      await ensureFirebaseAuthSession();
      const docRef = doc(db, collectionName, String(id));
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Cloud delete notice for ${collectionName}/${id}:`, err);
    }
  }

  /**
   * Save School Settings to Cloud Firestore
   */
  public async syncSchoolSettings(settings: SchoolSettings): Promise<void> {
    if (this.isWritingToLocalFromRemote) return;
    try {
      await ensureFirebaseAuthSession();
      const docRef = doc(db, 'school_settings', 'primary');
      await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      this.setStatus('connected');
    } catch (err) {
      console.warn('Cloud syncSchoolSettings notice:', err);
    }
  }

  /**
   * Cleanup listeners
   */
  public cleanup() {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
    this.unsubscribers = [];
    this.isInitialized = false;
  }
}

export const realtimeSync = new RealtimeSyncService();
