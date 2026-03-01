import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── status bar metadata ──────────────────────────────────────── */

const statusMeta = [
  { key: "Status", value: "Building", color: "text-emerald-400/70" },
  { key: "Domain", value: "AI Infra / Analytics / Fintech", color: "text-white/45" },
  { key: "Stack", value: "SQL · Python · Spark · APIs · LLM tools", color: "text-white/45" },
  { key: "Mode", value: "ANALYTICS_ACTIVE", color: "text-emerald-400/70" },
  { key: "Access", value: "Public", color: "text-white/45" },
];

/* ── featured projects ─────────────────────────────────────────── */

const featured = [
  {
    title: "Grid Analyst",
    outcome:
      "An intelligence cockpit for pricing telemetry: cohort drill-downs, historical replay, and AI-assisted what-if simulations with low-latency interactions.",
    tags: ["Next.js", "OpenAI", "interactive telemetry", "A/B readouts"],
    href: "/demo/grid-analyst",
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
  {
    title: "NBA Shot Chart Explorer",
    outcome:
      "High-density visual storytelling with hexbin heatmaps, trend overlays, and comparative insights designed for fast executive-level data discovery.",
    tags: ["data visualization", "multivariate analysis", "animation", "React"],
    href: "/demo/nba-viz",
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
  "8+ years in data products and dashboard engineering",
  "Owned analytics on $20B+ lending portfolio",
  "Shipped AI-assisted decision tooling and narratives",
  "Built APIs + workflow automation for analyst speed",
];

const roleFit = [
  {
    need: "Rapid dashboard prototyping and production UX",
    evidence: "Grid Analyst ships interactive KPI strips, heatmaps, historical replay, and what-if simulation in a production-style interface.",
  },
  {
    need: "Bridge ML outputs and executive decision workflows",
    evidence: "What-if simulation, AI narrative generation, and confidence-driven visual summaries turn model behavior into action-ready recommendations.",
  },
  {
    need: "Large-scale data + low-latency discovery",
    evidence: "Portfolio demos emphasize speed-layer thinking, filtered cohort exploration, and query-efficient summaries over high-volume datasets.",
  },
  {
    need: "AI agent workflows and orchestration services",
    evidence: "Experience building MCP-based tool layers and LLM-assisted diff workflows that automate multi-step analysis with human review.",
  },
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
            <Link className="hover:text-foreground transition" href="/demo/grid-analyst">
              Demos
            </Link>
            <Link className="hover:text-foreground transition" href="/demo/nba-viz">
              Viz
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
            I build real-time intelligence products where data visualization, ML insights, and engineering meet.
          </h1>

          {/* subhead — concrete proof points */}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            SQL + Python + Spark patterns &middot; interactive analytics UX &middot; predictive insight visualization &middot; API-first services &middot; agentic AI workflows
          </p>

          {/* credibility row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/40">
            <span>8+ yrs building decision systems</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Data Viz &middot; Data Science &middot; Data Engineering</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Python, SQL, Spark, APIs, LLM tools, cloud data stacks</span>
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
              href="https://linkedin.com/in/akhilreddy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/10 hover:text-white/50 transition"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/akhilreddy"
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
          <h2 className="text-lg font-semibold text-white">Role fit: Senior Data Visualization + AI Systems</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
            Portfolio evidence mapped to high-bar requirements across dashboard engineering, large-scale analytics, ML literacy, and AI agent orchestration.
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
                href="mailto:areddyakhil@gmail.com"
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
