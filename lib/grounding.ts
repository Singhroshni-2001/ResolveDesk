import { z } from "zod";
export const abstention =
  "I don’t have enough information in the published documents to answer that reliably. Please create a ticket so the support team can help.";
export const answerSchema = z.object({
  answer: z.string().min(1).max(6000),
  sourceIds: z.array(z.number().int().min(1).max(5)).max(5),
  sufficient: z.boolean(),
});
export function groundedResult(
  raw: unknown,
  passages: { title: string; content: string; page: number }[],
) {
  const parsed = answerSchema.safeParse(raw);
  if (
    !parsed.success ||
    !parsed.data.sufficient ||
    !parsed.data.sourceIds.length ||
    parsed.data.sourceIds.some((id) => !passages[id - 1])
  )
    return { content: abstention, citations: [] };
  const ids = [...new Set(parsed.data.sourceIds)];
  const content = parsed.data.answer.replace(/\[(\d+)\]/g, (_, n) => {
    const index = ids.indexOf(Number(n));
    return index < 0 ? "" : `[${index + 1}]`;
  });
  return {
    content,
    citations: ids.map((id) => ({
      title: passages[id - 1].title,
      excerpt: passages[id - 1].content,
      page: passages[id - 1].page,
    })),
  };
}
