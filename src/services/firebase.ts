import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, Student, Subject, Term, ScoreItem, Score, Classroom } from '../types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Operation Types & Error handling conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Check Firebase configuration.');
    }
    return false;
  }
}

// Automatically trigger test connection on import
testConnection();

// Convert Firebase User to App User
export function mapFirebaseUserToAppUser(fbUser: FirebaseUser): User {
  const email = fbUser.email || '';
  const displayName = fbUser.displayName || email.split('@')[0] || 'คุณครู';

  return {
    id: fbUser.uid,
    username: email || fbUser.uid,
    password_hash: '',
    full_name: displayName,
    email: email,
    photo_url: fbUser.photoURL || undefined,
    school_name: 'โรงเรียนประถมศึกษาพัฒนาการศึกษา',
    classroom_responsible: 'ป.5/1 และ ป.6/1',
    role: email === 't.suphawat.mua@gmail.com' ? 'admin' : 'teacher',
    provider: 'google',
  };
}

// Real Sign In with Google (Gmail)
export async function signInWithGmail(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const appUser = mapFirebaseUserToAppUser(fbUser);

    // Save/update user profile in Firestore
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(
        userRef,
        {
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || '',
          role: appUser.role || 'teacher',
          school_name: appUser.school_name || 'โรงเรียนประถมศึกษาพัฒนาการศึกษา',
          classroom_responsible: appUser.classroom_responsible || 'ป.5/1',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (saveErr) {
      console.warn('Profile write notice (handled):', saveErr);
    }

    return appUser;
  } catch (error: any) {
    console.error('Sign in with Gmail failed:', error);
    throw error;
  }
}

// Real Sign Out
export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

// Listen to auth state changes
export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      callback(mapFirebaseUserToAppUser(fbUser));
    } else {
      callback(null);
    }
  });
}
