import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const projects = [
  {
    title: "Pricing Compliance Radar",
    desc: "SoFi-style risk and compliance intelligence dashboard with Monte Carlo alerting, forecast confidence bands, product heatmaps, and pricing scenario guardrail simulation.",
    tags: ["risk analytics", "Monte Carlo alerting", "real-time dashboard", "Next.js", "TypeScript"],
    href: "/demo/pricing-compliance",
    live: true,
  },
  {
    title: "Grid Analyst",
    desc: "High-performance intelligence cockpit with WAC heatmaps, historical replay simulation, experiment scheduling, and AI-assisted analyst narratives over production-style telemetry.",
    tags: ["Next.js", "OpenAI", "real-time analytics UX", "data viz", "simulation"],
    href: "/demo/grid-analyst",
    live: true,
  },
  {
    title: "Court IQ — Tactical Spacing Analyzer",
    desc: "Custom visualization system combining GPT-4o vision with geometric analytics. Converts raw scene data into interactive, decision-ready overlays and explainable spatial metrics.",
    tags: ["computer vision", "ML + UX bridge", "custom viz", "spatial analysis", "Next.js"],
    href: "/demo/court-vision",
    live: true,
  },
  {
    title: "Rasam Roots (Hobby Project)",
    desc: "A cooking-focused side project exploring recipes and food storytelling, built as a personal creative outlet outside analytics work.",
    tags: ["hobby", "cooking", "rasam", "React", "Vite"],
    href: "https://rasam-roots2.vercel.app/",
    live: true,
  },
];

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/demo/grid-analyst">
            Grid Analyst
          </Link>
          <Link className="hover:text-foreground" href="/demo/pricing-compliance">
            Compliance Radar
          </Link>
          <Link className="hover:text-foreground" href="/about">
            About
          </Link>
        </nav>
      </header>

      <section className="mt-12">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Live demos across data science, ML/AI applications, analytics engineering, and visualization-driven product experiences.
        </p>
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        {projects.map((p) => (
          <Card key={p.title} className="relative p-5 bg-background/40">
            {p.live && (
              <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live demo
              </span>
            )}
            <div className="font-medium">{p.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.desc}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>

            <div className="mt-5">
              <Button variant="ghost" asChild className="px-0">
                <Link href={p.href}>
                  {p.live ? "Open demo →" : "View details →"}
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
