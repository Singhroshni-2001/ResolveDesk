import { z } from "zod";
export const statuses = ["Open", "In progress", "Resolved"] as const;
export const categories = [
  "Orders",
  "Returns",
  "Billing",
  "Account",
  "Other",
] as const;
export type Citation = { title: string; excerpt: string; page?: number };
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};
export type Ticket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: (typeof statuses)[number];
  created_at: string;
  resolved_at: string | null;
  customer?: string;
  replies: Reply[];
};
export type Reply = {
  id: string;
  body: string;
  created_at: string;
  author?: string;
};
export type Doc = {
  id: string;
  name: string;
  status: string;
  error?: string | null;
  created_at: string;
  chunk_count?: number;
};
export const ticketInput = z.object({
  id: z.uuid(),
  subject: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(categories),
});
export const replyInput = z.object({
  id: z.uuid(),
  body: z.string().trim().min(1).max(4000),
});
export const questionInput = z.object({
  id: z.uuid(),
  question: z.string().trim().min(2).max(1500),
  conversation_id: z.uuid(),
});
export function resolutionHours(tickets: Ticket[]) {
  const values = tickets
    .filter((t) => t.resolved_at)
    .map(
      (t) => (Date.parse(t.resolved_at!) - Date.parse(t.created_at)) / 3600000,
    )
    .filter((n) => n >= 0);
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}
export function chunksForPages(pages: { text: string; page: number }[]) {
  return pages.flatMap((p) => {
    const result: { content: string; page: number }[] = [];
    const text = p.text.replace(/\u0000/g, "").trim();
    for (let i = 0; i < text.length; i += 850) {
      const content = text.slice(i, i + 1000).trim();
      if (content.length >= 30) result.push({ content, page: p.page });
    }
    return result;
  });
}
export const policies = [
  {
    title: "Returns & refunds",
    excerpt:
      "Return unused items in their original packaging within 30 days of delivery. Refunds reach the original payment method within 5–7 business days after inspection.",
    page: 1,
  },
  {
    title: "Shipping & delivery",
    excerpt:
      "Standard delivery takes 3–5 business days. Shipping is free on orders over ₹999. Tracking updates may take 24 hours after dispatch.",
    page: 1,
  },
  {
    title: "Payments & billing",
    excerpt:
      "We accept major cards and UPI. If a payment is deducted twice, contact support with your order ID. Verified duplicate charges are refunded within 5–7 business days.",
    page: 1,
  },
];
export const examples = [
  "What is your return policy?",
  "How long does delivery take?",
  "I was charged twice. What now?",
];
export function savedAnswer(question: string): {
  content: string;
  citations: Citation[];
} {
  const index = examples.indexOf(question);
  if (index < 0)
    return {
      content:
        "This demo has saved answers for the three example questions. I don’t have a verified answer for that question. Start a new conversation to choose an example, or create a ticket for the support team.",
      citations: [],
    };
  return {
    content: [
      "Of course — you have 30 days from delivery to return an unused item in its original packaging. Once your return passes inspection, your refund will arrive in 5–7 business days. If you need a hand, you can create a ticket below.",
      "Standard delivery takes 3–5 business days, and shipping is on us for orders over ₹999. Just dispatched? Give your tracking link up to 24 hours to update.",
      "Let’s get that sorted. Please create a billing ticket with your order ID. Our team will check the duplicate charge; verified duplicates are refunded to your original payment method within 5–7 business days.",
    ][index],
    citations: [policies[index]],
  };
}
export function initialTickets(): Ticket[] {
  return [
    {
      id: "RD-1048",
      subject: "My order hasn’t arrived yet",
      description:
        "Order #NOVA-2081 was placed five days ago. Could you check the delivery status?",
      category: "Orders",
      status: "Open",
      created_at: "2026-10-03T10:00:00Z",
      resolved_at: null,
      customer: "Alex Morgan",
      replies: [],
    },
    {
      id: "RD-1047",
      subject: "Exchange for a different size",
      description:
        "I would like to return my medium Everyday Tote and order the larger size.",
      category: "Returns",
      status: "In progress",
      created_at: "2026-10-02T08:00:00Z",
      resolved_at: null,
      customer: "Jamie Chen",
      replies: [
        {
          id: "r1",
          body: "Happy to help. Please keep the original packaging and we’ll arrange the next steps.",
          author: "Sam · Support",
          created_at: "2026-10-02T09:00:00Z",
        },
      ],
    },
    {
      id: "RD-1046",
      subject: "A little help with my refund",
      description:
        "Checking the status of my return refund for order #NOVA-1985.",
      category: "Billing",
      status: "Resolved",
      created_at: "2026-10-01T08:00:00Z",
      resolved_at: "2026-10-01T14:00:00Z",
      customer: "Alex Morgan",
      replies: [
        {
          id: "r2",
          body: "Your refund has been processed. It should reach your original payment method in 5–7 business days.",
          author: "Sam · Support",
          created_at: "2026-10-01T14:00:00Z",
        },
      ],
    },
    {
      id: "RD-1045",
      subject: "Update my delivery address",
      description:
        "Please help update the address before my order is dispatched.",
      category: "Orders",
      status: "Resolved",
      created_at: "2026-09-30T09:00:00Z",
      resolved_at: "2026-09-30T11:00:00Z",
      customer: "Taylor Brooks",
      replies: [],
    },
  ];
}
