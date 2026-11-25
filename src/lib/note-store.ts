import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { MAX_UPLOADS_PER_DAY, PRIOR_SCORE } from "@/lib/constants";
import { listPeople } from "@/lib/directory";
import type { VerifiedAccount } from "@/lib/firebase-token";
import type { Note, NoteFileType, NoteStatus } from "@/lib/types";
import {
  contentTypeFor,
  noteFileType,
  parseTags,
  safeFileName,
  validateNoteFields,
  validateNoteFile,
} from "@/lib/validation";

type StoredNote = {
  id: string;
  uploaderId: string;
  subject: string;
  description: string;
  lessonName: string | null;
  tags: string[];
  status: NoteStatus;
  filePath: string;
  fileType: NoteFileType;
  avgRating: number;
  ratingCount: number;
  score: number;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const BUCKET = "note-files";
const INDEX = "notes.json";

let ready: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured on the server.");
  return { url, key };
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseConfig();
  return fetch(`${url}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function ensureBucket() {
  ready ??= (async () => {
    const existing = await storageFetch(`bucket/${BUCKET}`);
    if (existing.ok) return;
    const created = await storageFetch("bucket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: BUCKET, public: false }),
    });
    if (created.ok || created.status === 409) return;
    const check = await storageFetch(`bucket/${BUCKET}`);
    if (!check.ok) throw new Error("Could not prepare note storage.");
  })().catch((error) => {
    ready = null;
    throw error;
  });
  await ready;
}

async function readNotes() {
  await ensureBucket();
  const response = await storageFetch(`object/${BUCKET}/${INDEX}`);
  if (response.status === 400 || response.status === 404) return [] as StoredNote[];
  if (!response.ok) throw new Error("Could not read notes.");
  const notes = (await response.json()) as StoredNote[];
  return Array.isArray(notes) ? notes : [];
}

async function writeNotes(notes: StoredNote[]) {
  await ensureBucket();
  const response = await storageFetch(`object/${BUCKET}/${INDEX}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(notes),
  });
  if (!response.ok) throw new Error("Could not save the note.");
}

function locked<T>(task: () => Promise<T>) {
  const run = writeChain.then(task, task);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function fileAccessSecret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Supabase is not configured on the server.");
  return key;
}

export function fileAccessUrl(noteId: string) {
  const expires = Date.now() + 6 * 60 * 60 * 1000;
  const payload = `${noteId}.${expires}`;
  const signature = createHmac("sha256", fileAccessSecret()).update(payload).digest("base64url");
  return `/api/notes/${noteId}/file?access=${expires}.${signature}`;
}

export function fileAccessValid(noteId: string, access: string | null) {
  if (!access) return false;
  const splitAt = access.indexOf(".");
  if (splitAt <= 0) return false;
  const expires = Number(access.slice(0, splitAt));
  const signature = access.slice(splitAt + 1);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  const expected = createHmac("sha256", fileAccessSecret()).update(`${noteId}.${expires}`).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export function clientNote(note: StoredNote): Note {
  return {
    id: note.id,
    uploaderId: note.uploaderId,
    subject: note.subject,
    description: note.description,
    lessonName: note.lessonName,
    tags: note.tags,
    status: note.status,
    fileUrl: note.status === "approved" ? `/api/notes/${note.id}/file` : fileAccessUrl(note.id),
    fileType: note.fileType,
    avgRating: note.avgRating,
    ratingCount: note.ratingCount,
    score: note.score,
    declineReason: note.declineReason,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt),
  };
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function listStoredNotes(view: "library" | "mine" | "pending", uid?: string) {
  const notes = await readNotes();
  const visible = notes.filter((note) => {
    if (view === "library") return note.status === "approved";
    if (view === "mine") return note.uploaderId === uid;
    return note.status === "pending";
  });
  visible.sort((a, b) => {
    if (view === "library") return b.score - a.score || b.createdAt.localeCompare(a.createdAt);
    if (view === "pending") return a.createdAt.localeCompare(b.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  const selected = visible.slice(0, view === "library" ? 60 : 50);
  if (view !== "pending") return selected.map(clientNote);
  const people = await listPeople().catch(() => []);
  return selected.map((note) => {
    const person = people.find((item) => item.id === note.uploaderId);
    return {
      ...clientNote(note),
      uploaderName: person?.name || "Student",
      uploaderEmail: person?.email || "",
    };
  });
}

export async function readStoredNote(id: string) {
  const notes = await readNotes();
  return notes.find((note) => note.id === id) ?? null;
}

async function saveFile(uid: string, noteId: string, file: File) {
  const fileType = noteFileType(file);
  if (!fileType) throw new Error("Only PDF, JPEG, and PNG files are allowed.");
  const filePath = `${uid}/${noteId}/${safeFileName(file.name, fileType)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const response = await storageFetch(`object/${BUCKET}/${filePath}`, {
    method: "POST",
    headers: {
      "Content-Type": contentTypeFor(fileType),
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) throw new Error("Could not store the file.");
  return { filePath, fileType };
}

export async function createStoredNote(account: VerifiedAccount, input: FormData) {
  const file = input.get("file");
  const fields = {
    subject: String(input.get("subject") ?? ""),
    description: String(input.get("description") ?? ""),
    lessonName: String(input.get("lessonName") ?? ""),
  };
  const fieldError = validateNoteFields(fields);
  if (fieldError) throw new Error(fieldError);
  if (!(file instanceof File)) throw new Error("Choose a PDF, JPEG, or PNG file.");
  const fileError = validateNoteFile(file, true);
  if (fileError) throw new Error(fileError);

  return locked(async () => {
    const notes = await readNotes();
    const start = startOfToday();
    const uploadedToday = notes.filter((note) => note.uploaderId === account.uid && new Date(note.createdAt) >= start).length;
    if (uploadedToday >= MAX_UPLOADS_PER_DAY) {
      throw new Error(`You can upload ${MAX_UPLOADS_PER_DAY} notes per day.`);
    }
    const id = randomUUID();
    const stored = await saveFile(account.uid, id, file);
    const now = new Date().toISOString();
    const note: StoredNote = {
      id,
      uploaderId: account.uid,
      subject: fields.subject.trim(),
      description: fields.description.trim(),
      lessonName: fields.lessonName.trim() || null,
      tags: parseTags(String(input.get("tags") ?? "")),
      status: "pending",
      filePath: stored.filePath,
      fileType: stored.fileType,
      avgRating: 0,
      ratingCount: 0,
      score: PRIOR_SCORE,
      declineReason: null,
      createdAt: now,
      updatedAt: now,
    };
    notes.push(note);
    await writeNotes(notes);
    return clientNote(note);
  });
}

export async function resubmitStoredNote(account: VerifiedAccount, noteId: string, input: FormData) {
  const fields = {
    subject: String(input.get("subject") ?? ""),
    description: String(input.get("description") ?? ""),
    lessonName: String(input.get("lessonName") ?? ""),
  };
  const fieldError = validateNoteFields(fields);
  if (fieldError) throw new Error(fieldError);
  const file = input.get("file");
  const replacement = file instanceof File && file.size > 0 ? file : null;
  const fileError = validateNoteFile(replacement, false);
  if (fileError) throw new Error(fileError);

  return locked(async () => {
    const notes = await readNotes();
    const note = notes.find((item) => item.id === noteId);
    if (!note) throw new Error("This note is not in the library.");
    if (note.uploaderId !== account.uid) throw new Error("You can only edit your own notes.");
    if (note.status !== "declined") throw new Error("Only declined notes can be resubmitted.");
    if (replacement) {
      const stored = await saveFile(account.uid, note.id, replacement);
      note.filePath = stored.filePath;
      note.fileType = stored.fileType;
    }
    note.subject = fields.subject.trim();
    note.description = fields.description.trim();
    note.lessonName = fields.lessonName.trim() || null;
    note.tags = parseTags(String(input.get("tags") ?? ""));
    note.status = "pending";
    note.declineReason = null;
    note.updatedAt = new Date().toISOString();
    await writeNotes(notes);
    return clientNote(note);
  });
}

export async function moderateStoredNote(noteId: string, decision: "approved" | "declined", declineReason?: string) {
  return locked(async () => {
    const notes = await readNotes();
    const note = notes.find((item) => item.id === noteId);
    if (!note) throw new Error("This note is not in the review queue.");
    if (decision === "declined") {
      const reason = declineReason?.trim() ?? "";
      if (!reason) throw new Error("Add a reason before declining.");
      if (reason.length > 300) throw new Error("Keep the decline reason under 300 characters.");
      note.status = "declined";
      note.declineReason = reason;
    } else {
      note.status = "approved";
      note.declineReason = null;
    }
    note.updatedAt = new Date().toISOString();
    await writeNotes(notes);
    return clientNote(note);
  });
}

export async function readNoteFile(note: StoredNote) {
  const response = await storageFetch(`object/${BUCKET}/${note.filePath}`);
  if (!response.ok || !response.body) throw new Error("The file is not available.");
  return new Response(response.body, {
    headers: {
      "Content-Type": contentTypeFor(note.fileType),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
