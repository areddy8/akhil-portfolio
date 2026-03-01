---
name: portfolio-website-builder
description: Builds and improves portfolio websites focused on data visualization, data science, and data engineering using Next.js and Tailwind CSS. Use when the user mentions a portfolio website or asks for portfolio page planning, project showcase content, section copy, UX structure, SEO, accessibility, performance, or deployment guidance.
---

# Portfolio Website Builder

## Scope

Use this skill to design, build, and refine a portfolio website that positions the user as a strong practitioner in:
- data visualization
- data science
- data engineering

Default stack:
- Next.js App Router
- Tailwind CSS

If the repository uses a different stack, adapt patterns while preserving the same information architecture and content quality.

## Working Style

Follow this operating sequence:
1. Clarify goals and audience (hiring manager, technical lead, recruiter, client).
2. Build or refine site structure before writing lots of code.
3. Prioritize strongest proof of impact (metrics, outcomes, business value).
4. Implement sections incrementally and verify rendering/accessibility quickly.
5. End with performance, SEO, and deployment checks.

## Discovery Questions

Ask these before major generation if unknown:
- Target roles (data scientist, analytics engineer, ML engineer, data engineer, BI engineer).
- Primary goal (job search, freelance leads, speaking opportunities, personal brand).
- Tone (technical, approachable, executive, minimalist).
- Number of featured projects (recommended: 3-6).
- Preferred contact CTA (email, Calendly, LinkedIn, GitHub).

## Website Information Architecture

Use this default structure unless user asks otherwise:
- Home
- Projects
- About
- Resume (or Experience)
- Contact

Home should contain:
- Hero (clear value proposition)
- Trust signals (years, domains, tools, outcomes)
- Featured projects (3 cards minimum)
- Skills matrix (data viz, DS, DE grouped)
- CTA band (contact + resume links)

Projects should support:
- Filtering by category: `Data Visualization`, `Data Science`, `Data Engineering`
- Per-project detail page with challenge, approach, architecture, results, links

## Content Templates

Use these templates for high-quality, consistent writing.

### Hero template

`I build [type of data products] that help [audience] make better decisions through [methods].`

Subheadline template:
`Focused on [data visualization | ML modeling | data platforms], with projects across [domain examples] and measurable outcomes.`

### Project card template

- Title
- One-line problem statement
- Tech stack (3-6 tools)
- Outcome metric (latency reduction, accuracy gain, time saved, cost saved, adoption)
- Links: demo, GitHub, case study

### Case study template (detail page)

Use this section order:
1. Context
2. Problem
3. Data
4. Approach
5. Architecture / pipeline
6. Results
7. Trade-offs and lessons
8. Next iteration

## Category-Specific Guidance

### Data Visualization projects

Must include:
- Decision question the dashboard answers
- Data refresh cadence
- Visual design choices and why they fit the task
- Interaction design (filters, drill-down, cross-highlighting)
- Outcome metric (time-to-insight, adoption, decision speed)

### Data Science projects

Must include:
- Framing (prediction, classification, clustering, ranking, NLP)
- Feature design summary
- Validation strategy
- Error analysis
- Baseline vs final model comparison
- Practical impact and limitations

### Data Engineering projects

Must include:
- Ingestion sources and frequency
- Pipeline orchestration approach
- Data quality checks
- Storage model and partitioning
- Reliability/observability choices
- Performance or cost outcomes

## Implementation Playbook (Next.js + Tailwind)

When building new pages/components, follow this order:

1. Define route map (App Router)
   - `app/page.tsx`
   - `app/projects/page.tsx`
   - `app/projects/[slug]/page.tsx`
   - `app/about/page.tsx`
   - `app/contact/page.tsx`

2. Create reusable UI primitives
   - Section container
   - Project card
   - Badge/tag
   - CTA button/link

3. Add structured content source
   - Start with typed local data (TS object/array)
   - Keep project metadata centralized (slug, tags, metrics, links)

4. Implement responsive layout
   - Mobile first
   - Keep line length readable
   - Ensure card grids collapse cleanly

5. Add polish and trust signals
   - Lightweight animations only if they do not hurt performance
   - External link indicators
   - Updated timestamp or maintenance note

## SEO and Discoverability

Apply these by default:
- Unique page titles and meta descriptions
- Open Graph metadata for Home and project pages
- Semantic heading order (single H1 per page)
- Descriptive alt text for project visuals
- Clean URLs with stable slugs
- Internal linking from Home to featured project pages

For portfolio-specific keyword intent, prioritize terms around:
- data visualization portfolio
- data science projects
- data engineering pipelines
- analytics engineering case studies

## Accessibility and UX Quality Bar

Minimum standards:
- Keyboard reachable navigation and controls
- Visible focus styles
- Sufficient color contrast
- Non-color cues for status or categories
- Meaningful link/button labels
- Reduced motion respect where animation exists

## Performance Checklist

Before finishing:
- Optimize images and charts assets
- Avoid shipping heavy libraries on routes that do not need them
- Prefer server rendering/static generation when appropriate
- Keep above-the-fold content fast to render
- Re-check Lighthouse-style issues and fix obvious regressions

## Deployment Checklist

Use this release flow:
1. Verify env vars and public config
2. Build in production mode
3. Validate key routes
4. Check metadata previews (OG tags)
5. Confirm contact links/forms
6. Publish and sanity-check live site

## Output Format

When responding with this skill, structure output as:

```markdown
## Goal
[What will be built or improved]

## Plan
- [Step-by-step implementation plan]

## Implementation
- [Files/components/routes to create or edit]
- [Content templates applied]

## Quality Checks
- [SEO, accessibility, performance checks]

## Next Iteration
- [Optional enhancements]
```

## Example Triggers

Apply this skill when user messages include intents like:
- "Help me build my portfolio website"
- "Create sections for my data science portfolio"
- "Improve my portfolio project pages"
- "Make my website showcase data engineering pipelines"

If request is generic but explicitly about a portfolio website, default to this skill and ask only the minimum clarifying questions needed to proceed.
