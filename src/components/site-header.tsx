"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";
import { isStaffRole } from "@/lib/constants";

const links = [
  { href: "/", label: "Library", mark: "L" },
  { href: "/upload", label: "Upload", mark: "U", signedIn: true },
  { href: "/dashboard", label: "Dashboard", mark: "D", signedIn: true },
  { href: "/admin", label: "Review", mark: "R", staff: true },
];

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "Student";
}

export function SiteHeader() {
  const pathname = usePathname();
  const { configured, loading, user, role, signOut } = useAuth();
  const signedIn = Boolean(user);
  const visible = links.filter((link) => {
    if (link.staff) return isStaffRole(role);
    if (link.signedIn) return signedIn;
    return true;
  });

  function account(wide: boolean) {
    if (!configured) return <span className="text-xs text-muted">Sign-in not configured</span>;
    if (loading) return <span className={`text-xs text-muted ${wide ? "hidden lg:inline" : ""}`}>Checking session…</span>;
    if (signedIn) {
      return (
        <div className={`flex items-center gap-2 ${wide ? "w-full" : ""}`}>
          <span className={`${wide ? "hidden lg:inline" : "hidden sm:inline"} text-xs text-muted`}>{roleLabel(role)}</span>
          <button type="button" className={`btn btn-quiet ${wide ? "w-full lg:w-auto" : ""}`} onClick={() => void signOut()}>
            {wide ? (
              <>
                <span className="lg:hidden">Out</span>
                <span className="hidden lg:inline">Sign out</span>
              </>
            ) : (
              "Sign out"
            )}
          </button>
        </div>
      );
    }
    return <SignInButton className={`btn btn-primary ${wide ? "w-full" : ""}`} label="Sign in" />;
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-[#f7f7f5] md:flex md:w-[4.75rem] lg:w-60">
        <Link href="/" className="flex items-center gap-2 px-3 py-4 text-ink lg:px-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-xs font-semibold text-white">N</span>
          <span className="hidden text-sm font-semibold lg:inline">AL Notes</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Primary">
          {visible.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm lg:justify-start lg:px-2 ${
                  active ? "bg-white font-medium text-ink shadow-sm" : "text-ink/80 hover:bg-white/80"
                }`}
              >
                <span className="grid h-6 w-6 place-items-center rounded text-xs text-muted">{link.mark}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">{account(true)}</div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-xs font-semibold text-white">N</span>
          <span className="text-sm font-semibold">AL Notes</span>
        </Link>
        {account(false)}
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
        aria-label="Primary"
      >
        {visible.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-[11px] ${active ? "font-medium text-ink" : "text-muted"}`}
            >
              <span className={`grid h-6 w-6 place-items-center rounded ${active ? "bg-[#f1f1ef]" : ""}`}>{link.mark}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
