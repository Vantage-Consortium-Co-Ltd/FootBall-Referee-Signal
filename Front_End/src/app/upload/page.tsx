"use client";

import React from "react";
import { Media_Upload_Analyzer } from "../../UI_Components/Drill_Practice";

export default function UploadPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F8FAFC] dark:bg-[#070B0F] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            ตรวจจับสัญญาณจากคลิปวิดีโอและรูปภาพ
          </h1>
        </div>

        <Media_Upload_Analyzer />
      </div>
    </main>
  );
}
