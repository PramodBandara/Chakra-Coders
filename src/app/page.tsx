import type { Metadata } from "next";
import { NoteLibrary } from "@/components/note-library";

export const metadata: Metadata = {
  title: "Library",
};

export default function HomePage() {
  return (
    <div>
      <p className="text-sm font-medium tracking-[0.16em] text-pine uppercase">Advanced Level</p>
      <h1 className="mt-2 max-w-2xl font-serif text-4xl tracking-tight text-ink sm:text-5xl">
        Notes worth keeping.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        Guests can read approved notes. Students sign in with Google to upload. An admin or moderator checks each file
        before it joins the library.
      </p>
      <div className="mt-8">
        <NoteLibrary />
      </div>
    </div>
  );
}
