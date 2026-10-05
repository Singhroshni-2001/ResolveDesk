import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import {publicSupabaseSettings} from './config';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function auth(request: Request, agent = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const settings=publicSupabaseSettings(url,key);
  if (!settings)
    throw new HttpError(
      503,
      "Live mode is not configured yet. You can still explore the demo.",
    );
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Please sign in to continue.");
  const db = createClient(settings.url, settings.key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profileError)
    throw new HttpError(
      503,
      "Workspace setup is incomplete. Apply the database migration.",
    );
  if (agent && !["agent", "admin"].includes(profile.role))
    throw new HttpError(403, "An agent role is required for this action.");
  return { db, user: data.user, role: profile.role as string };
}
export async function limited(
  db: Awaited<ReturnType<typeof auth>>["db"],
  action: string,
) {
  const { data, error } = await db.rpc("take_request", { action_name: action });
  if (error)
    throw new HttpError(
      503,
      "Request protection is unavailable. Try again later.",
    );
  if (!data)
    throw new HttpError(
      429,
      "This workspace’s request limit has been reached. Please try again next hour. Existing tickets remain available.",
    );
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 20000)
    throw new HttpError(413, "The request is too large.");
  const text = await request.text();
  if (text.length > 20000)
    throw new HttpError(413, "The request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Please send a valid request.");
  }
}
export function failure(e: unknown) {
  if (e instanceof ZodError)
    return Response.json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(
    "ResolveDesk request failed",
    e instanceof Error ? e.name : "DatabaseError",
  );
  return Response.json(
    {
      error:
        "We couldn’t complete that request. Your existing data is safe; please try again.",
    },
    { status: 500 },
  );
}
export function check(error: unknown) {
  if (error)
    throw new HttpError(
      500,
      "The database request failed. Please retry or check the database setup.",
    );
}
