"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";
import { isStaffRole } from "@/lib/constants";

const links = [
  { href: "/", label: "Library" },
  { href: "/upload", label: "Upload", signedIn: true },
  { href: "/dashboard", label: "Dashboard", signedIn: true },
  { href: "/admin", label: "Review", staff: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { configured, loading, user, role, signOut } = useAuth();
  const signedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-pine font-serif text-sm text-paper">AL</span>
          <span className="font-serif text-xl tracking-tight">Notes</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Primary">
          {links
            .filter((link) => {
              if (link.staff) return isStaffRole(role);
              if (link.signedIn) return signedIn;
              return true;
            })
            .map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-ink text-paper" : "text-ink/80 hover:bg-white"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-3">
          {!configured ? (
            <span className="text-sm text-muted">Google sign-in not configured</span>
          ) : loading ? (
            <span className="text-sm text-muted">Checking session…</span>
          ) : signedIn ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">
                {role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Student"}
              </span>
              <button type="button" className="btn btn-quiet h-9" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <SignInButton className="btn btn-primary h-9" />
          )}
        </div>
      </div>
    </header>
  );
}
