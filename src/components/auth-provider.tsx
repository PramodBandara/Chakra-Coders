"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { isAdministratorEmail, type AccountRole, type DirectoryPerson } from "@/lib/access";
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

function profileFromPerson(person: DirectoryPerson): UserProfile {
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    karma: 0,
    createdAt: null,
  };
}

async function loadAccount(next: User): Promise<{ role: AccountRole; profile: UserProfile; warning: string | null }> {
  const token = await next.getIdToken();
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { person?: DirectoryPerson; error?: string };
  if (!response.ok || !body.person) {
    if (isAdministratorEmail(next.email)) {
      return {
        role: "admin",
        warning: body.error || "Could not open the account directory.",
        profile: {
          id: next.uid,
          name: next.displayName?.trim() || "Admin",
          email: next.email ?? "",
          role: "admin",
          karma: 0,
          createdAt: null,
        },
      };
    }
    throw new Error(body.error || "Could not open this account.");
  }
  return { role: body.person.role, profile: profileFromPerson(body.person), warning: null };
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
      const account = await loadAccount(next);
      if (cancelled) return;
      setRole(account.role);
      setProfile(account.profile);
      setError(account.warning);
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
        const current = getFirebase()?.auth.currentUser;
        if (!current) return;
        await current.getIdToken(true);
        const account = await loadAccount(current);
        setRole(account.role);
        setProfile(account.profile);
        setError(account.warning);
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
