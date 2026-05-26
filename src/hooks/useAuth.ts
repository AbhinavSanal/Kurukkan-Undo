import { useCallback, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { hasFirebaseConfig } from "../config";
import { auth } from "../lib/firebase";
import type { AppUser } from "../types";

const demoUser: AppUser = {
  uid: "demo-user",
  displayName: "Demo User",
  email: "demo@kurukkan.local",
  photoURL: null
};

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(
    hasFirebaseConfig ? null : demoUser
  );
  const [loading, setLoading] = useState(hasFirebaseConfig);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(
        firebaseUser
          ? {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL
            }
          : null
      );
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return;
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) return;
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  return {
    user,
    loading,
    isDemoMode: !hasFirebaseConfig,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  };
};
