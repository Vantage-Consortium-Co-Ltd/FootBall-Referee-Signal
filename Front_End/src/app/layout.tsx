import type { Metadata } from "next";
import "./globals.css";
import { Nav_Bar } from "../UI_Components/App_Layout/Nav_Bar";

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
      <body className="min-h-screen bg-black text-[#F5F5F7] antialiased">
        <Nav_Bar />
        {children}
      </body>
    </html>
  );
}
