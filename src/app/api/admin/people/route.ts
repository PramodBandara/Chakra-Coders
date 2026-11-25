import { listPeople, setModeratorAccess, syncAccount } from "@/lib/directory";
import { bearerToken, verifyFirebaseToken } from "@/lib/firebase-token";

async function requireAdmin(request: Request) {
  const token = bearerToken(request);
  if (!token) return { error: Response.json({ error: "Sign in again to continue." }, { status: 401 }) };
  const account = await verifyFirebaseToken(token);
  const person = await syncAccount(account);
  if (person.role !== "admin") {
    return { error: Response.json({ error: "Only the administrator can change moderator access." }, { status: 403 }) };
  }
  return { person };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const people = await listPeople();
    return Response.json({ people });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load people.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const body = (await request.json()) as { email?: string; role?: string };
    if (body.role !== "moderator" && body.role !== "student") {
      return Response.json({ error: "Choose moderator or student." }, { status: 400 });
    }
    const person = await setModeratorAccess(body.email ?? "", body.role);
    return Response.json({ person });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update access.";
    return Response.json({ error: message }, { status: 400 });
  }
}
