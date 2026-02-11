import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FranklinCovey Coaching Platform",
  description:
    "Individual coaching engagement tracking for government leadership development",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen bg-background font-body">
        {children}
      </body>
    </html>
  );
}
