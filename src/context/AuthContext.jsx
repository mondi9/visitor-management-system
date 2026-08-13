import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ROLES, ROLE_LABELS } from '../lib/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = snap.data();
          setRole(data?.role || ROLES.RECEPTIONIST);
          setRoleError(snap.exists() ? '' : 'No role assigned yet — defaulted to Receptionist. A Super Admin can set it in User Management.');
        } catch (err) {
          console.error('Failed to load user role:', err);
          setRole(ROLES.RECEPTIONIST);
          setRoleError('Could not load your role from Firestore. Your access may be limited until the security rules are deployed.');
        }
      } else {
        setUser(null);
        setRole(null);
        setRoleError('');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  // In-app signups always create Receptionist accounts. The first Super Admin
  // is created in the Firebase Console so no one can self-elevate.
  const signUp = useCallback(async (email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      email: credential.user.email || '',
      role: ROLES.RECEPTIONIST,
      roleLabel: ROLE_LABELS[ROLES.RECEPTIONIST],
      createdAt: new Date(),
    });
    return credential;
  }, []);

  // In-app password recovery: the reset email points at the app's own
  // ResetPassword page instead of Firebase's generic hosted page.
  const resetPassword = useCallback(async (email) => {
    return sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/admin/reset-password`,
      handleCodeInApp: true,
    });
  }, []);

  const confirmResetPassword = useCallback(async (oobCode, newPassword) => {
    await verifyPasswordResetCode(auth, oobCode);
    await confirmPasswordReset(auth, oobCode, newPassword);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, roleError, signIn, signUp, resetPassword, confirmResetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};