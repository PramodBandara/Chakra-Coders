import type { Metadata } from "next";
import { AdminQueue } from "@/components/admin-queue";
import { ModeratorAccess } from "@/components/moderator-access";

export const metadata: Metadata = {
  title: "Review",
};

export default function AdminPage() {
  return (
    <div>
      <p className="text-sm font-medium tracking-[0.16em] text-pine uppercase">Moderation</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Review queue</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Accept a note to publish it. Decline with a reason so the student can edit and resubmit.
      </p>
      <div className="mt-8 grid gap-8">
        <ModeratorAccess />
        <AdminQueue />
      </div>
    </div>
  );
}
