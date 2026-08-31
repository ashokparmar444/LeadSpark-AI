import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gradeForScore } from "@/lib/domain";

const TONE_CLASS: Record<string, string> = {
  hot: "bg-hot/15 text-hot ring-hot/30",
  accent: "bg-accent/10 text-accent ring-accent/30",
  fog: "bg-fog/10 text-fog ring-border",
  warn: "bg-warn/10 text-warn ring-warn/30",
  muted: "bg-muted/40 text-muted-foreground ring-border",
};

const BAR_TONE: Record<string, string> = {
  hot: "bg-hot",
  accent: "bg-accent",
  fog: "bg-fog/70",
  warn: "bg-warn",
  muted: "bg-muted-foreground/40",
};

export function Panel({ className, children }: { className?: string | undefined; children: ReactNode }) {
  return <div className={cn("console-panel rounded-2xl p-4 sm:p-5", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="label-mono text-accent">{eyebrow}</p> : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "muted",
  highlight = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof BAR_TONE;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "console-panel rounded-xl p-4 transition-shadow",
        highlight && "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)]",
      )}
    >
      <p className={cn("label-mono", highlight && "text-accent")}>{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? (
        <p className={cn("mt-1 font-mono text-[11px]", tone === "muted" ? "text-muted-foreground" : `text-${tone}`)}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
  const tone = score >= 75 ? "var(--accent)" : score >= 50 ? "var(--hot)" : "var(--warn)";
  const deg = Math.round((Math.max(0, Math.min(100, score)) / 100) * 360);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${tone} 0deg, ${tone} ${deg}deg, var(--line) ${deg}deg, var(--line) 360deg)` }}
      />
      <div className="absolute inset-[6px] rounded-full bg-panel" />
      <div className="relative text-center leading-none">
        <p className="text-xl font-semibold text-foreground">{score}</p>
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

export function ScoreBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
  const tone = score >= 70 ? "accent" : score >= 45 ? "hot" : "warn";
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink">
        <div
          className={cn("bar-fill h-full rounded-full", BAR_TONE[tone])}
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

export function GradeBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <span className="font-mono text-[11px] text-muted-foreground">—</span>;
  }
  const { grade, tone } = gradeForScore(score);
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] ring-1", TONE_CLASS[tone])}>
      {score} {grade}
    </span>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof TONE_CLASS }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1", TONE_CLASS[tone])}>{children}</span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="console-panel flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/25">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Radar({ active = true, size = 48 }: { active?: boolean; size?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-full bg-ink ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      {active ? <div className="radar-cone absolute inset-0" /> : null}
      <div className="absolute inset-[7px] rounded-full ring-1 ring-border/60" />
      <div className="absolute inset-[15px] rounded-full ring-1 ring-border/40" />
      <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
    </div>
  );
}

export function DemoTag() {
  return (
    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-hot ring-1 ring-hot/30">
      demo
    </span>
  );
}
