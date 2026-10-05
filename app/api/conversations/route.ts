import { z } from "zod";
import { auth, check, failure, HttpError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const { db } = await auth(request);
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const conversation = await db
      .from("conversations")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    check(conversation.error);
    if (!conversation.data) throw new HttpError(404, "Conversation not found.");
    const turns = await db
      .from("turns")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    check(turns.error);
    return Response.json(
      {
        messages: (turns.data || []).reverse().flatMap((t) => [
          { id: `${t.id}-q`, role: "user", content: t.question },
          {
            id: t.id,
            role: "assistant",
            content: t.answer,
            citations: t.citations,
          },
        ]),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
