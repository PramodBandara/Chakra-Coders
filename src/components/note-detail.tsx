"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SetupPanel } from "@/components/setup-panel";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth-provider";
import { isStaffRole } from "@/lib/constants";
import { formatFirebaseError } from "@/lib/errors";
import { getNote, noteTitle } from "@/lib/notes";
import type { Note } from "@/lib/types";

export function NoteDetail({ id }: { id: string }) {
  const { configured, loading, user, role } = useAuth();
  const [result, setResult] = useState<{ id: string; note: Note | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!configured || loading) return;
    let cancelled = false;
    void getNote(id)
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setResult({ id, note: null, error: "This note is not in the library." });
          return;
        }
        const canReadPrivate = next.status === "approved" || user?.uid === next.uploaderId || isStaffRole(role);
        if (!canReadPrivate) {
          setResult({ id, note: null, error: "This note is not public yet." });
          return;
        }
        setResult({ id, note: next, error: null });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setResult({ id, note: null, error: formatFirebaseError(loadError) });
      });
    return () => {
      cancelled = true;
    };
  }, [configured, id, loading, role, user]);

  const note = result?.id === id ? result.note : null;
  const error = result?.id === id ? result.error : null;
  const noteLoading = configured && (loading || result?.id !== id);

  if (!configured) return <SetupPanel />;
  if (noteLoading) return <p className="text-sm text-muted">Loading note…</p>;
  if (error || !note) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h1 className="font-serif text-3xl">{error ?? "This note is not available."}</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-pine">
          Back to the library
        </Link>
      </section>
    );
  }

  const title = noteTitle(note);

  return (
    <article className="rounded-3xl border border-line bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium tracking-wide text-pine uppercase">{note.subject}</p>
        {note.status !== "approved" ? <StatusBadge status={note.status} /> : null}
      </div>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink/80">{note.description}</p>
      {note.tags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {note.status === "declined" && note.declineReason ? (
        <p className="mt-4 text-sm text-clay">Declined: {note.declineReason}</p>
      ) : null}

      <div className="mt-6">
        {note.fileType === "pdf" ? (
          <a className="btn btn-primary" href={note.fileUrl} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        ) : (
          <Image
            src={note.fileUrl}
            alt={title}
            width={1200}
            height={1600}
            unoptimized
            className="h-auto max-h-[70vh] w-full rounded-2xl border border-line object-contain"
          />
        )}
      </div>
    </article>
  );
}
