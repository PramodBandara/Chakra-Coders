import { Suspense } from "react";
import type { Metadata } from "next";
import { NoteDetail } from "@/components/note-detail";

export const metadata: Metadata = {
  title: "Note",
};

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading note…</p>}>
      <NoteParams params={params} />
    </Suspense>
  );
}

async function NoteParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteDetail id={id} />;
}
