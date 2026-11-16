"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const LEARNING_STEPS = [
  {
    step: "01",
    title: "ศึกษาคู่มือ 20 ท่า IFAB",
    desc: "ทำความเข้าใจกติกา มุมข้อต่อ และข้อควรระวัง",
    href: "/handbook",
  },
  {
    step: "02",
    title: "ฝึกซ้อมหน้ากล้อง AI",
    desc: "เปิดกล้องซ้อมท่าพร้อม Ghost Guideline 60 FPS",
    href: "/drills",
  },
  {
    step: "03",
    title: "สอบสถานการณ์ภาคสนาม",
    desc: "อ่านเกมจากโจทย์เหตุการณ์แล้วให้สัญญาณหน้ากล้องจริง",
    href: "/examination",
  },
  {
    step: "04",
    title: "ประเมินสมรรถนะและเกรด",
    desc: "วิเคราะห์จุดอ่อนรายบุคคลและรับใบรับรองผล",
    href: "/gradebook",
  },
] as const;

export const Educational_Hero: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto rounded-[24px] apple-material-dark p-6 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 text-[#64D2FF] text-xs font-semibold">
            <Google_Icon name="school" size={15} />
            <span>IFAB Educational &amp; Trainee Assessment Platform</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold apple-display text-[#F5F5F7]">
            สื่อการเรียนการสอนและฝึกปฏิบัติ{" "}
            <span className="bg-gradient-to-r from-[#30D158] via-[#64D2FF] to-[#0A84FF] bg-clip-text text-transparent">
              สัญญาณผู้ตัดสินฟุตบอล AI
            </span>
          </h1>

          <p className="text-sm text-[#A1A1A6] apple-body">
            ระบบห้องเรียนอัจฉริยะสำหรับฝึกทักษะการให้สัญญาณ 20 ท่าทางตามมาตรฐาน IFAB
            Laws of the Game ผ่านโมเดล YOLO26n-pose บน Modal Cloud แบบเรียลไทม์ พร้อมชุดข้อสอบสถานการณ์และสมุดบันทึกผลการประเมินจริง
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/drills"
              onPointerDown={() => triggerCausalFeedback("tap")}
              className="px-5 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white text-xs font-bold flex items-center gap-2 apple-pressable shadow-lg shadow-[#0A84FF]/25"
            >
              <Google_Icon name="videocam" size={17} />
              <span>เข้าห้องฝึกซ้อมสด (Live Drills)</span>
            </Link>

            <Link
              href="/examination"
              onPointerDown={() => triggerCausalFeedback("tap")}
              className="px-5 py-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.12] text-[#F5F5F7] text-xs font-bold flex items-center gap-2 apple-pressable"
            >
              <Google_Icon name="quiz" size={17} className="text-[#0A84FF]" />
              <span>เริ่มสอบภาคปฏิบัติ</span>
            </Link>

            <Link
              href="/handbook"
              onPointerDown={() => triggerCausalFeedback("tap")}
              className="px-4 py-2.5 rounded-2xl bg-[#141416] hover:bg-[#2C2C2E] border border-white/[0.1] text-[#A1A1A6] hover:text-[#F5F5F7] text-xs font-semibold flex items-center gap-2 apple-pressable"
            >
              <Google_Icon name="menu_book" size={16} />
              <span>เปิดคู่มือ 20 ท่า</span>
            </Link>
          </div>
        </div>

        {/* Right: Microservices Runtime Badge Box */}
        <div className="lg:w-80 bg-[#141416]/90 border border-white/[0.09] rounded-2xl p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#F5F5F7] flex items-center gap-1.5">
              <Google_Icon name="monitoring" size={16} className="text-[#30D158]" />
              <span>สถานะระบบสื่อการสอน</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#30D158]/15 border border-[#30D158]/35 text-[#30D158] text-[10px] font-bold">
              MODAL FASTAPI
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#1C1C1E] border border-white/[0.07]">
              <div className="text-[10px] text-[#A1A1A6]">หลักสูตรสัญญาณ</div>
              <div className="text-lg font-bold apple-tabular text-[#0A84FF]">20 ท่า</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1C1E] border border-white/[0.07]">
              <div className="text-[10px] text-[#A1A1A6]">จุดข้อต่อโครงกระดูก</div>
              <div className="text-lg font-bold apple-tabular text-[#30D158]">17 COCO</div>
            </div>
          </div>

          <div className="text-[11px] text-[#A1A1A6] leading-relaxed">
            เชื่อมต่อ Modal FastAPI YOLO26n-pose สำหรับตรวจจับสัญญาณผ่านเว็บแคม รูปภาพ และคลิปวิดีโอจริง
          </div>
        </div>
      </div>

      {/* 4-Step Educational Workflow Strip */}
      <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LEARNING_STEPS.map((item) => (
          <Link
            key={item.step}
            href={item.href}
            onPointerDown={() => triggerCausalFeedback("tap")}
            className="p-3.5 rounded-2xl bg-[#141416]/85 border border-white/[0.08] hover:border-[#0A84FF]/45 hover:bg-[#1C1C1E] flex items-start gap-3 group apple-pressable"
          >
            <span className="px-2 py-1 rounded-lg bg-[#0A84FF]/15 border border-[#0A84FF]/35 text-[#0A84FF] text-xs font-mono font-bold apple-tabular">
              {item.step}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#F5F5F7] group-hover:text-[#0A84FF] transition">
                {item.title}
              </div>
              <div className="text-[11px] text-[#A1A1A6] mt-0.5 leading-snug">
                {item.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
