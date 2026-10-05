import { createHash } from "crypto";
import { auth, check, failure, HttpError, limited } from "@/lib/server";
import { DocumentError, extractDocument } from "@/lib/extract";
import { embeddingModel } from "@/lib/gemini";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { db, user } = await auth(request, true);
    if (Number(request.headers.get("content-length") || 0) > 1100000)
      throw new HttpError(413, "Please upload a file up to 1 MB.");
    await limited(db, "upload");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new HttpError(400, "Choose a document to upload.");
    const { chunks, bytes, mime } = await extractDocument(file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const existing = await db
      .from("documents")
      .select("id")
      .eq("content_hash", hash)
      .maybeSingle();
    check(existing.error);
    if (existing.data) return Response.json({ id: existing.data.id });
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${file.name.split(".").pop()?.toLowerCase()}`;
    const upload = await db.storage
      .from("knowledge")
      .upload(path, bytes, { contentType: mime, upsert: false });
    check(upload.error);
    const result = await db.rpc("register_document", {
      doc_id: id,
      doc_name: file.name.slice(0, 150),
      path,
      hash,
      model: embeddingModel(),
      passages: chunks,
    });
    if (result.error) {
      await db.storage.from("knowledge").remove([path]);
      if (result.error.code === "23505") {
        const duplicate = await db
          .from("documents")
          .select("id")
          .eq("content_hash", hash)
          .maybeSingle();
        if (duplicate.data) return Response.json({ id: duplicate.data.id });
      }
      check(result.error);
    }
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return failure(
      e instanceof DocumentError ? new HttpError(400, e.message) : e,
    );
  }
}
