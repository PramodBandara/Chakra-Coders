"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { isStaffRole } from "@/lib/constants";
import { formatFirebaseError } from "@/lib/errors";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";
import type { AppRole, UserProfile } from "@/lib/types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  role: AppRole;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromData(id: string, data: Record<string, unknown>, fallbackEmail: string): UserProfile {
  const role = data.role === "admin" || data.role === "moderator" || data.role === "student" ? data.role : "student";
  const createdAt = data.createdAt;
  return {
    id,
    name: typeof data.name === "string" && data.name.trim() ? data.name : "Student",
    email: typeof data.email === "string" ? data.email : fallbackEmail,
    role,
    karma: typeof data.karma === "number" ? data.karma : 0,
    createdAt:
      createdAt && typeof createdAt === "object" && "toDate" in createdAt && typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole>("guest");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const firebase = getFirebase();
    if (!firebase) return;

    let cancelled = false;

    async function loadUser(next: User) {
      const token = await next.getIdTokenResult();
      const claim = typeof token.claims.role === "string" ? token.claims.role : null;
      if (cancelled) return;
      setRole(isStaffRole(claim) ? claim : "student");

      const userRef = doc(firebase!.db, "users", next.uid);
      const snapshot = await getDoc(userRef);
      if (cancelled) return;

      if (!snapshot.exists()) {
        const email = next.email;
        if (!email) throw new Error("This Google account has no email address.");
        const name = (next.displayName?.trim() || email.split("@")[0] || "Student").slice(0, 80);
        await setDoc(userRef, {
          name,
          email,
          role: "student",
          karma: 0,
          createdAt: serverTimestamp(),
        });
        if (cancelled) return;
        setProfile({
          id: next.uid,
          name,
          email,
          role: "student",
          karma: 0,
          createdAt: new Date(),
        });
        return;
      }

      setProfile(profileFromData(next.uid, snapshot.data(), next.email ?? ""));
    }

    const unsubscribe = onAuthStateChanged(firebase.auth, (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setRole("guest");
        setError(null);
        setLoading(false);
        return;
      }

      void loadUser(next)
        .catch((loadError: unknown) => {
          if (!cancelled) setError(formatFirebaseError(loadError));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      role,
      error,
      signInWithGoogle: async () => {
        const firebase = getFirebase();
        if (!firebase) throw new Error("Add your Firebase web config to .env.local, then restart the dev server.");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(firebase.auth, provider);
      },
      signOut: async () => {
        const firebase = getFirebase();
        if (!firebase) return;
        await firebaseSignOut(firebase.auth);
      },
      refreshAccess: async () => {
        const firebase = getFirebase();
        const current = firebase?.auth.currentUser;
        if (!firebase || !current) return;
        const token = await current.getIdTokenResult(true);
        const claim = typeof token.claims.role === "string" ? token.claims.role : null;
        setRole(isStaffRole(claim) ? claim : "student");
      },
    }),
    [configured, loading, user, profile, role, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
