import { z } from "zod";
import { auth, check, failure, HttpError, limited } from "@/lib/server";
import { embed, embeddingModel } from "@/lib/gemini";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await auth(request, true);
    const id = z.uuid().parse((await params).id);
    await limited(db, "embed");
    const doc = await db
      .from("documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(doc.error);
    if (!doc.data) throw new HttpError(404, "Document not found.");
    if (doc.data.status === "ready") return Response.json({ done: true });
    if (doc.data.embedding_model !== embeddingModel())
      throw new HttpError(
        409,
        "The embedding model has changed. Remove and upload this document again to rebuild it.",
      );
    try {
      check(
        (
          await db
            .from("documents")
            .update({ status: "processing", error: null })
            .eq("id", id)
        ).error,
      );
      const pending = await db
        .from("chunks")
        .select("id,content")
        .eq("document_id", id)
        .is("embedding", null)
        .order("ordinal")
        .limit(2);
      check(pending.error);
      await Promise.all(
        (pending.data || []).map(async (c) => {
          const vector = await embed(c.content, false, doc.data.name);
          check(
            (
              await db
                .from("chunks")
                .update({ embedding: JSON.stringify(vector) })
                .eq("id", c.id)
                .is("embedding", null)
            ).error,
          );
        }),
      );
      const remaining = await db
        .from("chunks")
        .select("id", { count: "exact", head: true })
        .eq("document_id", id)
        .is("embedding", null);
      check(remaining.error);
      const done = remaining.count === 0;
      if (done)
        check(
          (
            await db
              .from("documents")
              .update({ status: "ready", error: null })
              .eq("id", id)
          ).error,
        );
      return Response.json({ done, remaining: remaining.count });
    } catch (e) {
      await db
        .from("documents")
        .update({
          status: "failed",
          error:
            e instanceof HttpError
              ? e.message
              : "Processing failed. Resume to retry remaining passages.",
        })
        .eq("id", id);
      throw e;
    }
  } catch (e) {
    return failure(e);
  }
}
