import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Referee AI Assistant & Training Platform",
  description: "AI-Powered Football Referee Signal Recognition, Coaching & Match Assessment System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
