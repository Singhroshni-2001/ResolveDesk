import { auth, check, failure } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const { db, user, role } = await auth(request);
    const isAgent = ["agent", "admin"].includes(role);
    const [tickets, documents, conversations] = await Promise.all([
      db
        .from("tickets")
        .select("*, replies(*)")
        .order("created_at", { ascending: false })
        .limit(500),
      isAgent
        ? db
            .from("documents")
            .select("*, chunks(count)")
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      db
        .from("conversations")
        .select("id,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    check(tickets.error);
    check(documents.error);
    check(conversations.error);
    return Response.json(
      {
        tickets: tickets.data?.map((t) => ({
          ...t,
          customer:
            t.customer_id === user.id
              ? "You"
              : `Customer ${t.customer_id.slice(0, 6)}`,
          replies: t.replies
            .sort((a: { created_at: string }, b: { created_at: string }) =>
              a.created_at.localeCompare(b.created_at),
            )
            .map((r: { author_id: string }) => ({
              ...r,
              author: r.author_id === user.id ? "You" : "Support conversation",
            })),
        })),
        documents: documents.data?.map((d) => ({
          ...d,
          chunk_count: d.chunks?.[0]?.count || 0,
        })),
        conversations: conversations.data,
        email: user.email,
        role,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
