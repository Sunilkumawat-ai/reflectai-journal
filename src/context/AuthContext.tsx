import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously,
  signOut as fbSignOut, 
  User 
} from 'firebase/auth';
import { auth, googleProvider, mapFirebaseUser } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  rawUser: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setRawUser(firebaseUser);
      setUser(mapFirebaseUser(firebaseUser));
      setLoading(false);
    }, (err) => {
      console.error('Auth state change error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      setUser(mapFirebaseUser(result.user));
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      let msg = err.message || 'Failed to sign in with Google.';
      if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by browser. Please allow popups or open the app in a new tab.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in was closed before completing.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInAnonymously(auth);
      setUser({
        uid: result.user.uid,
        email: null,
        displayName: 'Guest Explorer',
        photoURL: null,
        isAnonymous: true
      });
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setError(err.message || 'Failed to start guest session.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await fbSignOut(auth);
      setUser(null);
      setRawUser(null);
    } catch (err: any) {
      console.error('Sign-Out error:', err);
      setError(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        rawUser,
        loading,
        error,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
