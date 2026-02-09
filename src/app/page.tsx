import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── featured projects ─────────────────────────────────────────── */

const featured = [
  {
    title: "Grid Analyst",
    outcome:
      "Compare pricing grids, highlight WAC differences across cohorts, and run AI-assisted what-if simulations — all from real experiment data.",
    tags: ["Next.js", "OpenAI", "dbt-style metrics", "A/B readouts"],
    href: "/demo/grid-analyst",
    live: true,
  },
  {
    title: "Court IQ — Tactical Spacing",
    outcome:
      "Upload an NBA broadcast screenshot; GPT-4o detects players, then geometric analysis renders Voronoi territories, driving lanes, and a spacing score.",
    tags: ["GPT-4o vision", "Voronoi", "spatial analysis", "SVG"],
    href: "/demo/court-vision",
    live: true,
  },
  {
    title: "NBA Shot Chart Explorer",
    outcome:
      "Hexbin heatmaps, hot-zone overlays vs league average, player head-to-head, momentum tracking, and career arcs for 6 NBA stars.",
    tags: ["nba_api", "CV-inspired", "animation", "React"],
    href: "/demo/nba-viz",
    live: true,
  },
];

/* ── how I work ────────────────────────────────────────────────── */

const howIWork = [
  {
    emoji: "1",
    title: "Define metric contracts + guardrails",
    desc: "Tests, freshness checks, lineage — so every number has a source of truth.",
  },
  {
    emoji: "2",
    title: "Model clean warehouse tables for reliable analysis",
    desc: "dbt + Snowflake layers that analysts and models can trust.",
  },
  {
    emoji: "3",
    title: "Ship tools that make decisions faster",
    desc: "A/B readouts, grid diffing, AI copilots — from prototype to production.",
  },
];

/* ── proof chips ───────────────────────────────────────────────── */

const proofChips = [
  "Owned metrics layer across $20B+ portfolio",
  "Built grid diff + experiment tooling",
  "Shipped AI-assisted pricing analysis",
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

        {/* ── hero ──────────────────────────────────────────── */}
        <section className="relative mt-20">
          {/* headline — outcome-forward */}
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-white sm:text-5xl">
            I ship analytics products: semantic metrics, warehouse models, and AI&#8209;assisted analysis.
          </h1>

          {/* subhead — concrete proof points */}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            dbt + Snowflake &middot; metric definitions + tests &middot; A/B experiment readouts &middot; pricing grid diffs &middot; LLM-powered copilots
          </p>

          {/* credibility row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/40">
            <span>8+ yrs building decision systems</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Lending &middot; Pricing &middot; Fintech</span>
            <span className="hidden sm:inline text-white/15">|</span>
            <span>Python, SQL, dbt, Snowflake, Airflow, Looker</span>
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
              <Link href="/demo/grid-analyst">Open Grid Analyst Demo</Link>
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

        {/* ── how I work ────────────────────────────────────── */}
        <section className="mt-20">
          <h2 className="text-lg font-semibold text-white">How I work</h2>
          <p className="mt-2 text-sm text-white/40">
            From metric definitions to shipped tools — end to end.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {howIWork.map((step) => (
              <div key={step.title} className="relative pl-10">
                {/* step number */}
                <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] font-semibold text-white/50">
                  {step.emoji}
                </div>
                <h3 className="text-[13px] font-medium text-white/80">{step.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{step.desc}</p>
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
