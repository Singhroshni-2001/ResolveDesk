import { z } from "zod";
import { replyInput } from "@/lib/domain";
import { auth, body, check, failure, limited, HttpError } from "@/lib/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await auth(request);
    const ticket_id = z.uuid().parse((await params).id);
    const input = replyInput.parse(await body(request));
    const ticket = await db
      .from("tickets")
      .select("id")
      .eq("id", ticket_id)
      .maybeSingle();
    check(ticket.error);
    if (!ticket.data) throw new HttpError(404, "Ticket not found.");
    const old = await db
      .from("replies")
      .select("*")
      .eq("id", input.id)
      .eq("ticket_id", ticket_id)
      .maybeSingle();
    check(old.error);
    if (old.data) return Response.json({ reply: old.data });
    await limited(db, "reply");
    const result = await db
      .from("replies")
      .insert({ ...input, ticket_id })
      .select()
      .single();
    if (result.error?.code === "23505") {
      const retry = await db
        .from("replies")
        .select("*")
        .eq("id", input.id)
        .eq("ticket_id", ticket_id)
        .maybeSingle();
      if (retry.data) return Response.json({ reply: retry.data });
    }
    check(result.error);
    return Response.json({ reply: result.data }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
