export type VerifiedAccount = {
  uid: string;
  email: string;
  name: string;
};

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedAccount> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase is not configured.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  const body = (await response.json()) as {
    users?: { localId?: string; email?: string; displayName?: string }[];
    error?: { message?: string };
  };
  const user = body.users?.[0];
  if (!response.ok || !user?.localId || !user.email) {
    throw new Error("Sign in again to continue.");
  }

  const email = user.email.trim().toLowerCase();
  const name = (user.displayName?.trim() || email.split("@")[0] || "Student").slice(0, 80);
  return { uid: user.localId, email, name };
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}
