import type { NoteStatus } from "@/lib/types";

const labels: Record<NoteStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  removed: "Removed",
};

const tones: Record<NoteStatus, string> = {
  pending: "bg-gold/10 text-gold",
  approved: "bg-pine/10 text-pine",
  declined: "bg-clay/10 text-clay",
  removed: "bg-ink/5 text-muted",
};

export function StatusBadge({ status }: { status: NoteStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[status]}`}>{labels[status]}</span>;
}
