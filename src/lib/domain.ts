// Shared client-safe domain types, labels and helpers.

export type LeadStatus =
  | "new"
  | "contacted"
  | "demo_created"
  | "demo_sent"
  | "interested"
  | "proposal"
  | "won"
  | "lost"
  | "not_interested";

export type OutreachStatus = "none" | "queued" | "sent" | "replied" | "bounced";
export type OutreachChannel = "email" | "whatsapp" | "instagram" | "facebook" | "linkedin";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type ProjectStatus = "draft" | "generating" | "ready" | "published";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type AppRole = "owner" | "admin" | "member";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "demo_created", label: "Demo Created" },
  { value: "demo_sent", label: "Demo Sent" },
  { value: "interested", label: "Interested" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "not_interested", label: "Not Interested" },
];

export const OUTREACH_STATUSES: { value: OutreachStatus; label: string }[] = [
  { value: "none", label: "Not contacted" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "replied", label: "Replied" },
  { value: "bounced", label: "Bounced" },
];

export const CHANNELS: { value: OutreachChannel; label: string; autoSend: boolean }[] = [
  { value: "email", label: "Email", autoSend: false },
  { value: "whatsapp", label: "WhatsApp", autoSend: false },
  { value: "instagram", label: "Instagram", autoSend: false },
  { value: "facebook", label: "Facebook", autoSend: false },
  { value: "linkedin", label: "LinkedIn", autoSend: false },
];

export const LANGUAGES = ["english", "hinglish", "hindi", "gujarati"] as const;
export type Language = (typeof LANGUAGES)[number];

export const OUTREACH_STEPS = [
  { value: "initial", label: "Initial Message" },
  { value: "day3", label: "Day 3 Follow-up" },
  { value: "day7", label: "Day 7 Follow-up" },
  { value: "demo", label: "Demo Follow-up" },
  { value: "proposal", label: "Proposal Follow-up" },
  { value: "final", label: "Final Follow-up" },
] as const;

export const BUILDER_PLATFORMS = [
  { value: "lovable", label: "Lovable" },
  { value: "bolt", label: "Bolt" },
  { value: "claude-code", label: "Claude Code" },
  { value: "custom", label: "Custom" },
] as const;

export const AI_PROVIDERS = [
  { value: "gemini", label: "Gemini", available: true },
  { value: "gpt", label: "GPT", available: true },
  { value: "claude", label: "Claude", available: false },
] as const;

export const MESSAGE_VARIABLES = [
  "{{business_name}}",
  "{{owner_name}}",
  "{{city}}",
  "{{website_url}}",
  "{{demo_url}}",
  "{{your_name}}",
];

export const PHASES = [
  { key: "find", label: "Find Leads", to: "/app/lead-finder" },
  { key: "audit", label: "Audit", to: "/app/audits" },
  { key: "rank", label: "Rank", to: "/app/rankings" },
  { key: "build", label: "Build", to: "/app/builder" },
  { key: "outreach", label: "Outreach", to: "/app/outreach" },
] as const;

export function gradeForScore(score: number): { grade: string; tone: "hot" | "accent" | "fog" | "warn" | "muted" } {
  if (score >= 90) return { grade: "Hot", tone: "hot" };
  if (score >= 75) return { grade: "High", tone: "accent" };
  if (score >= 60) return { grade: "Medium", tone: "fog" };
  if (score >= 40) return { grade: "Low", tone: "warn" };
  return { grade: "Very Low", tone: "muted" };
}

export function priorityForScore(score: number): number {
  if (score >= 90) return 1;
  if (score >= 75) return 2;
  if (score >= 60) return 3;
  if (score >= 40) return 4;
  return 5;
}

export function statusLabel(status: string): string {
  const found = [...LEAD_STATUSES, ...OUTREACH_STATUSES].find((s) => s.value === status);
  return found?.label ?? status;
}

/** Replace {{variables}} in a template with lead-specific values. */
export function fillVariables(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value ? value : match;
  });
}

/** Returns the list of variables that were NOT replaced. */
export function unresolvedVariables(text: string): string[] {
  return Array.from(new Set(text.match(/\{\{\w+\}\}/g) ?? []));
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
}
