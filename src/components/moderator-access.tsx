"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { DirectoryPerson } from "@/lib/access";

export function ModeratorAccess() {
  const { user, role } = useAuth();
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const response = await fetch("/api/admin/people", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { people?: DirectoryPerson[]; error?: string };
    if (!response.ok) throw new Error(body.error || "Could not load people.");
    setPeople(body.people ?? []);
  }, [user]);

  useEffect(() => {
    if (!user || role !== "admin") return;
    let cancelled = false;
    void load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load people.");
      });
    return () => {
      cancelled = true;
    };
  }, [user, role, load]);

  if (role !== "admin" || !user) return null;

  async function updateAccess(nextEmail: string, nextRole: "student" | "moderator") {
    setBusyEmail(nextEmail);
    setError(null);
    try {
      const token = await user!.getIdToken();
      const response = await fetch("/api/admin/people", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, role: nextRole }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not update access.");
      setEmail("");
      await load();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : "Could not update access.");
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5 sm:p-6">
      <h2 className="font-serif text-3xl">Moderator access</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        You are the administrator. Moderators can review notes. They cannot change who has access.
      </p>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void updateAccess(email, "moderator");
        }}
      >
        <label className="flex-1">
          <span className="label">Google email</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            placeholder="student@gmail.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busyEmail !== null}>
          Make moderator
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}

      <ul className="mt-5 divide-y divide-line">
        {people.map((person) => (
          <li key={person.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-sm text-muted">
                {person.email}
                {person.signedIn ? "" : " · signs in later"}
              </p>
            </div>
            {person.role === "admin" ? (
              <span className="text-sm text-pine">Administrator</span>
            ) : (
              <div className="flex gap-2">
                <span className="self-center text-sm capitalize text-muted">{person.role}</span>
                {person.role === "moderator" ? (
                  <button
                    type="button"
                    className="btn btn-quiet h-9"
                    disabled={busyEmail === person.email}
                    onClick={() => void updateAccess(person.email, "student")}
                  >
                    Remove access
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-quiet h-9"
                    disabled={busyEmail === person.email}
                    onClick={() => void updateAccess(person.email, "moderator")}
                  >
                    Make moderator
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
