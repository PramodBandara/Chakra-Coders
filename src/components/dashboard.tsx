"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignInButton } from "@/components/sign-in-button";
import { SetupPanel } from "@/components/setup-panel";
import { StatusBadge } from "@/components/status-badge";
import { UploadForm } from "@/components/upload-form";
import { useAuth } from "@/components/auth-provider";
import { formatFirebaseError } from "@/lib/errors";
import { listMyNotes, noteTitle } from "@/lib/notes";
import type { Note } from "@/lib/types";

export function Dashboard() {
  const { configured, loading, user, profile, role, error: authError, refreshAccess } = useAuth();
  const [result, setResult] = useState<{ uid: string; notes: Note[]; error: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;
    void listMyNotes(uid)
      .then((notes) => {
        if (!cancelled) setResult({ uid, notes, error: null });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setResult({ uid, notes: [], error: formatFirebaseError(loadError) });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!configured) return <SetupPanel />;
  if (loading) return <p className="text-sm text-muted">Checking session…</p>;
  if (!user) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-serif text-3xl">Sign in to see your notes.</h2>
        <div className="mt-5">
          <SignInButton />
        </div>
      </section>
    );
  }

  const notes = result?.uid === user.uid ? result.notes : [];
  const error = result?.uid === user.uid ? result.error : null;
  const notesLoading = result?.uid !== user.uid;
  const editing = notes.find((note) => note.id === editingId && note.status === "declined");

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-3xl border border-line bg-card p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Signed in</p>
          <p className="mt-1 font-medium">{profile?.name ?? "Student"}</p>
          <p className="text-sm text-muted">{profile?.email ?? user.email}</p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Karma</p>
          <p className="mt-1 font-serif text-3xl">{profile?.karma ?? 0}</p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Role</p>
          <p className="mt-1 font-medium capitalize">{role}</p>
          <button type="button" className="mt-2 text-sm text-pine hover:text-pine-dark" onClick={() => void refreshAccess()}>
            Refresh access
          </button>
        </div>
      </section>

      {authError ? <p className="text-sm text-clay">{authError}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl">Your uploads</h2>
          <p className="mt-1 text-sm text-muted">Declined notes can be edited and sent back to review.</p>
        </div>
        <Link href="/upload" className="btn btn-primary">
          New upload
        </Link>
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {notesLoading ? <p className="text-sm text-muted">Loading your notes…</p> : null}
      {!notesLoading && notes.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-card px-6 py-10 text-sm text-muted">
          You have not uploaded a note yet.
        </p>
      ) : null}

      <div className="grid gap-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-3xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-2xl">{noteTitle(note)}</h3>
                  <StatusBadge status={note.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{note.subject}</p>
              </div>
              <Link href={`/notes/${note.id}`} className="text-sm font-medium text-pine">
                View
              </Link>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/75">{note.description}</p>
            {note.status === "declined" && note.declineReason ? (
              <p className="mt-3 text-sm text-clay">Declined: {note.declineReason}</p>
            ) : null}
            {note.status === "declined" ? (
              <button
                type="button"
                className="btn btn-quiet mt-4"
                onClick={() => setEditingId((current) => (current === note.id ? null : note.id))}
              >
                {editingId === note.id ? "Close editor" : "Edit and resubmit"}
              </button>
            ) : null}
          </article>
        ))}
      </div>

      {editing ? (
        <div>
          <h2 className="mb-3 font-serif text-3xl">Edit and resubmit</h2>
          <UploadForm existing={editing} />
        </div>
      ) : null}
    </div>
  );
}
