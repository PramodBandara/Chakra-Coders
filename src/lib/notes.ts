import { getFirebase } from "@/lib/firebase";
import type { Note } from "@/lib/types";
import type { NoteInput } from "@/lib/notes-input";

export type { NoteInput } from "@/lib/notes-input";

type DatedNote = Omit<Note, "createdAt" | "updatedAt"> & {
  createdAt: string | null;
  updatedAt: string | null;
};

export type PendingNote = Note & { uploaderName: string; uploaderEmail: string };

function revive(note: DatedNote): Note {
  return {
    ...note,
    createdAt: note.createdAt ? new Date(note.createdAt) : null,
    updatedAt: note.updatedAt ? new Date(note.updatedAt) : null,
  };
}

async function authHeader(required: boolean): Promise<Record<string, string>> {
  const user = getFirebase()?.auth.currentUser;
  if (!user) {
    if (!required) return {};
    throw new Error("Sign in again to continue.");
  }
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function noteTitle(note: Pick<Note, "lessonName" | "subject">) {
  return note.lessonName || `${note.subject} notes`;
}

export async function listApprovedNotes() {
  const response = await fetch("/api/notes?view=library", { cache: "no-store" });
  const body = await readJson<{ notes?: DatedNote[] }>(response);
  if (!response.ok) throw new Error(body.error || "Could not load notes.");
  return (body.notes ?? []).map(revive);
}

export async function listMyNotes(_uid: string) {
  const response = await fetch("/api/notes?view=mine", { headers: await authHeader(true), cache: "no-store" });
  const body = await readJson<{ notes?: DatedNote[] }>(response);
  if (!response.ok) throw new Error(body.error || "Could not load your notes.");
  return (body.notes ?? []).map(revive);
}

export async function listPendingNotes() {
  const response = await fetch("/api/notes?view=pending", { headers: await authHeader(true), cache: "no-store" });
  const body = await readJson<{ notes?: Array<DatedNote & { uploaderName?: string; uploaderEmail?: string }> }>(response);
  if (!response.ok) throw new Error(body.error || "Could not load the review queue.");
  return (body.notes ?? []).map((note) => ({
    ...revive(note),
    uploaderName: note.uploaderName || "Student",
    uploaderEmail: note.uploaderEmail || "",
  }));
}

export async function getNote(noteId: string) {
  const response = await fetch(`/api/notes/${noteId}`, { headers: await authHeader(false), cache: "no-store" });
  const body = await readJson<{ note?: DatedNote }>(response);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(body.error || "Could not open this note.");
  return body.note ? revive(body.note) : null;
}

function formDataFor(input: NoteInput) {
  const body = new FormData();
  body.set("subject", input.subject);
  body.set("description", input.description);
  body.set("lessonName", input.lessonName);
  body.set("tags", input.tags);
  if (input.file) body.set("file", input.file);
  return body;
}

export async function createNote(_uid: string, input: NoteInput) {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: await authHeader(true),
    body: formDataFor(input),
  });
  const body = await readJson<{ id?: string }>(response);
  if (!response.ok || !body.id) throw new Error(body.error || "Could not upload the note.");
  return body.id;
}

export async function resubmitNote(_uid: string, note: Note, input: NoteInput) {
  const response = await fetch(`/api/notes/${note.id}`, {
    method: "POST",
    headers: await authHeader(true),
    body: formDataFor(input),
  });
  const body = await readJson<Record<string, never>>(response);
  if (!response.ok) throw new Error(body.error || "Could not resubmit the note.");
}

export async function moderateNote(noteId: string, decision: "approved" | "declined", declineReason?: string) {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: "PATCH",
    headers: { ...(await authHeader(true)), "Content-Type": "application/json" },
    body: JSON.stringify({ decision, declineReason }),
  });
  const body = await readJson<Record<string, never>>(response);
  if (!response.ok) throw new Error(body.error || "Could not update the note.");
}
