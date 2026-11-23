"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Google_Icon } from "../Common/Google_Icon";
import { useTheme } from "../../Core_Lib/Theme_Context";

const NAV_LINKS = [
  { href: "/", label: "ฝึกซ้อมสด", icon: "videocam" },
  { href: "/upload", label: "ตรวจคลิป/ภาพ", icon: "photo_camera" },
  { href: "/signals", label: "กติกา 20 ท่า", icon: "menu_book" },
] as const;

export const Nav_Bar: React.FC = () => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // References to tab links to compute smooth sliding underline and hover pill
  const navContainerRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [activeRect, setActiveRect] = useState<{ left: number; width: number } | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number; width: number } | null>(null);

  // Close mobile drawer upon navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const activeIndex = NAV_LINKS.findIndex((link) => {
    if (link.href === "/") {
      return pathname === "/" || pathname === "/live" || pathname === "/drills";
    }
    return pathname.startsWith(link.href);
  });

  // Update active indicator geometry
  useEffect(() => {
    const updateActiveRect = () => {
      if (activeIndex === -1) {
        setActiveRect(null);
        return;
      }
      const el = linkRefs.current[activeIndex];
      const container = navContainerRef.current;
      if (el && container) {
        const containerLeft = container.getBoundingClientRect().left;
        const elRect = el.getBoundingClientRect();
        setActiveRect({
          left: elRect.left - containerLeft,
          width: elRect.width,
        });
      }
    };

    updateActiveRect();
    window.addEventListener("resize", updateActiveRect);
    return () => window.removeEventListener("resize", updateActiveRect);
  }, [activeIndex, pathname]);

  const handleMouseEnter = (index: number) => {
    const el = linkRefs.current[index];
    const container = navContainerRef.current;
    if (el && container) {
      const containerLeft = container.getBoundingClientRect().left;
      const elRect = el.getBoundingClientRect();
      setHoverRect({
        left: elRect.left - containerLeft,
        width: elRect.width,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverRect(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#070B0F]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 rounded-xl p-1 -ml-1 apple-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-400/35 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Google_Icon name="sports_soccer" size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            IFAB Referee Signal AI
          </span>
        </Link>

        {/* Center: Underline Navigation Tabs with Sliding Indicator & Hover Pill */}
        <nav
          ref={navContainerRef}
          onMouseLeave={handleMouseLeave}
          aria-label="เมนูหลัก"
          className="hidden md:flex items-center gap-1.5 h-full relative"
        >
          {/* Subtle Hover Pill */}
          {hoverRect && (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
              style={{
                left: `${hoverRect.left}px`,
                width: `${hoverRect.width}px`,
              }}
            />
          )}

          {/* Smooth Sliding Underline Indicator */}
          {activeRect && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
              style={{
                left: `${activeRect.left}px`,
                width: `${activeRect.width}px`,
              }}
            />
          )}

          {NAV_LINKS.map((link, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={link.href}
                ref={(el) => {
                  linkRefs.current[index] = el;
                }}
                href={link.href}
                onMouseEnter={() => handleMouseEnter(index)}
                className={`relative h-full px-3 flex items-center text-xs lg:text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md z-10 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Theme Toggle & Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Pill (Desktop & Mobile) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={
              theme === "dark"
                ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)"
                : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"
            }
            aria-label={
              theme === "dark"
                ? "เปลี่ยนเป็นโหมดสว่าง"
                : "เปลี่ยนเป็นโหมดมืด"
            }
            className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 apple-pressable transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span className="inline-block transition-transform duration-300">
              <Google_Icon
                name={theme === "dark" ? "light_mode" : "dark_mode"}
                size={17}
              />
            </span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name={mobileMenuOpen ? "close" : "menu"} size={18} />
          </button>
        </div>
      </div>

      {/* Sleek Mobile Drawer with Smooth Drop Transition */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="เมนูนำทางบนมือถือ"
          className="md:hidden border-t border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070B0F]/95 backdrop-blur-2xl px-4 py-3 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          {NAV_LINKS.map((link, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-400/30"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                }`}
              >
                <Google_Icon
                  name={link.icon}
                  size={18}
                  className={
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                  }
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
