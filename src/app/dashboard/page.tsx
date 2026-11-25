import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <p className="text-sm font-medium tracking-[0.16em] text-pine uppercase">Your desk</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Dashboard</h1>
      <div className="mt-8">
        <Dashboard />
      </div>
    </div>
  );
}
