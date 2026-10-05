import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ResolveDesk — A little clarity. A lot of care.",
  description:
    "Thoughtful customer support, grounded in your knowledge. Explore an interactive, clearly labelled demo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
