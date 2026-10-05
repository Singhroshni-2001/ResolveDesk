import { auth, body, check, failure, limited, HttpError } from "@/lib/server";
import { ticketInput } from "@/lib/domain";
export async function POST(request: Request) {
  try {
    const { db } = await auth(request);
    const input = ticketInput.parse(await body(request));
    const existing = await db
      .from("tickets")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    check(existing.error);
    if (existing.data) return Response.json({ ticket: existing.data });
    await limited(db, "ticket");
    const result = await db.from("tickets").insert(input).select().single();
    if (result.error?.code === "23505") {
      const retry = await db
        .from("tickets")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();
      if (retry.data) return Response.json({ ticket: retry.data });
      throw new HttpError(
        409,
        "This request ID has already been used. Start a new ticket.",
      );
    }
    check(result.error);
    return Response.json({ ticket: result.data }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
