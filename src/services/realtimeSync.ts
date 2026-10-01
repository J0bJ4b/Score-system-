import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, ensureFirebaseAuthSession, auth, handleFirestoreError, OperationType } from './firebase';
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
  private activeOwnerId: string | null = null;
  private statusListeners: SyncListener[] = [];
  private currentStatus: SyncStatus = 'offline';
  private lastSyncTime: Date | null = null;
  private pendingDebounceTimer: any = null;
  private isWritingToLocalFromRemote = false;
  private onRemoteDataChangedCallback: (() => void) | null = null;

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

  public getCurrentOwnerId(): string {
    if (auth.currentUser?.uid) {
      return auth.currentUser.uid;
    }
    try {
      const raw = localStorage.getItem('gradebook_current_user_v1');
      if (raw) {
        const user = JSON.parse(raw);
        if (user && user.id) return user.id;
      }
    } catch {}
    return 'demo_teacher';
  }

  /**
   * Initialize real-time listeners strictly scoped to the active account's ownerId
   */
  public async init(onRemoteDataChanged: () => void): Promise<void> {
    const ownerId = this.getCurrentOwnerId();

    // If already listening to this specific ownerId, just record the callback
    if (this.isInitialized && this.activeOwnerId === ownerId) {
      this.onRemoteDataChangedCallback = onRemoteDataChanged;
      return;
    }

    this.cleanup();
    this.isInitialized = true;
    this.activeOwnerId = ownerId;
    this.onRemoteDataChangedCallback = onRemoteDataChanged;

    try {
      this.setStatus('syncing', 'กำลังเชื่อมต่อ Cloud Firestore ประจำบัญชี...');
      await ensureFirebaseAuthSession();

      // Check if user's private cloud dataset exists; if brand new, seed starter template
      await this.checkAndSeedCloudDatabase(ownerId);

      // Attach 100% isolated collection listeners where ownerId == current account
      this.listenToCollection<Classroom>('classrooms', 'gradebook_classrooms_v2', ownerId, onRemoteDataChanged);
      this.listenToCollection<Student>('students', 'gradebook_students_v2', ownerId, onRemoteDataChanged);
      this.listenToCollection<Subject>('subjects', 'gradebook_subjects_v1', ownerId, onRemoteDataChanged);
      this.listenToCollection<Term>('terms', 'gradebook_terms_v1', ownerId, onRemoteDataChanged);
      this.listenToCollection<ScoreItem>('score_items', 'gradebook_score_items_v1', ownerId, onRemoteDataChanged);
      this.listenToCollection<Score>('scores', 'gradebook_scores_v2', ownerId, onRemoteDataChanged);
      this.listenToCollection<Certificate>('certificates', 'gradebook_certificates_v1', ownerId, onRemoteDataChanged);
      this.listenToCollection<RemedialRecord>('remedial_records', 'gradebook_remedial_records_v1', ownerId, onRemoteDataChanged);

      // Listen to School Settings doc for this owner
      this.listenToSchoolSettings(ownerId, onRemoteDataChanged);

      this.setStatus('connected', 'เชื่อมต่อระบบคลาวด์แยกบัญชี 100% สำเร็จ');
    } catch (err: any) {
      console.warn('RealtimeSync initialization error:', err);
      this.setStatus('offline', 'ทำงานแบบออฟไลน์ (บันทึกในเครื่องเฉพาะบัญชี)');
    }
  }

  /**
   * Switch the active account in real-time
   */
  public async switchAccount(newOwnerId: string, onRemoteDataChanged?: () => void) {
    this.cleanup();
    if (onRemoteDataChanged) {
      this.onRemoteDataChangedCallback = onRemoteDataChanged;
    }
    if (this.onRemoteDataChangedCallback) {
      await this.init(this.onRemoteDataChangedCallback);
    }
  }

  /**
   * Listen to a collection filtered by ownerId and sync changes to user-scoped localStorage
   */
  private listenToCollection<T extends { id: string; ownerId?: string }>(
    collectionName: string,
    storageBaseKey: string,
    ownerId: string,
    onChanged: () => void
  ) {
    try {
      const userStorageKey = `${storageBaseKey}_${ownerId}`;
      const q = query(collection(db, collectionName), where('ownerId', '==', ownerId));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty && !localStorage.getItem(userStorageKey)) {
            return;
          }

          if (!snapshot.empty) {
            const remoteItems: T[] = snapshot.docs.map((doc) => doc.data() as T);

            // Merge safely with user-scoped local storage so partial remote never wipes local data
            this.isWritingToLocalFromRemote = true;
            try {
              const localRaw = localStorage.getItem(userStorageKey);
              let merged = remoteItems;
              if (localRaw) {
                try {
                  const localList: T[] = JSON.parse(localRaw);
                  const localMap = new Map<string, T>();
                  localList.forEach((l) => {
                    if (l && l.id) localMap.set(l.id, l);
                  });

                  const map = new Map<string, T>();

                  remoteItems.forEach((r) => {
                    if (!r || !r.id) return;
                    const existingLocal = localMap.get(r.id);
                    if (existingLocal) {
                      const remoteTime = new Date((r as any).updatedAt || (r as any).updated_at || 0).getTime();
                      const localTime = new Date((existingLocal as any).updatedAt || (existingLocal as any).updated_at || 0).getTime();
                      // If local is newer or equal, preserve local!
                      if (localTime > remoteTime) {
                        map.set(r.id, existingLocal);
                        return;
                      }
                    }
                    map.set(r.id, r);
                  });

                  // Keep local items if not yet synced to remote
                  localList.forEach((l) => {
                    if (l && l.id && !map.has(l.id)) {
                      map.set(l.id, l);
                    }
                  });
                  merged = Array.from(map.values());
                } catch {}
              }

              localStorage.setItem(userStorageKey, JSON.stringify(merged));
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
   * Listen to school settings single doc for this owner
   */
  private listenToSchoolSettings(ownerId: string, onChanged: () => void) {
    try {
      const userStorageKey = `gradebook_school_settings_v1_${ownerId}`;
      const docRef = doc(db, 'school_settings', ownerId);
      const unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            this.isWritingToLocalFromRemote = true;
            try {
              localStorage.setItem(userStorageKey, JSON.stringify(data));
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
   * If Cloud Firestore has zero classrooms for this specific ownerId, seed from local storage
   */
  private async checkAndSeedCloudDatabase(ownerId: string) {
    try {
      const q = query(collection(db, 'classrooms'), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log(`Cloud Firestore is empty for account ${ownerId}, seeding initial database...`);
        await this.pushAllLocalDataToCloud(ownerId);
      }
    } catch (err) {
      console.warn('Cloud seed check notice (offline or permission):', err);
    }
  }

  /**
   * Push all of the active account's local data up to Cloud Firestore
   */
  public async pushAllLocalDataToCloud(specificOwnerId?: string): Promise<boolean> {
    try {
      const ownerId = specificOwnerId || this.getCurrentOwnerId();
      this.setStatus('syncing', 'กำลังอัปโหลดข้อมูลส่วนตัวขึ้น Cloud...');
      await ensureFirebaseAuthSession();

      const getLocalList = (baseKey: string): any[] => {
        try {
          const userKey = `${baseKey}_${ownerId}`;
          const raw = localStorage.getItem(userKey) || localStorage.getItem(baseKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };

      const allItemsToPush: Array<{ collectionName: string; item: any }> = [];
      const addToList = (collectionName: string, items: any[]) => {
        items.forEach((item) => {
          if (item && item.id) {
            allItemsToPush.push({ collectionName, item });
          }
        });
      };

      addToList('classrooms', getLocalList('gradebook_classrooms_v2'));
      addToList('students', getLocalList('gradebook_students_v2'));
      addToList('subjects', getLocalList('gradebook_subjects_v1'));
      addToList('terms', getLocalList('gradebook_terms_v1'));
      addToList('score_items', getLocalList('gradebook_score_items_v1'));
      addToList('scores', getLocalList('gradebook_scores_v2'));
      addToList('certificates', getLocalList('gradebook_certificates_v1'));
      addToList('remedial_records', getLocalList('gradebook_remedial_records_v1'));

      // Chunk writes so we never exceed Firestore's 500 operations per batch limit
      const CHUNK_SIZE = 350;
      for (let i = 0; i < allItemsToPush.length; i += CHUNK_SIZE) {
        const chunk = allItemsToPush.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(({ collectionName, item }) => {
          const ref = doc(db, collectionName, String(item.id));
          batch.set(
            ref,
            {
              ...item,
              ownerId: ownerId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        });
        await batch.commit();
      }

      // School Settings for this specific ownerId
      const userSettingsKey = `gradebook_school_settings_v1_${ownerId}`;
      const schoolSettingsRaw =
        localStorage.getItem(userSettingsKey) || localStorage.getItem('gradebook_school_settings_v1');
      if (schoolSettingsRaw) {
        try {
          const settings = JSON.parse(schoolSettingsRaw);
          const settingsRef = doc(db, 'school_settings', ownerId);
          await setDoc(
            settingsRef,
            { ...settings, ownerId: ownerId, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (e) {
          console.warn('Settings parse err:', e);
        }
      }

      this.setStatus('connected', 'ซิงค์ข้อมูลบัญชีขึ้น Cloud เรียบร้อยแล้ว');
      return true;
    } catch (err: any) {
      console.error('Push to Cloud failed:', err);
      this.setStatus('error', err.message || 'ไม่สามารถซิงค์ขึ้น Cloud ได้');
      return false;
    }
  }

  /**
   * Save a single document to Cloud Firestore with ownerId
   */
  public async syncDoc(collectionName: string, id: string, data: any): Promise<void> {
    if (this.isWritingToLocalFromRemote) return;
    try {
      const ownerId = this.getCurrentOwnerId();
      await ensureFirebaseAuthSession();
      const docRef = doc(db, collectionName, String(id));
      await setDoc(
        docRef,
        {
          ...data,
          ownerId: ownerId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Cloud sync notice for ${collectionName}/${id}:`, err);
    }
  }

  /**
   * Save multiple documents to Cloud Firestore safely chunked with ownerId
   */
  public async syncDocsBatch(collectionName: string, items: any[]): Promise<void> {
    if (this.isWritingToLocalFromRemote || items.length === 0) return;
    try {
      const ownerId = this.getCurrentOwnerId();
      await ensureFirebaseAuthSession();
      const validItems = items.filter((item) => item && item.id);
      const CHUNK_SIZE = 350;

      for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
        const chunk = validItems.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(db, collectionName, String(item.id));
          batch.set(
            docRef,
            {
              ...item,
              ownerId: ownerId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        });
        await batch.commit();
      }

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
   * Save School Settings to Cloud Firestore for this ownerId
   */
  public async syncSchoolSettings(settings: SchoolSettings): Promise<void> {
    if (this.isWritingToLocalFromRemote) return;
    try {
      const ownerId = this.getCurrentOwnerId();
      await ensureFirebaseAuthSession();
      const docRef = doc(db, 'school_settings', ownerId);
      await setDoc(
        docRef,
        { ...settings, ownerId: ownerId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
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
    this.activeOwnerId = null;
  }
}

export const realtimeSync = new RealtimeSyncService();
