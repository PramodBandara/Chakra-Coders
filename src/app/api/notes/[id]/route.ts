import { isStaffRole } from "@/lib/constants";
import { accountFromRequest, canReadNote, jsonError } from "@/lib/note-access";
import { clientNote, moderateStoredNote, readStoredNote, resubmitStoredNote } from "@/lib/note-store";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const note = await readStoredNote(id);
    if (!note) return Response.json({ error: "This note is not in the library." }, { status: 404 });
    const viewer = await accountFromRequest(request, false);
    const access = viewer ? { uid: viewer.account.uid, role: viewer.person.role } : null;
    if (!canReadNote(note, access)) {
      return Response.json({ error: "This note is not public yet." }, { status: 403 });
    }
    return Response.json({ note: clientNote(note) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const viewer = await accountFromRequest(request, true);
    if (!viewer) return Response.json({ error: "Sign in again to continue." }, { status: 401 });
    const { id } = await context.params;
    const note = await resubmitStoredNote(viewer.account, id, await request.formData());
    return Response.json({ note });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const viewer = await accountFromRequest(request, true);
    if (!viewer) return Response.json({ error: "Sign in again to continue." }, { status: 401 });
    if (!isStaffRole(viewer.person.role)) {
      return Response.json({ error: "Only admins and moderators can review notes." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as { decision?: string; declineReason?: string };
    if (body.decision !== "approved" && body.decision !== "declined") {
      return Response.json({ error: "Choose accept or decline." }, { status: 400 });
    }
    const note = await moderateStoredNote(id, body.decision, body.declineReason);
    return Response.json({ note });
  } catch (error) {
    return jsonError(error);
  }
}
