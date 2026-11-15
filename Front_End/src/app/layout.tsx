import type { Metadata } from "next";
import "./globals.css";
import { Nav_Bar } from "../UI_Components/App_Layout";

export const metadata: Metadata = {
  title: "IFAB Referee Academy AI | สื่อการเรียนการสอนและประเมินผู้ตัดสินฟุตบอล",
  description:
    "Interactive Educational & Trainee Evaluation Media Platform for Football Referee Signals based on IFAB Laws of the Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Nav_Bar />
        {children}
      </body>
    </html>
  );
}
