import { accountFromRequest, jsonError } from "@/lib/note-access";
import { createStoredNote, listStoredNotes } from "@/lib/note-store";

export async function GET(request: Request) {
  try {
    const view = new URL(request.url).searchParams.get("view");
    if (view === "library") {
      const notes = await listStoredNotes("library");
      return Response.json({ notes });
    }
    const viewer = await accountFromRequest(request, true);
    if (!viewer) return Response.json({ error: "Sign in again to continue." }, { status: 401 });
    if (view === "mine") {
      const notes = await listStoredNotes("mine", viewer.account.uid);
      return Response.json({ notes });
    }
    if (view === "pending") {
      if (viewer.person.role !== "admin" && viewer.person.role !== "moderator") {
        return Response.json({ error: "Only admins and moderators can review notes." }, { status: 403 });
      }
      const notes = await listStoredNotes("pending");
      return Response.json({ notes });
    }
    return Response.json({ error: "Unknown note list." }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await accountFromRequest(request, true);
    if (!viewer) return Response.json({ error: "Sign in again to continue." }, { status: 401 });
    const note = await createStoredNote(viewer.account, await request.formData());
    return Response.json({ id: note.id, note });
  } catch (error) {
    return jsonError(error);
  }
}
