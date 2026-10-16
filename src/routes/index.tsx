import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Radar as RadarIcon,
  Gauge,
  ListOrdered,
  Blocks,
  Send,
  ArrowRight,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Radar, StatCard, ScoreBar, GradeBadge } from "@/components/app/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadPilot AI — Find Local Business Leads. Audit. Rank. Build. Convert." },
      {
        name: "description",
        content:
          "LeadPilot AI finds local businesses, audits their websites with AI, ranks the best opportunities, generates demo-site build prompts and drafts outreach that converts.",
      },
      { property: "og:title", content: "LeadPilot AI — Local business lead intelligence" },
      {
        property: "og:description",
        content: "Find. Audit. Rank. Build. Convert. The five-phase pipeline for web agencies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PHASES = [
  {
    icon: RadarIcon,
    tag: "Phase 01",
    title: "Find",
    body: "Scan any niche in any city. Google Maps data, contact details, socials, ratings — filtered before it ever hits your list.",
  },
  {
    icon: Gauge,
    tag: "Phase 02",
    title: "Audit",
    body: "AI grades each website across design, mobile, SEO, conversion and trust — with the single biggest opportunity called out.",
  },
  {
    icon: ListOrdered,
    tag: "Phase 03",
    title: "Rank",
    body: "Every lead gets a 0–100 opportunity score and a grade so your team always works the hottest business first.",
  },
  {
    icon: Blocks,
    tag: "Phase 04",
    title: "Build",
    body: "Generate a full site strategy plus a copy-paste builder prompt for Lovable, Bolt or Claude Code. Demo ready in minutes.",
  },
  {
    icon: Send,
    tag: "Phase 05",
    title: "Convert",
    body: "Multi-step outreach in English, Hinglish, Hindi or Gujarati — personalised with real audit findings, never spammy.",
  },
];

const PLANS = [
  { name: "Free", price: "₹0", blurb: "Kick the tyres", items: ["25 leads / month", "10 AI audits", "3 build prompts", "Demo data mode"] },
  { name: "Starter", price: "₹2,499", blurb: "Solo operators", items: ["250 leads / month", "100 AI audits", "25 build prompts", "150 outreach drafts"] },
  { name: "Pro", price: "₹6,999", blurb: "Growing agencies", items: ["1,000 leads / month", "500 AI audits", "150 build prompts", "Team workspace"], featured: true },
  { name: "Agency", price: "₹16,999", blurb: "Full pipeline", items: ["5,000 leads / month", "2,500 AI audits", "Unlimited seats", "Priority processing"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <Radar size={30} />
            <span className="text-sm font-semibold tracking-tight">
              LeadPilot<span className="text-accent"> AI</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#pipeline" className="transition-colors hover:text-foreground">Pipeline</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/70">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
            <div>
              <p className="label-mono flex items-center gap-2 text-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                Local lead intelligence
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Find local business leads.
                <span className="block text-muted-foreground">Audit. Rank. Build. Convert.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                LeadPilot AI runs the full agency pipeline in one console — scan a niche, grade every website,
                score the opportunity, generate the demo build prompt and draft outreach that sounds human.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Start free <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  No card required · demo data included
                </span>
              </div>
            </div>

            <Panel className="relative">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <p className="label-mono">live scan · dentists · ahmedabad</p>
                <Radar size={34} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatCard label="Found" value={12} />
                <StatCard label="Audited" value={9} tone="hot" />
                <StatCard label="Hot" value={4} highlight tone="accent" hint="score ≥ 90" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { n: "Smile Craft Dental Studio", s: 94 },
                  { n: "Riverfront Dental Care", s: 81 },
                  { n: "Prahlad Nagar Dental Hub", s: 63 },
                ].map((row, i) => (
                  <div key={row.n} className="flex items-center justify-between gap-3 rounded-lg bg-panel2/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{row.n}</p>
                      <div className="mt-1.5 w-40">
                        <ScoreBar label="opportunity" score={row.s} delay={i * 120} />
                      </div>
                    </div>
                    <GradeBadge score={row.s} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="mx-auto max-w-6xl px-5 py-20">
          <p className="label-mono text-accent">The five-phase pipeline</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">
            One console from cold search to signed client.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PHASES.map((phase) => (
              <Panel key={phase.title} className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/25">
                    <phase.icon className="size-4" />
                  </span>
                  <span className="label-mono">{phase.tag}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{phase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase.body}</p>
              </Panel>
            ))}
            <Panel className="flex flex-col justify-between bg-accent/5">
              <div>
                <span className="grid size-9 place-items-center rounded-lg bg-hot/10 text-hot ring-1 ring-hot/25">
                  <ShieldCheck className="size-4" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">Built for teams</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Workspaces, roles and row-level security keep every client list isolated. Usage limits and
                  credits are enforced server-side.
                </p>
              </div>
              <Button asChild variant="secondary" className="mt-5 w-full">
                <Link to="/auth">Create your workspace</Link>
              </Button>
            </Panel>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border/70 bg-panel/30">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <p className="label-mono text-accent">Pricing</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Start free. Scale when the pipeline does.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((plan) => (
                <Panel
                  key={plan.name}
                  className={plan.featured ? "ring-1 ring-accent/40" : undefined}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                    {plan.featured ? <span className="label-mono text-accent">popular</span> : null}
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {plan.price}
                    <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-5 space-y-2">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.featured ? "default" : "secondary"}
                    className="mt-6 w-full"
                    size="sm"
                  >
                    <Link to="/auth">Get started</Link>
                  </Button>
                </Panel>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div className="flex items-center gap-2.5">
            <Radar size={24} active={false} />
            <span className="text-sm font-semibold">LeadPilot AI</span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Estimates shown in audits are projections, not guarantees.
          </p>
        </div>
      </footer>
    </div>
  );
}
