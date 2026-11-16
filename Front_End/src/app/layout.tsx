import type { Metadata } from "next";
import "./globals.css";
import { Nav_Bar } from "../UI_Components/App_Layout/Nav_Bar";

export const metadata: Metadata = {
  title: "Football Referee Signal Service | YOLO26n-pose API Console",
  description:
    "Next.js client aligned with the Football Referee Signal FastAPI service (GET /health, POST /predict/image, POST /predict/video, WS /ws/webcam)",
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
