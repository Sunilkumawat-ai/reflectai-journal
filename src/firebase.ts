import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { JournalEntry, UserProfile } from './types';

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with custom database ID specified in configuration
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Zero-crash payload hygiene helper: strip all undefined values before passing to Firestore
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

// Convert Firestore User to UserProfile
export function mapFirebaseUser(user: User | null): UserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Reflective Thinker'),
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous
  };
}

// Firestore operations isolated to the specific user: /users/{userId}/entries/{entryId}
export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        userId: data.userId || userId,
        title: data.title || 'Untitled Entry',
        content: data.content || '',
        messages: data.messages || [],
        mood: data.mood || 'reflective',
        tags: data.tags || [],
        summary: data.summary || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        isPinned: Boolean(data.isPinned)
      });
    });
    return entries;
  } catch (error) {
    console.error('Error fetching user entries from Firestore:', error);
    throw error;
  }
}

export async function saveUserEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId || !entry.id) {
    throw new Error('User ID and Entry ID are required to persist data');
  }
  const entryDocRef = doc(db, 'users', userId, 'entries', entry.id);
  const sanitized = sanitizePayload({
    ...entry,
    userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(entryDocRef, sanitized, { merge: true });
}

export async function deleteUserEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required to delete an entry');
  }
  const entryDocRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryDocRef);
}
