import { isStaffRole } from "@/lib/constants";
import { syncAccount } from "@/lib/directory";
import { bearerToken, verifyFirebaseToken } from "@/lib/firebase-token";

export async function accountFromRequest(request: Request, required: boolean) {
  const token = bearerToken(request);
  if (!token) {
    if (!required) return null;
    const error = new Error("Sign in again to continue.") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  const account = await verifyFirebaseToken(token);
  const person = await syncAccount(account);
  return { account, person };
}

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = (error as { status?: number }).status ?? 400;
  return Response.json({ error: message }, { status });
}

export function canReadNote(
  note: { status: string; uploaderId: string },
  viewer: { uid: string; role: string } | null,
) {
  if (note.status === "approved") return true;
  if (!viewer) return false;
  return viewer.uid === note.uploaderId || isStaffRole(viewer.role);
}
