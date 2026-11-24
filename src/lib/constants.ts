export const PRIOR_SCORE = 3.5;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const MAX_UPLOADS_PER_DAY = 5;

export const MAX_DESCRIPTION_LENGTH = 1000;

export const MAX_LESSON_NAME_LENGTH = 120;

export const MAX_TAGS = 8;

export const SUBJECTS = [
  "Combined Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Accounting",
  "Business Studies",
  "Economics",
  "Business Statistics",
  "Information and Communication Technology",
  "Engineering Technology",
  "Science for Technology",
  "Biosystems Technology",
  "Geography",
  "Political Science",
  "History",
  "Logic and Scientific Method",
  "Media and Communication Studies",
  "Home Economics",
  "Art",
  "Sinhala",
  "Tamil",
  "English",
  "General English",
  "Buddhism",
  "Christianity",
  "Islam",
  "Hinduism",
] as const;

export const DECLINE_REASONS = [
  "Blurry or unreadable",
  "Wrong subject",
  "Copyright concern",
  "Incomplete",
  "Not a study note",
] as const;

export function isStaffRole(role: string | null | undefined): role is "admin" | "moderator" {
  return role === "admin" || role === "moderator";
}
