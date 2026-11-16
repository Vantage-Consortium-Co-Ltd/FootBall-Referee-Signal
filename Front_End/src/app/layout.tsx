import type { Metadata } from "next";
import "./globals.css";
import { Nav_Bar } from "../UI_Components/App_Layout/Nav_Bar";

export const metadata: Metadata = {
  title: "IFAB Referee Signal AI | ระบบวิเคราะห์ท่าสัญญาณผู้ตัดสินฟุตบอลอัจฉริยะ",
  description:
    "ระบบ AI วิเคราะห์และฝึกซ้อมท่าสัญญาณผู้ตัดสินฟุตบอลตามกติกา IFAB 20 ท่ามาตรฐาน รองรับกล้องวิเคราะห์สด ภาพถ่าย และคลิปวิดีโอการแข่งขัน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="min-h-screen bg-[#060B0F] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-100">
        <Nav_Bar />
        {children}
      </body>
    </html>
  );
}
