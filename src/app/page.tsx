import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── status bar metadata ──────────────────────────────────────── */

const statusMeta = [
  { key: "Status", value: "Building", color: "text-emerald-400/70" },
  { key: "Domain", value: "Data Science / ML / AI Applications", color: "text-white/45" },
  { key: "Stack", value: "Python · SQL · LLMs · APIs · Product UX", color: "text-white/45" },
  { key: "Mode", value: "ANALYTICS_ACTIVE", color: "text-emerald-400/70" },
  { key: "Access", value: "Public", color: "text-white/45" },
];

/* ── featured projects ─────────────────────────────────────────── */

const featured = [
  {
    title: "Grid Analyst",
    outcome:
      "An intelligence cockpit for pricing telemetry: cohort drill-downs, historical replay, and AI-assisted what-if simulations with low-latency interactions.",
    tags: ["OpenAI", "interactive telemetry", "A/B readouts"],
    href: "/demo/grid-analyst",
    live: true,
  },
  {
    title: "Pricing Compliance Radar",
    outcome:
      "Monte Carlo-driven compliance cockpit with real-time anomaly triage, confidence bands, product-level risk heatmaps, and pricing guardrail simulation.",
    tags: ["risk analytics", "Monte Carlo alerting", "compliance telemetry"],
    href: "/demo/pricing-compliance",
    live: true,
  },
  {
    title: "Court IQ — Tactical Spacing",
    outcome:
      "Vision + geometry analytics application: GPT-4o detects entities, then real-time overlays render control zones, matchup pressure, and actionable spacing insights.",
    tags: ["GPT-4o vision", "custom visualization", "spatial analysis", "SVG"],
    href: "/demo/court-vision",
    live: true,
  },
];

/* ── principles ────────────────────────────────────────────────── */

const principles = [
  {
    num: "001",
    title: "Real-Time Decision UX",
    desc: "Design dashboards and intelligence surfaces that reduce decision latency, not just display charts.",
  },
  {
    num: "002",
    title: "Petabyte-Ready Architecture Thinking",
    desc: "Combine speed-layer patterns with warehouse/lakehouse modeling so interactive experiences remain fast as data grows.",
  },
  {
    num: "003",
    title: "ML + UX Bridge",
    desc: "Translate model outputs into intuitive interfaces: simulation controls, confidence views, and narrative summaries for non-technical stakeholders.",
  },
  {
    num: "004",
    title: "Agentic Analytics Systems",
    desc: "Build tool-using LLM workflows and API-first services that automate multi-step analysis while keeping humans in the loop.",
  },
];

/* ── proof chips ───────────────────────────────────────────────── */

const proofChips = [
  "8+ years across DS, ML, and analytics engineering",
  "Owned analytics on $20B+ lending portfolio",
  "Shipped AI-assisted applications and decision tooling",
  "Built APIs, pipelines, and workflow automation",
];

const roleFit = [
  {
    need: "Data scientist who ships production applications",
    evidence: "From experimentation and simulation to user-facing apps, projects combine statistical rigor with product-oriented implementation.",
  },
  {
    need: "ML + AI workflows tied to business outcomes",
    evidence: "What-if simulation, model-guided narratives, and automation layers convert ML signals into measurable operating decisions.",
  },
  {
    need: "Scalable data and platform thinking",
    evidence: "Work emphasizes robust data pipelines, experimentation frameworks, and low-latency analytics experiences over large datasets.",
  },
  {
    need: "Visualization as communication, not just charts",
    evidence: "Visualization is used alongside modeling, experimentation, and APIs to make complex systems intuitive for operators and executives.",
  },
];

const beyondWork = [
  "Biohacking and performance optimization",
  "Fantasy sports analytics and game theory",
  "Cooking projects (Rasam Roots)",
];

/* ── page ──────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <>
      {/* skip link for a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white/10 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        Skip to content
      </a>

      <main id="main-content" className="relative mx-auto max-w-5xl px-6 py-12">
        {/* ── grid lines background ─────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* vertical lines */}
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "120px 100%",
          }} />
          {/* horizontal lines */}
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "100% 120px",
          }} />
          {/* corner crosshairs */}
          {[
            "top-6 left-6",
            "top-6 right-6",
            "bottom-6 left-6",
            "bottom-6 right-6",
          ].map((pos) => (
            <div key={pos} className={`absolute ${pos}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/[0.12]">
                <line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" strokeWidth="0.5" />
                <line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>
          ))}
          {/* accent glow behind hero */}
          <div className="absolute left-1/2 top-[200px] -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-white/[0.015] blur-[100px]" />
        </div>

        {/* ── nav ───────────────────────────────────────────── */}
        <header className="relative flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-white hover:text-white/80 transition">
            Akhil Reddy
          </Link>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link className="hover:text-foreground transition" href="/projects">
              Work
            </Link>
            <Link className="hover:text-foreground transition" href="/demo/pricing-compliance">
              Compliance Radar
            </Link>
            <Link className="hover:text-foreground transition" href="/demo/grid-analyst">
              Demos
            </Link>
            <Link className="hover:text-foreground transition" href="/about">
              About
            </Link>
          </nav>
        </header>

        {/* ── terminal status bar ──────────────────────────── */}
        <div className="relative mt-10 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px]">
          {statusMeta.map((m) => (
            <span key={m.key}>
              <span className="text-white/25">{m.key}</span>
              <span className="text-white/10">:</span>
              <span className={`ml-1 ${m.color}`}>{m.value}</span>
            </span>
          ))}
        </div>

        {/* ── hero ──────────────────────────────────────────── */}
        <section className="relative mt-14">
          {/* headline — outcome-forward */}
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-white sm:text-5xl">
            I build data and AI applications: from ML modeling and experimentation to production products and decision systems.
          </h1>

          {/* subhead — concrete proof points */}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            Python + SQL + Spark &middot; ML experimentation &middot; AI application workflows &middot; API-first systems &middot; interactive analytics and visualization
          </p>

          {/* credibility row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/40">
            <span>8+ yrs building decision systems</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Data Science &middot; ML &middot; AI Applications</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Modeling, experimentation, pipelines, product UX</span>
          </div>

          {/* proof chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {proofChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1 text-[11px] text-emerald-300/70"
              >
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {chip}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="rounded-xl">
              <Link href="/demo/grid-analyst">Open Intelligence Cockpit Demo</Link>
            </Button>
            <Button variant="secondary" asChild size="lg" className="rounded-xl">
              <Link href="/projects">View selected work</Link>
            </Button>
          </div>

          {/* microcopy */}
          <p className="mt-2.5 text-[11px] text-white/25">
            No login &middot; sample data &middot; 60 seconds to try
          </p>

          {/* small links */}
          <div className="mt-4 flex gap-5 text-[11px] text-white/30">
            <Link href="/about" className="underline decoration-white/10 hover:text-white/50 transition">
              Resume
            </Link>
            <a
              href="https://www.linkedin.com/in/areddyakhil/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/10 hover:text-white/50 transition"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/areddy8"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/10 hover:text-white/50 transition"
            >
              GitHub
            </a>
          </div>
        </section>

        {/* ── signature visual / featured work preview ────── */}
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-white">Featured work</h2>
            <Link
              className="text-sm text-white/40 hover:text-white/70 transition"
              href="/projects"
            >
              All projects &rarr;
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-6 transition hover:border-white/[0.12] hover:from-white/[0.06] hover:to-white/[0.03] hover:shadow-lg"
              >
                {/* live badge */}
                {p.live && (
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live demo
                  </span>
                )}

                <h3 className="text-[15px] font-semibold text-white group-hover:text-white/90">
                  {p.title}
                </h3>

                <p className="mt-2 text-[12px] leading-relaxed text-white/45 group-hover:text-white/55">
                  {p.outcome}
                </p>

                {/* tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="border-white/[0.06] bg-white/[0.04] text-[10px] text-white/40"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* arrow */}
                <div className="mt-5 text-[12px] font-medium text-white/30 group-hover:text-white/60 transition">
                  Open &rarr;
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── role-fit matrix ───────────────────────────────── */}
        <section className="mt-20">
          <h2 className="text-lg font-semibold text-white">Role fit: Data Scientist + ML/AI Product Builder</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
            Portfolio evidence across data science, machine learning, AI-enabled workflows, and production-grade application development.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/[0.06]">
            {roleFit.map((item) => (
              <div key={item.need} className="grid gap-3 bg-white/[0.02] p-6 sm:grid-cols-[1.1fr_1.9fr]">
                <div className="text-[12px] font-medium text-white/75">{item.need}</div>
                <p className="text-[12px] leading-relaxed text-white/45">{item.evidence}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── what I believe in ─────────────────────────────── */}
        <section className="mt-20">
          <h2 className="text-lg font-semibold text-white">What I believe in</h2>
          <p className="mt-2 text-sm text-white/40">
            The principles behind how I build.
          </p>

          <div className="mt-8 grid gap-px sm:grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.06]">
            {principles.map((p) => (
              <div
                key={p.num}
                className="relative bg-white/[0.02] p-8 transition hover:bg-white/[0.04]"
              >
                <span className="font-mono text-[11px] text-white/30">{p.num} &middot;</span>
                <h3 className="mt-2 text-[15px] font-semibold text-white">{p.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-white/40">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-lg font-semibold text-white">Beyond work</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
            Outside analytics and product work, I spend time on personal experiments around health, sports strategy, and cooking.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {beyondWork.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/55"
              >
                {item}
              </span>
            ))}
            <a
              href="https://rasam-roots2.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-[11px] text-white/75 hover:text-white"
            >
              Rasam Roots Live →
            </a>
          </div>
        </section>

        {/* ── footer ────────────────────────────────────────── */}
        <footer className="mt-24 border-t border-white/[0.06] pt-8 pb-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] text-white/25">
              &copy; {new Date().getFullYear()} Akhil Reddy
            </div>
            <div className="flex gap-5 text-[12px] text-white/30">
              <Link href="/about" className="hover:text-white/50 transition">
                About
              </Link>
              <Link href="/projects" className="hover:text-white/50 transition">
                Projects
              </Link>
              <a
                href="mailto:areddyakhil8@gmail.com"
                className="hover:text-white/50 transition"
              >
                Email
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
