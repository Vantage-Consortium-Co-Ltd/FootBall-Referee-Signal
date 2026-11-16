import type { Metadata } from "next";
import "./globals.css";
import { Nav_Bar } from "../UI_Components/App_Layout/Nav_Bar";
import { ThemeProvider } from "../Core_Lib/Theme_Context";

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
    <html lang="th" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ifab-theme-mode');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#060B0F] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-950 dark:selection:text-emerald-100 transition-colors duration-200">
        <ThemeProvider>
          <Nav_Bar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
