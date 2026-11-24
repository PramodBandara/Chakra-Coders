export type NoteStatus = "pending" | "approved" | "declined" | "removed";

export type NoteFileType = "pdf" | "jpeg" | "png";

export type AppRole = "guest" | "student" | "moderator" | "admin";

export type StaffRole = "moderator" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: Exclude<AppRole, "guest">;
  karma: number;
  createdAt: Date | null;
};

export type Note = {
  id: string;
  uploaderId: string;
  subject: string;
  description: string;
  lessonName: string | null;
  tags: string[];
  status: NoteStatus;
  fileUrl: string;
  fileType: NoteFileType;
  avgRating: number;
  ratingCount: number;
  score: number;
  declineReason: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type NoteDraft = {
  subject: string;
  description: string;
  lessonName: string;
  tags: string;
};
