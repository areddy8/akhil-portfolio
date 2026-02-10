import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── stats ─────────────────────────────────────────────────────── */

const stats = [
  { value: "$20B+", label: "Portfolio managed" },
  { value: "70%", label: "Faster analysis cycles" },
  { value: "1,000+", label: "Deployments monitored" },
  { value: "99.9%", label: "Compliance accuracy" },
];

/* ── status bar metadata ──────────────────────────────────────── */

const statusMeta = [
  { key: "Status", value: "Building" },
  { key: "Domain", value: "Lending / Pricing / Fintech" },
  { key: "Stack", value: "dbt · Snowflake · Python · Airflow" },
  { key: "Mode", value: "ANALYTICS_ACTIVE" },
  { key: "Access", value: "Public" },
];

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

/* ── principles ────────────────────────────────────────────────── */

const principles = [
  {
    title: "Metrics You Can Trust",
    desc: "Define metric contracts with tests, freshness checks, and lineage — so every number has one source of truth.",
  },
  {
    title: "Models That Scale",
    desc: "Clean warehouse layers in dbt + Snowflake that analysts, ML pipelines, and dashboards can all depend on.",
  },
  {
    title: "Tools That Ship",
    desc: "A/B readouts, grid diffing, AI copilots — from prototype to production. If it saves a decision-maker time, it gets built.",
  },
  {
    title: "Rigor at Speed",
    desc: "Compliance monitoring, Monte Carlo alerting, automated QA — move fast without breaking trust.",
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

      <main id="main-content" className="relative min-h-screen">
        {/* ── grid lines background (full page) ─────────────── */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          {/* vertical lines */}
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "140px 100%",
          }} />
          {/* horizontal lines */}
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "100% 140px",
          }} />
          {/* corner crosshairs */}
          {[
            "top-4 left-4",
            "top-4 right-4",
          ].map((pos) => (
            <div key={pos} className={`absolute ${pos}`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/[0.1]">
                <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="0.5" />
                <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>
          ))}
          {/* accent glow */}
          <div className="absolute left-1/2 top-[280px] -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-white/[0.012] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-12">
          {/* ── nav ───────────────────────────────────────────── */}
          <header className="flex items-center justify-between">
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
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px]">
            {statusMeta.map((m) => (
              <span key={m.key}>
                <span className="text-white/25">{m.key}</span>
                <span className="text-white/10">:</span>
                <span className={`ml-1 ${m.value === "ANALYTICS_ACTIVE" ? "text-emerald-400/60" : m.value === "Building" ? "text-amber-400/60" : "text-white/45"}`}>
                  {m.value}
                </span>
              </span>
            ))}
          </div>

          {/* ── hero ──────────────────────────────────────────── */}
          <section className="mt-16">
            <h1 className="max-w-4xl text-[clamp(2.2rem,5.5vw,4rem)] font-semibold leading-[1.08] tracking-tight text-white">
              I ship analytics products: semantic metrics, warehouse models, and AI&#8209;assisted&nbsp;analysis.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/50">
              dbt + Snowflake &middot; metric definitions + tests &middot; A/B experiment readouts &middot; pricing grid diffs &middot; LLM-powered copilots
            </p>

            {/* credibility row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/35">
              <span>8+ yrs building decision systems</span>
              <span className="hidden sm:inline text-white/10">|</span>
              <span>Lending &middot; Pricing &middot; Fintech</span>
              <span className="hidden sm:inline text-white/10">|</span>
              <span>Python, SQL, dbt, Snowflake, Airflow, Looker</span>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/demo/grid-analyst">Open Grid Analyst Demo</Link>
              </Button>
              <Button variant="secondary" asChild size="lg" className="rounded-xl">
                <Link href="/projects">View selected work</Link>
              </Button>
            </div>

            <p className="mt-2.5 text-[11px] text-white/20 font-mono">
              No login &middot; sample data &middot; 60 seconds to try
            </p>
          </section>

          {/* ── stat counters ─────────────────────────────────── */}
          <section className="mt-24 border-y border-white/[0.06] py-12">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-[12px] text-white/35">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── featured work ─────────────────────────────────── */}
          <section className="mt-24">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-semibold text-white">Featured work</h2>
              <Link
                className="text-sm text-white/35 hover:text-white/60 transition font-mono"
                href="/projects"
              >
                All projects &rarr;
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <Link
                  key={p.title}
                  href={p.href}
                  className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 transition hover:border-white/[0.12] hover:from-white/[0.06] hover:shadow-lg"
                >
                  {p.live && (
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-medium font-mono text-emerald-400/80">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}

                  <h3 className="text-[15px] font-semibold text-white group-hover:text-white/90">
                    {p.title}
                  </h3>

                  <p className="mt-2.5 text-[12px] leading-relaxed text-white/40 group-hover:text-white/55">
                    {p.outcome}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="border-white/[0.06] bg-white/[0.03] text-[10px] font-mono text-white/35"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 text-[12px] font-mono font-medium text-white/25 group-hover:text-white/60 transition">
                    Open &rarr;
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── principles (Cult "We Believe In" style) ──────── */}
          <section className="mt-28">
            <h2 className="text-xl font-semibold text-white">What I believe in</h2>
            <p className="mt-2 text-sm text-white/35">
              The principles behind how I build.
            </p>

            <div className="mt-10 grid gap-px sm:grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.06]">
              {principles.map((p) => (
                <div
                  key={p.title}
                  className="bg-white/[0.02] p-8 transition hover:bg-white/[0.04]"
                >
                  <h3 className="text-[16px] font-semibold text-white">{p.title}</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-white/40">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── small links row ───────────────────────────────── */}
          <section className="mt-24 flex flex-wrap items-center justify-center gap-6 text-[12px] font-mono text-white/25">
            <Link href="/about" className="hover:text-white/50 transition">
              Resume
            </Link>
            <span className="text-white/10">·</span>
            <a
              href="https://linkedin.com/in/akhilreddy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/50 transition"
            >
              LinkedIn
            </a>
            <span className="text-white/10">·</span>
            <a
              href="https://github.com/akhilreddy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/50 transition"
            >
              GitHub
            </a>
            <span className="text-white/10">·</span>
            <a
              href="mailto:areddyakhil@gmail.com"
              className="hover:text-white/50 transition"
            >
              areddyakhil@gmail.com
            </a>
          </section>

          {/* ── footer ────────────────────────────────────────── */}
          <footer className="mt-16 border-t border-white/[0.04] pt-8 pb-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] font-mono text-white/15">
                &copy; {new Date().getFullYear()} Akhil Reddy &middot; Analytics Engineering + Data Science
              </div>
              <div className="text-[11px] font-mono text-white/15">
                37.3382&deg; N, 121.8863&deg; W
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
