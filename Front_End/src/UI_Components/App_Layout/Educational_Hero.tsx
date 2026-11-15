"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";

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
    title: "สอบสถานการณ์จำลอง",
    desc: "อ่านเกมจากคลิปสั้นแล้วตอบสนองให้สัญญาณจริง",
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
    <section className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
            <Google_Icon name="school" size={15} />
            <span>IFAB Educational &amp; Trainee Assessment Platform</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-100 leading-tight">
            สื่อการเรียนการสอนและฝึกปฏิบัติ{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              สัญญาณผู้ตัดสินฟุตบอล AI
            </span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            ระบบห้องเรียนอัจฉริยะสำหรับฝึกทักษะการให้สัญญาณ 20 ท่าทางตามมาตรฐาน IFAB
            Laws of the Game ผ่านกล้องตรวจจับโครงกระดูก 17 จุดแบบเรียลไทม์ พร้อมชุดข้อสอบสถานการณ์จำลองและสมุดบันทึกผลการประเมินผู้เรียนรายบุคคล
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/drills"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-cyan-500/20"
            >
              <Google_Icon name="videocam" size={17} />
              <span>เข้าห้องฝึกซ้อมสด (Live Drills)</span>
            </Link>

            <Link
              href="/examination"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center gap-2 transition"
            >
              <Google_Icon name="quiz" size={17} className="text-cyan-400" />
              <span>เริ่มสอบสถานการณ์จำลอง</span>
            </Link>

            <Link
              href="/handbook"
              className="px-4 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
            >
              <Google_Icon name="menu_book" size={16} />
              <span>เปิดคู่มือ 20 ท่า</span>
            </Link>
          </div>
        </div>

        {/* Right: Microservices Runtime Badge Box */}
        <div className="lg:w-80 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Google_Icon name="monitoring" size={16} className="text-emerald-400" />
              <span>สถานะระบบสื่อการสอน</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
              STANDALONE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">หลักสูตรสัญญาณ</div>
              <div className="text-lg font-extrabold font-mono text-cyan-400">20 ท่า</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">จุดข้อต่อโครงกระดูก</div>
              <div className="text-lg font-extrabold font-mono text-emerald-400">17 COCO</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            รองรับการทำงานแบบ Standalone Offline Simulation และเชื่อมต่อเว็บแคมได้ทันทีในห้องเรียน
          </div>
        </div>
      </div>

      {/* 4-Step Educational Workflow Strip */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LEARNING_STEPS.map((item) => (
          <Link
            key={item.step}
            href={item.href}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition flex items-start gap-3 group"
          >
            <span className="px-2 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              {item.step}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition">
                {item.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {item.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
