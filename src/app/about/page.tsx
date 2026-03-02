import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

/* ── data ──────────────────────────────────────────────────────── */

const experience = [
  {
    company: "SoFi",
    location: "San Francisco, CA",
    title: "Senior Data Scientist",
    range: "May 2022 — Present",
    color: "#6366f1", // indigo
    bullets: [
      {
        heading: "AI Tooling",
        text: "Built RAG pipelines and an MCP-based tool layer enabling secure LLM access to pricing grid artifacts, experiment metadata, and evaluation tables; delivered automated \"Grid A vs Grid B\" and \"Experiment 1 vs Experiment 2\" diff + performance reports, reducing analysis cycle time by 70%+.",
      },
      {
        heading: "A/B Testing & Ops Optimization",
        text: "Designed and executed A/B testing frameworks to optimize lending workflows and pricing strategy; applied predictive modeling and statistical analysis to forecast customer behavior and loan performance — quantifying approval-conversion-loss trade-offs across grid variants, maintaining WAC targets, and identifying configurations that reduced loss rates by 10%.",
      },
      {
        heading: "Data Infrastructure",
        text: "Built automated pipelines (Python, SQL, dbt) processing millions of application records daily; created self-serve dashboards and reporting that reduced internal data requests from days to minutes.",
      },
      {
        heading: "Compliance Analytics",
        text: "Developed proactive compliance monitoring across Personal Loans, Student Loans, Credit Cards, and Home Loans; architected Monte Carlo alerting to detect pricing anomalies in near real time — 99.9%+ accuracy across 1,000+ deployments, maintaining audit readiness for OCC, Internal Audit, and 2LOD.",
      },
      {
        heading: "Executive Analytics",
        text: "Owned the analytics roadmap for lending compliance and operations; delivered weekly executive narratives influencing pricing strategy across a $20B+ portfolio. Led cross-functional initiatives improving operational efficiency by 50%.",
      },
      {
        heading: "Team Leadership",
        text: "Mentored 2 junior data scientists and formalized SOPs/best practices that scaled execution workflows across the team.",
      },
    ],
  },
  {
    company: "Autodesk",
    location: "San Francisco, CA",
    title: "Senior Analytics, BI & GTM Strategy",
    range: "May 2020 — May 2022",
    color: "#14b8a6", // teal
    bullets: [
      {
        heading: "GTM Reporting",
        text: "Partnered with Sales, Marketing, and Finance teams to design and scale GTM reporting infrastructure — automating CAC, funnel conversion, pipeline velocity, and revenue attribution metrics.",
      },
      {
        heading: "Data Pipelines",
        text: "Built SQL-based data pipelines integrating product usage, CRM (Salesforce), and financial systems — enabling end-to-end visibility into customer journeys and powering real-time segmentation and lead scoring models.",
      },
      {
        heading: "Predictive Models",
        text: "Developed predictive models in Python and R to forecast ARR impact, retention trends, and campaign ROI; insights drove quarterly budget allocation and targeting strategies across GTM teams.",
      },
      {
        heading: "Dashboards",
        text: "Created interactive dashboards (Tableau, Looker) for Sales Ops, Marketing, and RevOps leaders — reducing time-to-insight by 70% and improving self-serve analytics adoption.",
      },
      {
        heading: "Market Analysis",
        text: "Led TAM sizing and customer segmentation analyses to inform new market entry and pricing strategies, supporting successful launches and revenue acceleration.",
      },
    ],
  },
  {
    company: "ZipRecruiter",
    location: "Santa Monica, CA",
    title: "Marketplace Strategy Data Scientist",
    range: "May 2019 — May 2020",
    color: "#f59e0b", // amber
    bullets: [
      {
        heading: "Campaign Analytics",
        text: "Leveraged CRM + web analytics to evaluate campaign KPIs (MAU, ROAS, ROI) and delivered executive dashboards (Python/SQL/Snowflake) to guide spend and strategy.",
      },
      {
        heading: "Budget Optimization",
        text: "Managed a $300K/month global budget, reallocating investment based on performance insights to maximize ROI and improve budget accuracy.",
      },
      {
        heading: "Customer Segmentation",
        text: "Led segmentation + market research and built predictive models (R) for LTV, retention, and marketing forecasts; drove +5% MAU in Q4 and 25% QoQ growth.",
      },
    ],
  },
  {
    company: "PayPal",
    location: "San Jose, CA",
    title: "Data Engineer",
    range: "July 2017 — May 2019",
    color: "#3b82f6", // blue
    bullets: [
      {
        heading: "Data Visualization",
        text: "Led data extraction, statistical modeling, and data visualization in Tableau (VB Scripts, SQL templates) while using Airflow to schedule and develop data pipelines and workflows.",
      },
      {
        heading: "Reporting",
        text: "Spearheaded the full lifecycle of data analysis and statistical reporting initiatives to drive the evaluation of business trends.",
      },
      {
        heading: "ETL Automation",
        text: "Developed ETL jobs to automate the RMA data pipeline from inspection to refurbishment; streamlined data upload scripts, cutting development time by 50%.",
      },
    ],
  },
];

const education = [
  {
    school: "UC San Diego",
    degree: "B.S. Bioengineering Systems",
    minor: "Minor in Business",
  },
  {
    school: "UCLA",
    degree: "Data Science Certificate",
    minor: "Fall 2019",
  },
];

const skills = [
  { category: "Languages & Query", items: ["Python", "SQL", "R", "SAQL", "VB Script"] },
  { category: "Data & ML", items: ["dbt", "Snowflake", "Airflow", "AWS SageMaker", "Spark", "Presto", "Monte Carlo", "Fivetran", "Teradata", "MongoDB", "PostgreSQL"] },
  { category: "BI & Visualization", items: ["Tableau", "Looker", "Power BI", "Mode", "Sigma", "Sisense", "Einstein Analytics"] },
  { category: "AI & Modern Stack", items: ["RAG", "Vector Search", "MCP", "FastAPI", "REST/GraphQL APIs", "Docker", "Kubernetes", "Git", "GitLab", "CI/CD"] },
  { category: "Platforms", items: ["Salesforce", "Datadog", "Workato", "Toad Automation", "MATLAB", "RStudio"] },
];

const hobbies = [
  "Biohacking and performance optimization",
  "Fantasy sports strategy and analytics",
  "Cooking experiments with South Indian recipes",
];

/* ── component ─────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* nav */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Home
        </Link>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/projects">
            Projects
          </Link>
          <Link className="hover:text-foreground" href="/demo/grid-analyst">
            Grid Analyst
          </Link>
          <Link className="hover:text-foreground" href="/demo/pricing-compliance">
            Compliance Radar
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mt-14 flex items-center gap-6 sm:gap-8">
        <div className="relative h-36 w-36 flex-shrink-0 self-start sm:h-50 sm:w-44">
          <Image
            src="/akhil-v2.png"
            alt="Akhil Reddy"
            fill
            className="object-cover object-top"
            priority
          />
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Akhil Reddy</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Senior Data Scientist &middot; San Jose, CA
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <a
              href="mailto:areddyakhil8@gmail.com"
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 transition hover:bg-white/[0.08] hover:text-white"
            >
              areddyakhil8@gmail.com
            </a>
            <a
              href="https://linkedin.com/in/areddyakhil"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 transition hover:bg-white/[0.08] hover:text-white"
            >
              LinkedIn
            </a>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              (408) 981-4131
            </span>
          </div>
        </div>
      </section>

      {/* ── experience timeline ────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Experience
        </h2>

        <div className="relative mt-8 space-y-0">
          {/* continuous timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-white/10 via-white/[0.06] to-transparent" />

          {experience.map((job) => (
            <div key={job.company} className="relative pb-12 pl-10 last:pb-0">
              {/* dot */}
              <div
                className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2"
                style={{
                  borderColor: job.color,
                  backgroundColor: `${job.color}22`,
                  boxShadow: `0 0 8px ${job.color}44`,
                }}
              />

              {/* header */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lg font-semibold text-white">
                  {job.company}
                </span>
                <span className="text-sm text-muted-foreground">
                  {job.title}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground/60">
                {job.location} &middot; {job.range}
              </div>

              {/* bullets */}
              <div className="mt-4 space-y-3">
                {job.bullets.map((b) => (
                  <div key={b.heading}>
                    <div className="text-[13px]">
                      <span
                        className="font-semibold"
                        style={{ color: `${job.color}cc` }}
                      >
                        {b.heading}
                      </span>
                      <span className="mx-1.5 text-white/20">&mdash;</span>
                      <span className="leading-relaxed text-white/60">
                        {b.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── education ──────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Education
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {education.map((e) => (
            <div
              key={e.school}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-5"
            >
              <div className="text-sm font-semibold text-white">
                {e.school}
              </div>
              <div className="mt-1 text-[13px] text-white/60">{e.degree}</div>
              <div className="mt-0.5 text-xs text-white/40">{e.minor}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── beyond work ─────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Beyond work
        </h2>
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-5">
          <p className="text-[13px] leading-relaxed text-white/60">
            I am a biohacking enthusiast, fantasy sports nerd, and home cook.
            I also built a small hobby project for recipes and food storytelling:
            {" "}
            <a
              href="https://rasam-roots2.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/20 hover:text-white"
            >
              Rasam Roots
            </a>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {hobbies.map((hobby) => (
              <Badge key={hobby} variant="secondary" className="text-[11px]">
                {hobby}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── skills ─────────────────────────────────────────── */}
      <section className="mt-16 pb-12">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Technical proficiencies
        </h2>
        <div className="mt-6 space-y-5">
          {skills.map((group) => (
            <div key={group.category}>
              <div className="text-[12px] font-medium text-white/50">
                {group.category}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="text-[11px]"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
