"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const MODULE_CARDS = [
  {
    href: "/drills",
    title: "Live Practice Drill Studio",
    subtitleTh: "ห้องเรียนฝึกปฏิบัติสัญญาณสด",
    description:
      "เปิดกล้อง Webcam (/ws/webcam) หรืออัปโหลดรูปภาพและคลิปวิดีโอเพื่อวิเคราะห์ 20 ท่าทางด้วยโมเดล YOLO26n-pose จริง",
    icon: "videocam",
    badge: "Module 1 · Live Modal AI",
    accentText: "text-[#30D158]",
    accentBorder: "hover:border-[#30D158]/45",
    iconBox: "bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]",
  },
  {
    href: "/examination",
    title: "Scenario Examination Studio",
    subtitleTh: "ห้องสอบสถานการณ์ภาคปฏิบัติ",
    description:
      "อ่านสถานการณ์การแข่งขัน ตัดสินใจเลือกกติกาภายใน 5 วินาที และแสดงท่าทางหน้ากล้องหรืออัปโหลดภาพเพื่อวัดคะแนนจริง",
    icon: "quiz",
    badge: "Module 2 · 5 Scenarios",
    accentText: "text-[#0A84FF]",
    accentBorder: "hover:border-[#0A84FF]/45",
    iconBox: "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-[#0A84FF]",
  },
  {
    href: "/handbook",
    title: "IFAB Digital Handbook",
    subtitleTh: "คลังคู่มือสื่อการสอน 20 ท่า",
    description:
      "เปิดอ่านคู่มือสัญญาณผู้ตัดสินตามหมวดหมู่ IFAB พร้อมแผนภาพมุมยกแขน ข้อควรระวัง และปุ่มเข้าฝึกซ้อมแต่ละท่าได้ทันที",
    icon: "menu_book",
    badge: "Module 3 · Curriculum",
    accentText: "text-[#64D2FF]",
    accentBorder: "hover:border-[#64D2FF]/45",
    iconBox: "bg-[#64D2FF]/15 border-[#64D2FF]/30 text-[#64D2FF]",
  },
  {
    href: "/gradebook",
    title: "Trainee Gradebook & Analytics",
    subtitleTh: "สมุดบันทึกผลการประเมินผู้เรียน",
    description:
      "ติดตามพัฒนาการด้วยกราฟเรดาร์สมรรถนะ 4 ด้าน รายงานจุดอ่อนเฉพาะบุคคล ประวัติการสอบ และใบรับรองผลฝึกอบรม",
    icon: "monitoring",
    badge: "Module 4 · Evaluation",
    accentText: "text-[#FF9F0A]",
    accentBorder: "hover:border-[#FF9F0A]/45",
    iconBox: "bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#FF9F0A]",
  },
] as const;

export const Curriculum_Quick_Launch: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {MODULE_CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          onPointerDown={() => triggerCausalFeedback("tap")}
          className={`apple-material-dark ${card.accentBorder} rounded-[22px] p-5 flex flex-col justify-between group apple-pressable`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.iconBox}`}
              >
                <Google_Icon name={card.icon} size={20} />
              </div>
              <span className="text-[10px] font-mono apple-tabular text-[#A1A1A6] px-2.5 py-0.5 rounded-full bg-[#141416] border border-white/[0.08]">
                {card.badge}
              </span>
            </div>

            <div className={`text-xs font-semibold ${card.accentText}`}>
              {card.subtitleTh}
            </div>
            <h3 className="text-base font-bold apple-title text-[#F5F5F7] mt-0.5">
              {card.title}
            </h3>
            <p className="text-xs text-[#A1A1A6] mt-2 leading-relaxed">
              {card.description}
            </p>
          </div>

          <div
            className={`mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold ${card.accentText}`}
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
