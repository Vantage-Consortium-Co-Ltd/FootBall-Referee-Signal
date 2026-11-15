"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";

const MODULE_CARDS = [
  {
    href: "/drills",
    title: "Live Practice Drill Studio",
    subtitleTh: "ห้องเรียนฝึกปฏิบัติสัญญาณสด",
    description:
      "เปิดกล้อง Webcam หรือโหมดจำลองเพื่อฝึกซ้อม 20 ท่าทาง พร้อม Ghost Target Guide, Person Tagging Reticle และ Coaching HUD แบบเรียลไทม์",
    icon: "videocam",
    badge: "Module 1 · 60 FPS Canvas",
    accentText: "text-emerald-400",
    accentBorder: "hover:border-emerald-500/50",
    iconBox: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  {
    href: "/examination",
    title: "Scenario Examination Studio",
    subtitleTh: "ห้องสอบสถานการณ์จำลอง",
    description:
      "ชมคลิปสถานการณ์จำลองสั้น 8 วินาที ตัดสินใจเลือกกติกาภายใน 5 วินาที และแสดงท่าทางหน้ากล้องเพื่อวัดคะแนน 3 มิติ",
    icon: "quiz",
    badge: "Module 2 · 5 Scenarios",
    accentText: "text-cyan-400",
    accentBorder: "hover:border-cyan-500/50",
    iconBox: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  },
  {
    href: "/handbook",
    title: "IFAB Digital Handbook",
    subtitleTh: "คลังคู่มือสื่อการสอน 20 ท่า",
    description:
      "เปิดอ่านคู่มือสัญญาณผู้ตัดสินตามหมวดหมู่ IFAB พร้อมแผนภาพมุมยกแขน ข้อควรระวัง และปุ่มเข้าฝึกซ้อมแต่ละท่าได้ทันที",
    icon: "menu_book",
    badge: "Module 3 · Curriculum",
    accentText: "text-blue-400",
    accentBorder: "hover:border-blue-500/50",
    iconBox: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  {
    href: "/gradebook",
    title: "Trainee Gradebook & Analytics",
    subtitleTh: "สมุดบันทึกผลการประเมินผู้เรียน",
    description:
      "ติดตามพัฒนาการด้วยกราฟเรดาร์สมรรถนะ 4 ด้าน รายงานจุดอ่อนเฉพาะบุคคล ประวัติการสอบ และใบรับรองผลฝึกอบรม",
    icon: "monitoring",
    badge: "Module 4 · Evaluation",
    accentText: "text-amber-400",
    accentBorder: "hover:border-amber-500/50",
    iconBox: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
] as const;

export const Curriculum_Quick_Launch: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {MODULE_CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`bg-slate-900/80 border border-slate-800 ${card.accentBorder} rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.iconBox}`}
              >
                <Google_Icon name={card.icon} size={20} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                {card.badge}
              </span>
            </div>

            <div className="text-xs font-semibold text-cyan-400">
              {card.subtitleTh}
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              {card.title}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {card.description}
            </p>
          </div>

          <div
            className={`mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold ${card.accentText}`}
          >
            <span>เปิดห้องเรียนนี้</span>
            <Google_Icon
              name="arrow_forward"
              size={16}
              className="transform group-hover:translate-x-1 transition-transform"
            />
          </div>
        </Link>
      ))}
    </section>
  );
};
