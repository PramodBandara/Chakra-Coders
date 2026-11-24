import {
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_BYTES,
  MAX_LESSON_NAME_LENGTH,
  MAX_TAGS,
  SUBJECTS,
} from "@/lib/constants";
import type { NoteFileType } from "@/lib/types";

const SUBJECT_SET = new Set<string>(SUBJECTS);

export function parseTags(input: string) {
  const tags = input
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter((tag) => tag.length > 0 && tag.length <= 24);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

export function noteFileType(file: File): NoteFileType | null {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "jpeg";
  if (file.type === "image/png") return "png";
  return null;
}

export function contentTypeFor(fileType: NoteFileType) {
  if (fileType === "pdf") return "application/pdf";
  if (fileType === "png") return "image/png";
  return "image/jpeg";
}

export function extensionFor(fileType: NoteFileType) {
  if (fileType === "pdf") return "pdf";
  if (fileType === "png") return "png";
  return "jpg";
}

export function safeFileName(name: string, fileType: NoteFileType) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "note"}.${extensionFor(fileType)}`;
}

export function validateNoteFields(input: {
  subject: string;
  description: string;
  lessonName: string;
}) {
  const subject = input.subject.trim();
  const description = input.description.trim();
  const lessonName = input.lessonName.trim();

  if (!SUBJECT_SET.has(subject)) return "Choose a subject.";
  if (!description) return "Add a short description.";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }
  if (lessonName.length > MAX_LESSON_NAME_LENGTH) {
    return `Lesson name must be ${MAX_LESSON_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateNoteFile(file: File | null, required: boolean) {
  if (!file) return required ? "Choose a PDF, JPEG, or PNG file." : null;
  if (!noteFileType(file)) return "Only PDF, JPEG, and PNG files are allowed.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 10 MB or smaller.";
  if (file.size <= 0) return "That file is empty.";
  return null;
}
