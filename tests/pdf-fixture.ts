// Minimal in-memory PDF fixture, not a deliverable document or a live sample.
export function pdfFixture(texts: string[]): Uint8Array {
 const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
 const kids: string[] = [];
 for (const text of texts) {
  const pageId = objects.length + 1;
  const contentId = pageId + 1;
  kids.push(`${pageId} 0 R`);
  const escaped = text.replace(/[\\()]/g, "\\$&");
  const stream = `BT /F1 12 Tf 50 750 Td (${escaped}) Tj ET`;
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
 }
 objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${texts.length} >>`;
 let pdf = "%PDF-1.4\n";
 const offsets = [0];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});
 const xref = Buffer.byteLength(pdf);
 pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 for (const offset of offsets.slice(1)) pdf+=`${String(offset).padStart(10,"0")} 00000 n \n`;
 pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new Uint8Array(Buffer.from(pdf));
}
