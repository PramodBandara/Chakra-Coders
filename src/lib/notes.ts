import {
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { MAX_UPLOADS_PER_DAY, PRIOR_SCORE } from "@/lib/constants";
import { requireFirebase } from "@/lib/firebase";
import type { Note, NoteFileType, NoteStatus } from "@/lib/types";
import {
  contentTypeFor,
  noteFileType,
  parseTags,
  safeFileName,
  validateNoteFields,
  validateNoteFile,
} from "@/lib/validation";

export type NoteInput = {
  subject: string;
  description: string;
  lessonName: string;
  tags: string;
  file: File | null;
};

function asDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function asStatus(value: unknown): NoteStatus {
  if (value === "approved" || value === "declined" || value === "removed" || value === "pending") {
    return value;
  }
  return "pending";
}

function asFileType(value: unknown): NoteFileType {
  if (value === "pdf" || value === "jpeg" || value === "png") return value;
  return "pdf";
}

export function mapNote(id: string, data: DocumentData): Note {
  return {
    id,
    uploaderId: String(data.uploaderId ?? ""),
    subject: String(data.subject ?? ""),
    description: String(data.description ?? ""),
    lessonName: typeof data.lessonName === "string" && data.lessonName.length > 0 ? data.lessonName : null,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    status: asStatus(data.status),
    fileUrl: String(data.fileUrl ?? ""),
    fileType: asFileType(data.fileType),
    avgRating: typeof data.avgRating === "number" ? data.avgRating : 0,
    ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
    score: typeof data.score === "number" ? data.score : PRIOR_SCORE,
    declineReason: typeof data.declineReason === "string" ? data.declineReason : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function noteTitle(note: Pick<Note, "lessonName" | "subject">) {
  return note.lessonName || `${note.subject} notes`;
}

async function storeFile(uid: string, noteId: string, file: File) {
  const fileType = noteFileType(file);
  if (!fileType) throw new Error("Only PDF, JPEG, and PNG files are allowed.");
  const firebase = requireFirebase();
  const fileRef = ref(firebase.storage, `notes/${uid}/${noteId}/${safeFileName(file.name, fileType)}`);
  await uploadBytes(fileRef, file, { contentType: contentTypeFor(fileType) });
  const fileUrl = await getDownloadURL(fileRef);
  return { fileUrl, fileType };
}

async function assertDailyUploadLimit(uid: string) {
  const firebase = requireFirebase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snapshot = await getDocs(
    query(
      collection(firebase.db, "notes"),
      where("uploaderId", "==", uid),
      where("createdAt", ">=", Timestamp.fromDate(start)),
    ),
  );
  if (snapshot.size >= MAX_UPLOADS_PER_DAY) {
    throw new Error(`You can upload ${MAX_UPLOADS_PER_DAY} notes per day.`);
  }
}

function preparedFields(input: NoteInput) {
  const error = validateNoteFields(input);
  if (error) throw new Error(error);
  return {
    subject: input.subject.trim(),
    description: input.description.trim(),
    lessonName: input.lessonName.trim() || null,
    tags: parseTags(input.tags),
  };
}

export async function listApprovedNotes() {
  const firebase = requireFirebase();
  const snapshot = await getDocs(
    query(
      collection(firebase.db, "notes"),
      where("status", "==", "approved"),
      orderBy("score", "desc"),
      orderBy("createdAt", "desc"),
      limit(60),
    ),
  );
  return snapshot.docs.map((item) => mapNote(item.id, item.data()));
}

export async function listMyNotes(uid: string) {
  const firebase = requireFirebase();
  const snapshot = await getDocs(
    query(
      collection(firebase.db, "notes"),
      where("uploaderId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
  );
  return snapshot.docs.map((item) => mapNote(item.id, item.data()));
}

export async function listPendingNotes() {
  const firebase = requireFirebase();
  const snapshot = await getDocs(
    query(
      collection(firebase.db, "notes"),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc"),
      limit(50),
    ),
  );
  return snapshot.docs.map((item) => mapNote(item.id, item.data()));
}

export async function getNote(noteId: string) {
  const firebase = requireFirebase();
  const snapshot = await getDoc(doc(firebase.db, "notes", noteId));
  if (!snapshot.exists()) return null;
  return mapNote(snapshot.id, snapshot.data());
}

export async function createNote(uid: string, input: NoteInput) {
  const fileError = validateNoteFile(input.file, true);
  if (fileError) throw new Error(fileError);
  const fields = preparedFields(input);
  await assertDailyUploadLimit(uid);

  const firebase = requireFirebase();
  const noteRef = doc(collection(firebase.db, "notes"));
  const stored = await storeFile(uid, noteRef.id, input.file as File);

  await setDoc(noteRef, {
    uploaderId: uid,
    subject: fields.subject,
    description: fields.description,
    lessonName: fields.lessonName,
    tags: fields.tags,
    status: "pending",
    fileUrl: stored.fileUrl,
    fileType: stored.fileType,
    avgRating: 0,
    ratingCount: 0,
    score: PRIOR_SCORE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return noteRef.id;
}

export async function resubmitNote(uid: string, note: Note, input: NoteInput) {
  if (note.uploaderId !== uid) throw new Error("You can only edit your own notes.");
  if (note.status !== "declined") throw new Error("Only declined notes can be resubmitted.");
  const fileError = validateNoteFile(input.file, false);
  if (fileError) throw new Error(fileError);
  const fields = preparedFields(input);

  let fileUrl = note.fileUrl;
  let fileType = note.fileType;
  if (input.file) {
    const stored = await storeFile(uid, note.id, input.file);
    fileUrl = stored.fileUrl;
    fileType = stored.fileType;
  }

  const firebase = requireFirebase();
  await updateDoc(doc(firebase.db, "notes", note.id), {
    subject: fields.subject,
    description: fields.description,
    lessonName: fields.lessonName,
    tags: fields.tags,
    status: "pending",
    fileUrl,
    fileType,
    declineReason: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function moderateNote(
  noteId: string,
  decision: "approved" | "declined",
  declineReason?: string,
) {
  const firebase = requireFirebase();
  if (decision === "declined") {
    const reason = declineReason?.trim() ?? "";
    if (!reason) throw new Error("Add a reason before declining.");
    if (reason.length > 300) throw new Error("Keep the decline reason under 300 characters.");
    await updateDoc(doc(firebase.db, "notes", noteId), {
      status: "declined",
      declineReason: reason,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(firebase.db, "notes", noteId), {
    status: "approved",
    updatedAt: serverTimestamp(),
  });
}
