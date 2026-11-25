"use client";

import { useEffect, useMemo, useState } from "react";
import { NoteCard } from "@/components/note-card";
import { SetupPanel } from "@/components/setup-panel";
import { useAuth } from "@/components/auth-provider";
import { SUBJECTS } from "@/lib/constants";
import { formatFirebaseError } from "@/lib/errors";
import { listApprovedNotes } from "@/lib/notes";
import type { Note } from "@/lib/types";

export function NoteLibrary() {
  const { configured } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subject, setSubject] = useState("all");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void listApprovedNotes()
      .then((next) => {
        if (!cancelled) setNotes(next);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(formatFirebaseError(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const visible = useMemo(() => {
    const needle = tag.trim().toLowerCase();
    return notes.filter((note) => {
      if (subject !== "all" && note.subject !== subject) return false;
      if (!needle) return true;
      return note.tags.some((item) => item.includes(needle));
    });
  }, [notes, subject, tag]);

  if (!configured) return <SetupPanel />;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm">
          <span className="label">Subject</span>
          <select className="field" value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="all">All subjects</option>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="label">Tag</span>
          <input
            className="field"
            value={tag}
            placeholder="mechanics, organic…"
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">
        {loading ? "Loading approved notes…" : `${visible.length} approved ${visible.length === 1 ? "note" : "notes"}`}
        {" · "}
        Sorted by fair score
      </p>

      {error ? <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p> : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-line bg-card px-6 py-12 text-center">
          <h2 className="font-serif text-2xl">No approved notes in this view.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Uploads stay private until an admin or moderator accepts them. The public library only shows approved notes.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
