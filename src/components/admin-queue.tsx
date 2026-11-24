"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { SignInButton } from "@/components/sign-in-button";
import { SetupPanel } from "@/components/setup-panel";
import { useAuth } from "@/components/auth-provider";
import { DECLINE_REASONS, isStaffRole } from "@/lib/constants";
import { formatFirebaseError } from "@/lib/errors";
import { getFirebase } from "@/lib/firebase";
import { listPendingNotes, moderateNote, noteTitle } from "@/lib/notes";
import type { Note } from "@/lib/types";

type QueueItem = Note & { uploaderName: string; uploaderEmail: string };

export function AdminQueue() {
  const { configured, loading, user, role, refreshAccess } = useAuth();
  const [result, setResult] = useState<{ items: QueueItem[]; error: string | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const items = result?.items ?? [];
  const error = result?.error ?? null;
  const queueLoading = result === null;
  const [preset, setPreset] = useState<string>(DECLINE_REASONS[0]);
  const [detail, setDetail] = useState("");

  const loadQueue = useCallback(async () => {
    const notes = await listPendingNotes();
    const firebase = getFirebase();
    const withUploaders = await Promise.all(
      notes.map(async (note) => {
        if (!firebase) return { ...note, uploaderName: "Student", uploaderEmail: "" };
        try {
          const snapshot = await getDoc(doc(firebase.db, "users", note.uploaderId));
          const data = snapshot.data();
          return {
            ...note,
            uploaderName: typeof data?.name === "string" ? data.name : "Student",
            uploaderEmail: typeof data?.email === "string" ? data.email : "",
          };
        } catch {
          return { ...note, uploaderName: "Student", uploaderEmail: "" };
        }
      }),
    );
    return withUploaders;
  }, []);

  useEffect(() => {
    if (!user || !isStaffRole(role)) return;
    let cancelled = false;
    void loadQueue()
      .then((next) => {
        if (!cancelled) setResult({ items: next, error: null });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setResult({ items: [], error: formatFirebaseError(loadError) });
      });
    return () => {
      cancelled = true;
    };
  }, [user, role, loadQueue]);

  if (!configured) return <SetupPanel />;
  if (loading) return <p className="text-sm text-muted">Checking session…</p>;
  if (!user) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-serif text-3xl">Sign in to review notes.</h2>
        <div className="mt-5">
          <SignInButton />
        </div>
      </section>
    );
  }
  if (!isStaffRole(role)) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-serif text-3xl">This queue is for admins and moderators.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Google sign-in creates a student account. An existing admin sets the admin or moderator claim with
          scripts/set-role.mjs. After that, sign out and back in, or refresh access.
        </p>
        <button type="button" className="btn btn-quiet mt-5" onClick={() => void refreshAccess()}>
          Refresh access
        </button>
      </section>
    );
  }

  function reasonText() {
    const extra = detail.trim();
    if (!extra) return preset;
    return `${preset}: ${extra}`;
  }

  async function decide(noteId: string, decision: "approved" | "declined") {
    setBusyId(noteId);
    try {
      await moderateNote(noteId, decision, decision === "declined" ? reasonText() : undefined);
      setResult((current) => ({
        items: (current?.items ?? []).filter((item) => item.id !== noteId),
        error: null,
      }));
    } catch (decideError: unknown) {
      setResult((current) => ({
        items: current?.items ?? [],
        error: formatFirebaseError(decideError),
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">
          {queueLoading ? "Loading the queue…" : `${items.length} waiting`}
          {role === "moderator" ? " · Moderators can accept or decline. Account changes stay with admins." : ""}
        </p>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setResult(null);
            void loadQueue()
              .then((next) => setResult({ items: next, error: null }))
              .catch((loadError: unknown) => setResult({ items: [], error: formatFirebaseError(loadError) }));
          }}
        >
          Refresh queue
        </button>
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      <div className="grid gap-3 rounded-3xl border border-line bg-card p-5 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <label>
          <span className="label">Decline reason</span>
          <select className="field" value={preset} onChange={(event) => setPreset(event.target.value)}>
            {DECLINE_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Detail</span>
          <input
            className="field"
            value={detail}
            maxLength={180}
            placeholder="Optional detail for the student"
            onChange={(event) => setDetail(event.target.value)}
          />
        </label>
      </div>

      {!queueLoading && items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-card px-6 py-10 text-sm text-muted">
          Nothing is waiting for review.
        </p>
      ) : null}

      {items.map((note) => (
        <article key={note.id} className="rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">{noteTitle(note)}</h2>
              <p className="mt-1 text-sm text-muted">
                {note.subject} · {note.uploaderName}
                {note.uploaderEmail ? ` · ${note.uploaderEmail}` : ""}
              </p>
            </div>
            {note.fileUrl ? (
              <a className="text-sm font-medium text-pine" href={note.fileUrl} target="_blank" rel="noreferrer">
                Open file
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/80">{note.description}</p>
          {note.tags.length > 0 ? <p className="mt-2 text-xs text-muted">{note.tags.join(" · ")}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busyId === note.id}
              onClick={() => void decide(note.id, "approved")}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === note.id}
              onClick={() => void decide(note.id, "declined")}
            >
              Decline
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
