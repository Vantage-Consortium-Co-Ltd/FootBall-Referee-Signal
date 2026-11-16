"use client";

import React, { useState } from "react";
import { Media_Upload_Analyzer } from "../../UI_Components/Drill_Practice";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export default function UploadPage() {
  const [subMode, setSubMode] = useState<"image" | "video">("image");

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F] text-slate-100">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
            ตรวจจับสัญญาณจากคลิปวิดีโอและรูปภาพ
          </h1>

          <div
            role="tablist"
            aria-label="ประเภทไฟล์"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subMode === "image"}
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setSubMode("image")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                subMode === "image"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Google_Icon name="photo_camera" size={14} />
              <span>รูปภาพ</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={subMode === "video"}
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setSubMode("video")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                subMode === "video"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Google_Icon name="movie" size={14} />
              <span>วิดีโอ</span>
            </button>
          </div>
        </div>

        <Media_Upload_Analyzer mode={subMode} />
      </div>
    </main>
  );
}
