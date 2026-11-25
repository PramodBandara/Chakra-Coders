import { ADMIN_EMAIL, isAdministratorEmail, normalizeEmail, type AccountRole, type DirectoryPerson } from "@/lib/access";
import type { VerifiedAccount } from "@/lib/firebase-token";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
};

let ready: Promise<"table" | "storage"> | null = null;

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Add the Supabase URL and server key to .env.local, then restart the dev server.");
  }
  return { url, key };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as { message?: string; code?: string }) : null;
  if (!response.ok) {
    const message = typeof body?.message === "string" ? body.message : "Supabase request failed.";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = typeof body?.code === "string" ? body.code : undefined;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

function missingTable(error: unknown) {
  const coded = error as { code?: string; status?: number; message?: string };
  return coded.code === "PGRST205" || coded.status === 404 || /schema cache|does not exist/i.test(coded.message ?? "");
}

const BUCKET = "account-access";
const FILE = "profiles.json";

async function storageFetch(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseConfig();
  return fetch(`${url}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function ensureBucket() {
  const existing = await storageFetch(`bucket/${BUCKET}`);
  if (existing.ok) return;
  const response = await storageFetch("bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: BUCKET, public: false }),
  });
  if (response.ok || response.status === 409) return;
  const created = await storageFetch(`bucket/${BUCKET}`);
  if (created.ok) return;
  throw new Error("Could not prepare the Supabase account store.");
}

async function readStoredRows() {
  const response = await storageFetch(`object/${BUCKET}/${FILE}`);
  if (response.status === 400 || response.status === 404) return [];
  if (!response.ok) throw new Error("Could not read accounts from Supabase.");
  const rows = (await response.json()) as ProfileRow[];
  return Array.isArray(rows) ? rows : [];
}

async function writeStoredRows(rows: ProfileRow[]) {
  const response = await storageFetch(`object/${BUCKET}/${FILE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error("Could not save accounts in Supabase.");
}

async function ensureStore() {
  ready ??= (async () => {
    try {
      await rest<ProfileRow[]>("profiles?select=id&limit=1");
      return "table" as const;
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new Error("Supabase rejected the server key. Restart the dev server after saving .env.local.");
      }
      if (!missingTable(error)) throw error;
      await ensureBucket();
      await readStoredRows();
      return "storage" as const;
    }
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function findByEmail(email: string) {
  const mode = await ensureStore();
  if (mode === "table") {
    const rows = await rest<ProfileRow[]>(
      `profiles?email=eq.${encodeURIComponent(email)}&select=id,email,name,role&limit=1`,
    );
    return rows[0] ?? null;
  }
  const rows = await readStoredRows();
  return rows.find((row) => row.email === email) ?? null;
}

async function saveRow(row: ProfileRow) {
  const mode = await ensureStore();
  if (mode === "table") {
    const existing = await findByEmail(row.email);
    const saved = existing
      ? (
          await rest<ProfileRow[]>(`profiles?email=eq.${encodeURIComponent(row.email)}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({ id: row.id, name: row.name, role: row.role }),
          })
        )[0]
      : (
          await rest<ProfileRow[]>("profiles", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(row),
          })
        )[0];
    return saved;
  }
  const rows = await readStoredRows();
  const next = rows.filter((item) => item.email !== row.email);
  next.push(row);
  next.sort((a, b) => a.email.localeCompare(b.email));
  await writeStoredRows(next);
  return row;
}

function personFromRow(row: ProfileRow): DirectoryPerson {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    signedIn: !row.id.startsWith("email:"),
  };
}

export async function syncAccount(account: VerifiedAccount): Promise<DirectoryPerson> {
  const existing = await findByEmail(account.email);
  const role: AccountRole = isAdministratorEmail(account.email) ? "admin" : (existing?.role ?? "student");
  const saved = await saveRow({
    id: account.uid,
    email: account.email,
    name: account.name,
    role,
  });
  return personFromRow(saved);
}

export async function listPeople(): Promise<DirectoryPerson[]> {
  const mode = await ensureStore();
  const rows =
    mode === "table"
      ? await rest<ProfileRow[]>("profiles?select=id,email,name,role&order=email.asc")
      : await readStoredRows();
  return rows.map(personFromRow).sort((a, b) => a.email.localeCompare(b.email));
}

export async function setModeratorAccess(email: string, role: "student" | "moderator"): Promise<DirectoryPerson> {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter the person's Google email address.");
  }
  if (normalized === ADMIN_EMAIL) {
    throw new Error("The administrator account keeps administrator access.");
  }
  const existing = await findByEmail(normalized);
  if (existing?.role === "admin") {
    throw new Error("The administrator account keeps administrator access.");
  }
  const saved = await saveRow({
    id: existing?.id ?? `email:${normalized}`,
    email: normalized,
    name: existing?.name || normalized.split("@")[0] || "Student",
    role,
  });
  return personFromRow(saved);
}
