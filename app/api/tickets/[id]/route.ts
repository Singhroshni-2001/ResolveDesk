import { z } from "zod";
import { statuses } from "@/lib/domain";
import { auth, body, check, failure, HttpError } from "@/lib/server";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await auth(request, true);
    const id = z.uuid().parse((await params).id);
    const input = z
      .object({ status: z.enum(statuses) })
      .parse(await body(request));
    const result = await db
      .from("tickets")
      .update(input)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(result.error);
    if (!result.data) throw new HttpError(404, "Ticket not found.");
    return Response.json({ ticket: result.data });
  } catch (e) {
    return failure(e);
  }
}
