"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { formatFirebaseError } from "@/lib/errors";

export function SignInButton({
  label = "Sign in with Google",
  className = "btn btn-primary",
}: {
  label?: string;
  className?: string;
}) {
  const { signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void signInWithGoogle()
            .catch((signInError: unknown) => setError(formatFirebaseError(signInError)))
            .finally(() => setPending(false));
        }}
      >
        {pending ? "Opening Google…" : label}
      </button>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </div>
  );
}
