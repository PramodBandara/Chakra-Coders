import { accountFromRequest, canReadNote, jsonError } from "@/lib/note-access";
import { fileAccessValid, readNoteFile, readStoredNote } from "@/lib/note-store";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const note = await readStoredNote(id);
    if (!note) return Response.json({ error: "This note is not in the library." }, { status: 404 });
    const viewer = await accountFromRequest(request, false);
    const access = viewer ? { uid: viewer.account.uid, role: viewer.person.role } : null;
    const link = new URL(request.url).searchParams.get("access");
    if (!fileAccessValid(id, link) && !canReadNote(note, access)) {
      return Response.json({ error: "This note is not public yet." }, { status: 403 });
    }
    return readNoteFile(note);
  } catch (error) {
    return jsonError(error);
  }
}
