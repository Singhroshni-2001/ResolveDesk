import { chunksForPages } from "./domain";
export class DocumentError extends Error {}
export async function extractDocument(file: File) {
  if (file.size === 0 || file.size > 1048576)
    throw new DocumentError("Choose a non-empty file up to 1 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["txt", "md", "pdf"].includes(ext || ""))
    throw new DocumentError(
      "Only TXT, Markdown and text-based PDF files are supported.",
    );
  const expected =
    ext === "pdf"
      ? "application/pdf"
      : ext === "md"
        ? "text/markdown"
        : "text/plain";
  if (
    file.type &&
    ![
      "application/octet-stream",
      expected,
      ...(ext === "md" ? ["text/plain"] : []),
    ].includes(file.type)
  )
    throw new DocumentError("The file type does not match its extension.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let pages: { text: string; page: number }[] = [];
  if (ext === "pdf") {
    if (bytes.subarray(0, 5).toString() !== "%PDF-")
      throw new DocumentError("That file is not a valid PDF.");
    try {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      // pdf-parse catches individual page failures internally. Verify the returned
      // page count as well, rather than trusting a throw inside pagerender.
      // This older PDF.js bundle can misread the offset of pooled Node Buffers.
      // Give it a standalone byte array whose offset is always zero.
      const result = await pdf(new Uint8Array(bytes), {
        max: 21,
        pagerender: async (page: {
          pageIndex: number;
          getTextContent: () => Promise<{
            items: { str?: string; transform?: number[] }[];
          }>;
        }) => {
          if (page.pageIndex >= 20)
            throw new DocumentError("PDFs must have no more than 20 pages.");
          const content = await page.getTextContent();
          const text = content.items.map((item) => item.str || "").join(" ");
          pages.push({ page: page.pageIndex + 1, text });
          return text;
        },
      });
      if (result.numpages > 20)
        throw new DocumentError("PDFs must have no more than 20 pages.");
      if (pages.length !== result.numpages)
        throw new DocumentError("One or more PDF pages could not be extracted. Export a text-based PDF and retry.");
    } catch (e) {
      if (e instanceof DocumentError) throw e;
      throw new DocumentError(
        "This PDF could not be read. Use an unencrypted, text-based PDF.",
      );
    }
    if (!pages.length || pages.some((p) => p.text.trim().length < 30))
      throw new DocumentError(
        "Scanned, image-only or nearly empty PDF pages are not supported. Export a text-based PDF or upload TXT/Markdown.",
      );
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new DocumentError("Please save this document as UTF-8 text.");
    }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))
      throw new DocumentError(
        "This file contains binary data. Upload plain UTF-8 text.",
      );
    pages = [{ text, page: 1 }];
  }
  const count = pages.reduce((n, p) => n + p.text.length, 0);
  if (count < 30 || count > 24000)
    throw new DocumentError(
      "Documents must contain between 30 and 24,000 extracted characters.",
    );
  const chunks = chunksForPages(pages.sort((a, b) => a.page - b.page));
  if (!chunks.length || chunks.length > 40)
    throw new DocumentError(
      "This document has too many passages. Split it into smaller documents.",
    );
  return { chunks, bytes, mime: expected, pageCount: pages.length, characterCount: count };
}
