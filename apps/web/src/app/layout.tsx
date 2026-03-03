import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slate — Distraction-Free Reader",
  description:
    "Paste any URL. Get clean, beautiful content. Open source reader for the post-Pocket world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
