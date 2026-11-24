import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";

export const metadata: Metadata = {
  title: "Upload",
};

export default function UploadPage() {
  return (
    <div>
      <p className="text-sm font-medium tracking-[0.16em] text-pine uppercase">Students</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Upload a note</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Subject is required. Add a description, an optional lesson name, and tags. The file stays pending until it is
        accepted.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
