import Link from "next/link";
import { noteTitle } from "@/lib/notes";
import type { Note } from "@/lib/types";

export function NoteCard({ note }: { note: Note }) {
  const title = noteTitle(note);

  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-card p-5 shadow-[0_1px_0_rgba(28,23,18,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-pine uppercase">{note.subject}</p>
        <p className="text-xs text-muted uppercase">{note.fileType}</p>
      </div>
      <h2 className="mt-3 font-serif text-2xl leading-tight text-ink">
        <Link href={`/notes/${note.id}`} className="hover:text-pine">
          {title}
        </Link>
      </h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/75">{note.description}</p>
      {note.tags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p className="text-xs text-muted">
          {note.createdAt
            ? note.createdAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
            : "Undated"}
        </p>
        {note.fileUrl ? (
          <a className="text-sm font-medium text-pine hover:text-pine-dark" href={note.fileUrl} target="_blank" rel="noreferrer">
            Open file
          </a>
        ) : null}
      </div>
    </article>
  );
}
