import { z } from "zod";
import { auth, check, failure, HttpError } from "@/lib/server";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await auth(request, true);
    const id = z.uuid().parse((await params).id);
    const doc = await db
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    check(doc.error);
    if (!doc.data) throw new HttpError(404, "Document not found.");
    check(
      (await db.storage.from("knowledge").remove([doc.data.storage_path]))
        .error,
    );
    check((await db.from("documents").delete().eq("id", id)).error);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
