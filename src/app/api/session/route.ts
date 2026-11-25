import { bearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { syncAccount } from "@/lib/directory";

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in again to continue." }, { status: 401 });

  try {
    const account = await verifyFirebaseToken(token);
    const person = await syncAccount(account);
    return Response.json({ person });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open this account.";
    return Response.json({ error: message }, { status: 400 });
  }
}
