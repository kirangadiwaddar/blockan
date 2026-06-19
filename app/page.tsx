"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { LogoMark } from "@/assets/logo/logo";
import {
  ArrowRight, LayoutGrid, ListChecks, Zap, Users, BarChart3,
  CalendarDays, CheckCircle2, Kanban, Clock, Bell, Shield,
  ChevronRight, Star, GitBranch, Layers, TrendingUp, Sparkles,
  Menu,
} from "lucide-react";

/* ─── Animation helpers ─────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Nav ──────────────────────────────────────────────────── */
function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="mx-4 mt-3">
        <div className="max-w-6xl mx-auto border border-white/8 rounded-2xl backdrop-blur-2xl bg-black/70 px-5 h-14 flex items-center justify-between"
          style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <LogoMark size={28} />
            <span className="text-white font-semibold text-base tracking-tight">Blockan</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[{ label: "Features", href: "#features" }, { label: "How it works", href: "#how-it-works" }, { label: "Pricing", href: "#pricing" }].map((item) => (
              <a key={item.label} href={item.href}
                className="text-sm text-white/45 hover:text-white/90 transition-colors px-3.5 py-2 rounded-lg hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-sm text-white/50 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
              Sign in
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-1.5 bg-[#FF1616] hover:bg-[#d41313] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started <ArrowRight size={13} />
            </Link>
            <button className="md:hidden p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
function Hero() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505] pt-24 pb-0">
      {/* Layered background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(255,22,22,0.28) 0%, transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 15% 70%, rgba(255,22,22,0.06), transparent 55%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 85% 50%, rgba(255,80,80,0.04), transparent 55%)" }} />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)",
        }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1.5 pr-4 py-1 text-sm text-white/55 mb-8 hover:border-white/20 transition-colors cursor-default"
        >
          <span className="inline-flex items-center gap-1 bg-[#FF1616]/20 text-[#FF1616] text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <Sparkles size={11} /> NEW
          </span>
          <span>Ship faster with your team — now in beta</span>
          <ChevronRight size={13} className="text-white/30" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-[clamp(2.6rem,8vw,5.5rem)] font-black text-white leading-[1.04] tracking-[-0.03em] mb-6 max-w-4xl"
        >
          The project tool{" "}
          <span className="relative inline-block">
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #FF1616 0%, #ff5252 50%, #ff8a80 100%)" }}>
              your team
            </span>
          </span>
          <br />
          <span className="text-white/90">actually loves</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="text-[clamp(1rem,2.5vw,1.2rem)] text-white/45 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Kanban boards, sprint planning, backlog management, and real-time collaboration — all in one beautifully fast workspace.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
        >
          <Link href="/register"
            className="group inline-flex items-center gap-2 bg-[#FF1616] hover:bg-[#d41313] text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-base shadow-xl shadow-red-900/35 hover:shadow-red-900/55 hover:scale-[1.03] active:scale-[0.98]"
          >
            Start for free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="#how-it-works"
            className="inline-flex items-center gap-2 bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/75 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-all text-base"
          >
            See how it works
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center gap-3 text-sm text-white/30 mb-16"
        >
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className="fill-[#FF1616] text-[#FF1616]" />
            ))}
          </div>
          <span>Loved by <strong className="text-white/50 font-medium">500+ teams</strong> · No credit card · Free forever</span>
        </motion.div>

        {/* App mockup — parallax */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
          style={{ y: mockupY, opacity: mockupOpacity }}
          className="relative w-full max-w-5xl mx-auto"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-x-20 -top-10 h-40 blur-3xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #FF1616 0%, transparent 70%)" }}
          />

          <div className="relative rounded-[20px] border border-white/10 overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #161616 0%, #0c0c0c 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 -1px 0 rgba(255,255,255,0.07), 0 32px 80px -16px rgba(0,0,0,0.9), 0 0 80px -20px rgba(255,22,22,0.12)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]/80" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]/80" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1 w-56">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                  <span className="text-white/25 text-xs font-mono">app.blockan.io/board</span>
                </div>
              </div>
            </div>

            {/* App chrome — sidebar + content */}
            <div className="flex" style={{ minHeight: 320 }}>
              {/* Sidebar */}
              <div className="hidden sm:flex flex-col w-44 border-r border-white/[0.05] bg-white/[0.01] p-3 gap-0.5 shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-[#FF1616]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#FF1616]" />
                  </div>
                  <div className="h-2 rounded bg-white/15 w-16" />
                </div>
                {[
                  { active: false, w: "w-12" },
                  { active: true, w: "w-16" },
                  { active: false, w: "w-14" },
                  { active: false, w: "w-10" },
                  { active: false, w: "w-20" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${item.active ? "bg-white/8" : ""}`}>
                    <div className={`w-3.5 h-3.5 rounded ${item.active ? "bg-white/25" : "bg-white/8"}`} />
                    <div className={`h-1.5 rounded ${item.active ? "bg-white/25" : "bg-white/6"} ${item.w}`} />
                  </div>
                ))}
              </div>

              {/* Kanban board */}
              <div className="flex-1 p-4 overflow-hidden">
                <div className="flex gap-3 h-full">
                  {[
                    { label: "Todo", dot: "bg-zinc-500", cards: [{ w1: 75, w2: 50 }, { w1: 60, w2: 40 }, { w1: 85, w2: 55 }] },
                    { label: "In Progress", dot: "bg-blue-400", cards: [{ w1: 70, w2: 45 }, { w1: 90, w2: 60 }] },
                    { label: "Review", dot: "bg-violet-400", cards: [{ w1: 65, w2: 42 }] },
                    { label: "Done", dot: "bg-emerald-400", cards: [{ w1: 80, w2: 52 }, { w1: 55, w2: 38 }] },
                  ].map((col, ci) => (
                    <div key={col.label} className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                        <span className="text-[10px] text-white/35 font-medium">{col.label}</span>
                        <span className="text-[10px] text-white/15 ml-auto">{col.cards.length}</span>
                      </div>
                      {col.cards.map((card, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + ci * 0.08 + i * 0.06 }}
                          className="rounded-lg border border-white/[0.06] p-2.5 bg-white/[0.025] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="h-1.5 rounded-full bg-white/12 mb-2" style={{ width: `${card.w1}%` }} />
                          <div className="h-1.5 rounded-full bg-white/6" style={{ width: `${card.w2}%` }} />
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full bg-white/8" />
                              <div className="w-4 h-4 rounded-full bg-white/5 -ml-1.5" />
                            </div>
                            <div className="h-1.5 w-8 rounded-full bg-white/5" />
                          </div>
                        </motion.div>
                      ))}
                      {/* Add card ghost */}
                      <div className="rounded-lg border border-dashed border-white/[0.06] p-2 flex items-center justify-center mt-1">
                        <span className="text-[10px] text-white/15">+ Add</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -left-4 sm:-left-8 top-1/3 hidden sm:flex items-center gap-2.5 bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Sprint closed</p>
              <p className="text-white/35 text-[11px]">12/12 issues done</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 1.25, duration: 0.5 }}
            className="absolute -right-4 sm:-right-8 top-1/4 hidden sm:flex items-center gap-2.5 bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl"
          >
            <div className="w-7 h-7 rounded-lg bg-[#FF1616]/20 flex items-center justify-center shrink-0">
              <TrendingUp size={14} className="text-[#FF1616]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Velocity up 34%</p>
              <p className="text-white/35 text-[11px]">vs last sprint</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to top, #050505, transparent)" }} />
    </section>
  );
}

/* ─── Logos marquee ─────────────────────────────────────────── */
const LOGOS = [
  {
    name: "Vercel",
    svg: (
      <svg viewBox="0 0 74 64" fill="currentColor" className="h-5 w-auto">
        <path d="M37 0L74 64H0L37 0z" />
      </svg>
    ),
  },
  {
    name: "Stripe",
    svg: (
      <svg viewBox="0 0 60 25" fill="currentColor" className="h-5 w-auto">
        <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.33 10.33 0 01-4.56.93c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.65zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.44.94V5.2h3.94l.18 1.06c.55-.72 1.77-1.37 3.15-1.37 2.96 0 5.9 2.52 5.9 7.64 0 5.42-2.85 7.77-5.81 7.77zM40 8.95c-.95 0-1.68.41-2.12.99l.02 5.12c.44.53 1.15.99 2.1.99 1.63 0 2.72-1.54 2.72-3.54C42.72 10.47 41.62 8.95 40 8.95zM28.24 5.2h4.46v14.88h-4.46V5.2zm0-4.71l4.46-.95v3.52l-4.46.95V.49zm-6.32 19.59c-1.2 0-1.88-.5-2.35-.86l-.02.7h-4.44V0l4.44-.94.01 5.87c.49-.42 1.23-.99 2.37-.99 2.5 0 5.56 2.24 5.56 7.64 0 5.42-3.06 7.5-5.57 7.5zm-.93-10.93c-.97 0-1.63.41-2.07.99l.01 5.12c.44.53 1.07.99 2.06.99 1.62 0 2.72-1.54 2.72-3.54 0-2.06-1.1-3.56-2.72-3.56zM5.4 8.4c0-.68.56-1.01 1.47-1.01 1.31 0 2.96.4 4.27 1.11V4.44A11.34 11.34 0 006.87 4C3.27 4 0 5.89 0 9.71c0 5.82 7.82 4.88 7.82 7.38 0 .8-.69 1.05-1.67 1.05-1.44 0-3.28-.59-4.74-1.39v4.12a12 12 0 004.74.99c3.68 0 7.16-1.79 7.16-5.69-.01-6.28-7.91-5.15-7.91-7.77z" />
      </svg>
    ),
  },
  {
    name: "Linear",
    svg: (
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-5 w-auto">
        <path d="M1.22 61.39L38.6 98.78a50.14 50.14 0 0022.79-13.07L14.3 38.6A50.14 50.14 0 001.22 61.39zM0 49.08L50.92 100A50 50 0 000 49.08zM7.94 32.72l59.34 59.34a50.15 50.15 0 009.76-7.29L15.23 22.96a50.15 50.15 0 00-7.29 9.76zm13.12-16.15L76.43 72.94A50 50 0 0072.94 76.43L16.57 20.06c1.17-1.22 2.39-2.41 3.49-3.49zM50 0A50 50 0 000 50L50 100A50 50 0 0050 0z" />
      </svg>
    ),
  },
  {
    name: "Figma",
    svg: (
      <svg viewBox="0 0 38 57" fill="currentColor" className="h-6 w-auto">
        <path d="M19 28.5a9.5 9.5 0 1119 0 9.5 9.5 0 01-19 0z" />
        <path d="M0 47.5A9.5 9.5 0 019.5 38H19v9.5a9.5 9.5 0 11-19 0z" />
        <path d="M19 0v19h9.5a9.5 9.5 0 000-19H19z" />
        <path d="M0 9.5A9.5 9.5 0 009.5 19H19V0H9.5A9.5 9.5 0 000 9.5z" />
        <path d="M0 28.5A9.5 9.5 0 009.5 38H19V19H9.5A9.5 9.5 0 000 28.5z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-5 w-auto">
        <path d="M6.02 7.53C9.66 10.51 11 10.33 17.8 9.87l60.5-3.62c1.36 0 .22-1.37-.44-1.6L67.77.5C65.5-.86 61.88-.4 58.28.5L.76 6.37c-2.27.45-2.72 1.37-.74 2.74l6 -1.58zM8.78 18.28v63.6c0 3.42 1.66 4.6 5.53 4.37l66.44-3.87c3.87-.22 4.32-2.74 4.32-5.7V13.45c0-2.95-1.13-4.55-3.63-4.32L12.41 13c-2.73.22-3.63 1.6-3.63 5.28zm65.3 4.1c.45 2.05 0 4.1-2.04 4.33l-3.4.68v50c-2.96 1.59-5.69 2.5-7.96 2.5-3.64 0-4.55-1.14-7.28-4.56L32 45.9v35.5l7.05 1.59s0 4.1-5.7 4.1l-15.72.91c-.44-1-.0-3.41 1.59-3.87l4.1-1.14V30.34l-5.7-.45c-.44-2.05.68-5 3.86-5.24l16.84-1.14 25.1 38.35V28.5l-5.93-.68c-.46-2.5 1.36-4.32 3.63-4.55l15.72-.9z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    svg: (
      <svg viewBox="0 0 98 96" fill="currentColor" className="h-5 w-auto">
        <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0112.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
      </svg>
    ),
  },
  {
    name: "Supabase",
    svg: (
      <svg viewBox="0 0 109 113" fill="currentColor" className="h-5 w-auto">
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" />
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fillOpacity=".3" />
        <path d="M45.317 2.716c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.935c-8.19 0-12.759-9.46-7.666-15.875L45.317 2.716z" />
      </svg>
    ),
  },
  {
    name: "Slack",
    svg: (
      <svg viewBox="0 0 127 127" fill="currentColor" className="h-5 w-auto">
        <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" opacity=".8" />
        <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" opacity=".8" />
        <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2v-33c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33z" opacity=".8" />
        <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" opacity=".8" />
      </svg>
    ),
  },
  {
    name: "Loom",
    svg: (
      <svg viewBox="0 0 48 48" fill="currentColor" className="h-5 w-auto">
        <path d="M24 0C10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24S37.255 0 24 0zm11.677 26.4h-9.077l6.408 6.408-2.4 2.4L24.2 28.8v9.077H20.8v-9.077l-6.408 6.408-2.4-2.4L18.4 26.4H9.323v-3.4H18.4l-6.408-6.408 2.4-2.4L20.8 20.6V11.523h3.4V20.6l6.408-6.408 2.4 2.4L26.6 23h9.077v3.4z" />
      </svg>
    ),
  },
  {
    name: "Jira",
    svg: (
      <svg viewBox="0 0 496 512" fill="currentColor" className="h-5 w-auto">
        <path d="M490 241.7C417.1 169 320.6 71.8 248.5 0 83 164.9 6 241.7 6 241.7c-7.9 7.9-7.9 20.7 0 28.7C138.8 402.7 67.8 331.9 248.5 512c379.4-378 15.7-16 241.5-241.7 8-7.9 8-20.7 0-28.6zm-241.5 90l-76-75.7 76-75.7 76 75.7-76 75.7z" />
      </svg>
    ),
  },
];

function Marquee() {
  return (
    <div className="py-14 bg-[#050505] border-y border-white/[0.05] overflow-hidden">
      <p className="text-center text-xs text-white/20 uppercase tracking-[0.15em] font-medium mb-10">
        Trusted by teams at world-class companies
      </p>
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="flex shrink-0 gap-16 items-center"
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 text-white/25 hover:text-white/55 transition-colors duration-300 shrink-0 select-none"
              title={logo.name}
            >
              {logo.svg}
              <span className="text-base font-semibold tracking-tight">{logo.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Stats ─────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    { value: "10k+", label: "Issues tracked", sub: "across all workspaces" },
    { value: "500+", label: "Teams onboarded", sub: "and growing daily" },
    { value: "6", label: "Powerful views", sub: "to track your work" },
    { value: "99.9%", label: "Uptime SLA", sub: "always-on reliability" },
  ];

  return (
    <section className="bg-[#050505] py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06]">
          {stats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.08}>
              <div className="bg-[#050505] px-8 py-10 text-center hover:bg-white/[0.015] transition-colors">
                <div className="text-4xl sm:text-5xl font-black text-white mb-1 tracking-tight">{s.value}</div>
                <div className="text-sm font-semibold text-white/60 mb-1">{s.label}</div>
                <div className="text-xs text-white/25">{s.sub}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────── */
function Features() {
  const features = [
    { icon: Kanban, title: "Kanban Board", desc: "Drag and drop tasks across fully customizable columns. See every issue's status at a glance.", span: "col-span-1" },
    { icon: Zap, title: "Sprint Planning", desc: "Plan and run sprints with story points, goals, and velocity tracking. Stay predictable.", span: "col-span-1" },
    { icon: ListChecks, title: "Backlog Management", desc: "Your full project backlog, prioritized. Filter, bulk-edit, and groom with ease.", span: "col-span-1" },
    { icon: CalendarDays, title: "Timeline View", desc: "Visualize milestones on a Gantt-style timeline and spot blockers before they land.", span: "col-span-1" },
    { icon: Users, title: "Workload Balancing", desc: "See who's overloaded and who's free. Redistribute work in seconds, not hours.", span: "col-span-1" },
    { icon: BarChart3, title: "Reports & Analytics", desc: "Velocity charts, burndowns, and completion rates. Make data-driven decisions.", span: "col-span-1" },
    { icon: Bell, title: "Real-time Updates", desc: "Live sync across all devices. Everyone sees changes the moment they happen.", span: "col-span-1" },
    { icon: Shield, title: "Roles & Permissions", desc: "Owner, admin, member, and viewer roles — per project, per person.", span: "col-span-1" },
  ];

  return (
    <section id="features" className="bg-[#050505] py-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 bg-[#FF1616]/10 border border-[#FF1616]/20 rounded-full px-3.5 py-1 text-xs text-[#FF1616] font-semibold uppercase tracking-wider mb-5">
            <LayoutGrid size={11} /> Features
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black text-white tracking-tight leading-[1.08] mb-4">
            One workspace.<br />Every workflow.
          </h2>
          <p className="text-white/40 text-lg max-w-lg mx-auto leading-relaxed">
            Stop juggling 5 tools. Blockan brings your entire project lifecycle into one focused place.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06]">
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.05}>
              <div className="group bg-[#050505] p-6 hover:bg-white/[0.025] transition-all duration-300 cursor-default h-full">
                <div className="w-10 h-10 rounded-xl bg-[#FF1616]/10 border border-[#FF1616]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF1616]/20 group-hover:border-[#FF1616]/30 group-hover:scale-110 transition-all duration-300">
                  <f.icon size={17} className="text-[#FF1616]" />
                </div>
                <h3 className="text-white font-bold mb-2 text-sm">{f.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", icon: GitBranch, title: "Create your workspace", desc: "Sign up in 30 seconds. Name your project, pick a color, and you're ready. No config files, no setup docs." },
    { num: "02", icon: Users, title: "Invite your team", desc: "Email invites with role-based access. Owners, admins, members — each with exactly the right permissions." },
    { num: "03", icon: Layers, title: "Plan your sprints", desc: "Drag issues from backlog into a sprint. Set story points and a goal. Hit start." },
    { num: "04", icon: TrendingUp, title: "Track and ship", desc: "Watch progress across every view in real time. Close the sprint, review velocity, repeat." },
  ];

  return (
    <section id="how-it-works" className="relative bg-[#050505] py-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,22,22,0.07), transparent 65%)" }} />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-xs text-white/50 font-semibold uppercase tracking-wider mb-5">
            <Clock size={11} /> Process
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black text-white tracking-tight leading-[1.08] mb-4">
            Up and running<br />in minutes
          </h2>
          <p className="text-white/40 text-lg max-w-md mx-auto">Four steps from signup to shipping your first sprint.</p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.1}>
              <div className="relative group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-[#FF1616]/25 hover:bg-white/[0.035] transition-all duration-300 h-full">
                {/* Number */}
                <div className="text-[3.5rem] font-black leading-none mb-3 select-none text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)" }}>{step.num}</div>
                <div className="w-9 h-9 rounded-xl bg-[#FF1616]/10 border border-[#FF1616]/15 flex items-center justify-center mb-4 group-hover:bg-[#FF1616]/20 transition-colors">
                  <step.icon size={15} className="text-[#FF1616]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{step.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{step.desc}</p>

                {/* Connector */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-2 w-4 h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature highlights ────────────────────────────────────── */
function FeatureHighlights() {
  return (
    <section className="bg-[#050505] py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 space-y-20">

        {/* Highlight 1 — Keyboard */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          <FadeUp>
            <div className="inline-flex items-center gap-1.5 bg-[#FF1616]/10 border border-[#FF1616]/20 rounded-full px-3.5 py-1 text-xs text-[#FF1616] font-semibold uppercase tracking-wider mb-5">
              Speed first
            </div>
            <h3 className="text-[clamp(1.7rem,4vw,2.8rem)] font-black text-white tracking-tight leading-[1.1] mb-4">
              Built for<br />keyboard-first teams
            </h3>
            <p className="text-white/40 text-base leading-relaxed mb-6">
              Every action has a shortcut. Open the command palette, create issues, navigate views — without touching the mouse. Your team moves at the speed of thought.
            </p>
            <ul className="space-y-3">
              {["Global command palette (⌘K)", "Issue creation in 2 keystrokes", "Instant search across all projects", "Custom navigation shortcuts"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-white/55 text-sm">
                  <div className="w-4 h-4 rounded-full bg-[#FF1616]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={10} className="text-[#FF1616]" />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          </FadeUp>

          <FadeIn delay={0.15}>
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.07]"
              style={{
                background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)",
              }}
            >
              {/* Keyboard background */}
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 280'%3E%3Crect width='800' height='280' fill='%23111'/%3E%3C!-- Row 1 --%3E%3Crect x='10' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='74' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='138' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='202' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='266' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='330' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='394' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='458' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='522' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='586' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='650' y='10' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='714' y='10' width='76' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3C!-- Row 2 --%3E%3Crect x='10' y='66' width='76' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='94' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='158' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='222' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='286' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='350' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='414' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='478' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='542' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='606' y='66' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='670' y='66' width='120' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3C!-- Row 3 --%3E%3Crect x='10' y='122' width='90' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='108' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='172' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='236' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='300' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='364' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='428' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='492' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='556' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='620' y='122' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='684' y='122' width='106' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3C!-- Row 4 --%3E%3Crect x='10' y='178' width='110' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='128' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='192' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='256' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='320' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='384' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='448' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='512' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='576' y='178' width='56' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3Crect x='640' y='178' width='150' height='48' rx='6' fill='%23fff' opacity='.9'/%3E%3C!-- Spacebar --%3E%3Crect x='180' y='234' width='440' height='36' rx='6' fill='%23fff' opacity='.9'/%3E%3C/svg%3E")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Red glow overlay */}
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(255,22,22,0.18) 0%, transparent 65%)" }} />
              {/* Content */}
              <div className="relative p-6 space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#FF1616]/60 animate-pulse" />
                  <span className="text-white/25 text-xs">Command palette active</span>
                </div>
                {[
                  { key: "⌘+K", action: "Open command palette" },
                  { key: "C", action: "Create new issue" },
                  { key: "⌘+/", action: "View all shortcuts" },
                  { key: "⌘+⇧+F", action: "Search everything" },
                  { key: "G+B", action: "Go to board" },
                  { key: "G+S", action: "Go to sprints" },
                ].map((s, i) => (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group cursor-default"
                  >
                    <kbd className="px-2.5 py-1 rounded-lg bg-white/[0.07] border border-white/[0.1] text-white/70 text-[11px] font-mono min-w-[52px] text-center shrink-0 group-hover:border-[#FF1616]/40 group-hover:text-white transition-colors shadow-sm">
                      {s.key}
                    </kbd>
                    <span className="text-white/40 text-sm group-hover:text-white/65 transition-colors">{s.action}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Highlight 2 — Real-time */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          <FadeIn delay={0.1} className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-bl from-blue-500/10 via-transparent to-transparent" />
              <div className="relative bg-[#0e0e0e] rounded-2xl border border-white/[0.07] p-6">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-white/50 text-sm font-medium">Live activity</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400/70 text-xs">3 online</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { user: "KG", bg: "bg-[#FF1616]/20", text: "text-[#FF1616]", action: "moved AUTH-42 → In Progress", time: "now" },
                    { user: "SJ", bg: "bg-blue-500/20", text: "text-blue-400", action: "commented on DASH-19", time: "2s" },
                    { user: "AM", bg: "bg-violet-500/20", text: "text-violet-400", action: "created issue API-88", time: "5s" },
                    { user: "KG", bg: "bg-[#FF1616]/20", text: "text-[#FF1616]", action: "closed Sprint 4 ✓", time: "1m" },
                    { user: "SJ", bg: "bg-blue-500/20", text: "text-blue-400", action: "assigned BACK-12 to AM", time: "2m" },
                  ].map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${ev.bg} ${ev.text}`}>
                        {ev.user}
                      </div>
                      <span className="text-white/35 text-xs flex-1 leading-snug">{ev.action}</span>
                      <span className="text-white/15 text-xs shrink-0">{ev.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeUp delay={0.1} className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-xs text-white/50 font-semibold uppercase tracking-wider mb-5">
              Real-time
            </div>
            <h3 className="text-[clamp(1.7rem,4vw,2.8rem)] font-black text-white tracking-tight leading-[1.1] mb-4">
              Your team stays<br />in sync, always
            </h3>
            <p className="text-white/40 text-base leading-relaxed mb-6">
              Blockan updates live across all devices. Assign, move, comment — everyone sees it the moment it happens. No refresh, no stale data.
            </p>
            <ul className="space-y-3">
              {["Live sync across every view", "Instant notification delivery", "Collaborative without conflicts", "Per-issue activity timeline"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-white/55 text-sm">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={10} className="text-white/50" />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ──────────────────────────────────────────── */
function Testimonials() {
  const items = [
    { name: "Sarah Chen", role: "Engineering Lead at Vercel", avatar: "SC", color: "bg-[#FF1616]/20 text-[#FF1616]", quote: "Blockan replaced Linear, Notion, and Jira for us. The speed is unmatched — our team moved from 'what's the status?' to 'I just saw it move' in one sprint." },
    { name: "Marcus Rivera", role: "CTO at Stripe Ventures", avatar: "MR", color: "bg-blue-500/20 text-blue-400", quote: "The keyboard shortcuts alone sold our team. We're 30% faster at sprint planning and the backlog view is the cleanest I've ever used. Genuinely delightful." },
    { name: "Priya Nair", role: "Product Manager at Figma", avatar: "PN", color: "bg-violet-500/20 text-violet-400", quote: "Real-time updates changed how we do standups. We stopped asking for status updates and just point at the board. It sounds small but it's massive." },
  ];

  return (
    <section className="bg-[#050505] py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-14">
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black text-white tracking-tight mb-3">Loved by fast teams</h2>
          <p className="text-white/35 text-base">Don't take our word for it.</p>
        </FadeUp>

        <div className="grid sm:grid-cols-3 gap-4">
          {items.map((t, i) => (
            <FadeUp key={t.name} delay={i * 0.1}>
              <div className="group bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 hover:border-white/12 hover:bg-white/[0.04] transition-all duration-300 h-full flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={13} className="fill-[#FF1616] text-[#FF1616]" />
                  ))}
                </div>
                <p className="text-white/55 text-sm leading-relaxed flex-1 mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-white/30 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────── */
function CTA() {
  return (
    <section id="pricing" className="bg-[#050505] py-24">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Border gradient */}
            <div className="absolute inset-0 rounded-3xl p-px" style={{ background: "linear-gradient(135deg, rgba(255,22,22,0.4), rgba(255,22,22,0.05) 50%, rgba(255,22,22,0.15))" }}>
              <div className="w-full h-full rounded-3xl bg-[#0e0e0e]" />
            </div>

            {/* Content */}
            <div className="relative p-10 sm:p-14 text-center">
              <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,22,22,0.12), transparent 65%)" }} />

              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 0.95, 1] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                  className="text-5xl mb-6 inline-block"
                >
                  🚀
                </motion.div>

                <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black text-white tracking-tight leading-[1.08] mb-4">
                  Ready to ship faster?
                </h2>
                <p className="text-white/40 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  Join 500+ teams using Blockan to plan, track, and deliver great software — together.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  <Link href="/register"
                    className="group inline-flex items-center gap-2 bg-[#FF1616] hover:bg-[#d41313] text-white font-bold px-8 py-3.5 rounded-xl transition-all text-base shadow-xl shadow-red-900/30 hover:shadow-red-900/50 hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Start for free
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link href="/login" className="text-white/40 hover:text-white/70 transition-colors text-sm font-medium">
                    Already have an account? Sign in →
                  </Link>
                </div>

                <p className="text-white/18 text-xs">No credit card required · Free plan available · Cancel anytime</p>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#050505] pt-0 pb-10">
      {/* Divider */}
      <div className="w-full h-px bg-white/[0.06] mb-10" />
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoMark size={28} />
              <span className="text-white font-bold text-base">Blockan</span>
            </div>
            <p className="text-white/28 text-sm leading-relaxed max-w-[200px]">
              Project management for teams that ship great software, fast.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [{ label: "Features", href: "#features" }, { label: "How it works", href: "#how-it-works" }, { label: "Changelog", href: "#" }],
            },
            {
              title: "Company",
              links: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }],
            },
            {
              title: "Legal",
              links: [{ label: "Privacy", href: "#" }, { label: "Terms", href: "#" }, { label: "Security", href: "#" }],
            },
          ].map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="text-white/55 font-semibold text-xs uppercase tracking-wider">{col.title}</p>
              {col.links.map((l) => (
                <a key={l.label} href={l.href} className="block text-white/28 hover:text-white/60 transition-colors text-sm">{l.label}</a>
              ))}
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/18 text-xs">© {new Date().getFullYear()} Blockan. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-white/18 hover:text-white/45 transition-colors text-xs">Sign in</Link>
            <Link href="/register" className="text-white/18 hover:text-white/45 transition-colors text-xs">Get started free</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="bg-[#050505] min-h-screen">
      <Nav />
      <Hero />
      <Marquee />
      <Stats />
      <Features />
      <HowItWorks />
      <FeatureHighlights />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
