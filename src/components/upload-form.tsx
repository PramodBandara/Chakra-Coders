"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";
import { SetupPanel } from "@/components/setup-panel";
import { SUBJECTS } from "@/lib/constants";
import { formatFirebaseError } from "@/lib/errors";
import { createNote, noteTitle, resubmitNote } from "@/lib/notes";
import type { Note } from "@/lib/types";

export function UploadForm({ existing }: { existing?: Note }) {
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [lessonName, setLessonName] = useState(existing?.lessonName ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return <SetupPanel />;
  if (loading) return <p className="text-sm text-muted">Checking session…</p>;
  if (!user) {
    return (
      <section className="rounded-lg border border-line bg-card p-6">
        <h2 className="font-serif text-3xl">Sign in to upload notes.</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
          Google accounts start as students. A moderator reviews each file before it appears in the library.
        </p>
        <div className="mt-5">
          <SignInButton />
        </div>
      </section>
    );
  }

  return (
    <form
      className="rounded-lg border border-line bg-card p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const input = { subject, lessonName, description, tags, file };
        const action = existing ? resubmitNote(user.uid, existing, input) : createNote(user.uid, input);
        void action
          .then(() => router.push("/dashboard"))
          .catch((submitError: unknown) => {
            setError(formatFirebaseError(submitError));
            setPending(false);
          });
      }}
    >
      <div className="grid gap-5">
        <label>
          <span className="label">Subject</span>
          <select className="field" required value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">Choose a subject</option>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">Lesson name</span>
          <input
            className="field"
            value={lessonName}
            maxLength={120}
            placeholder="Optional, for example Circular motion"
            onChange={(event) => setLessonName(event.target.value)}
          />
        </label>

        <label>
          <span className="label">Description</span>
          <textarea
            className="field min-h-32 resize-y"
            required
            maxLength={1000}
            value={description}
            placeholder="What does this note cover, and who is it for?"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label>
          <span className="label">Tags</span>
          <input
            className="field"
            value={tags}
            placeholder="Comma separated, up to 8"
            onChange={(event) => setTags(event.target.value)}
          />
        </label>

        <label>
          <span className="label">{existing ? "Replace file" : "File"}</span>
          <input
            className="field file:mr-3 file:rounded-full file:border-0 file:bg-pine file:px-3 file:py-1.5 file:text-sm file:text-paper"
            type="file"
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            required={!existing}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="mt-2 block text-xs text-muted">PDF, JPEG, or PNG. 10 MB maximum. Five new uploads per day.</span>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Sending…" : existing ? "Resubmit for review" : "Submit for review"}
        </button>
        <p className="text-sm text-muted">
          {existing ? `${noteTitle(existing)} returns to the review queue.` : "The note stays pending until it is accepted."}
        </p>
      </div>
    </form>
  );
}
