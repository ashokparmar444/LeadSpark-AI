// Server-only usage / credit enforcement helpers.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Operation = "audit" | "ranking" | "website_prompt" | "outreach" | "other";

const LIMIT_COLUMN: Record<Operation, string> = {
  audit: "audit_limit",
  ranking: "audit_limit",
  website_prompt: "website_prompt_limit",
  outreach: "outreach_limit",
  other: "audit_limit",
};

export class UsageError extends Error {}

/** Start of the current monthly usage period (UTC). */
export function periodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function periodEnd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function assertMember(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !data) throw new UsageError("You do not have access to this workspace.");
  return data.role as "owner" | "admin" | "member";
}

/** Throws if the workspace has hit its monthly limit for the operation. */
export async function assertWithinLimit(supabase: SupabaseClient, workspaceId: string, op: Operation, cost = 1) {
  const { data: ws } = await supabase.from("workspaces").select("plan_id").eq("id", workspaceId).maybeSingle();
  const { data: plan } = await supabase
    .from("plans")
    .select("audit_limit, website_prompt_limit, outreach_limit, lead_limit, name")
    .eq("id", ws?.plan_id ?? "free")
    .maybeSingle();

  const limit = (plan as Record<string, number> | null)?.[LIMIT_COLUMN[op]] ?? 0;

  // Credits, not rows: a batch operation records one row worth many credits.
  const { data: rows } = await supabase
    .from("ai_usage")
    .select("credits")
    .eq("workspace_id", workspaceId)
    .eq("operation", op)
    .gte("created_at", periodStart());
  const used = (rows ?? []).reduce((sum: number, r: { credits: number | null }) => sum + (r.credits ?? 1), 0);

  if (used + cost > limit) {
    throw new UsageError(
      `You have reached your monthly AI limit for this operation (${limit} on the ${plan?.name ?? "Free"} plan). Upgrade your plan or wait for the reset.`,
    );
  }
}

/** Records consumed credits. Requires the service-role client. */
export async function trackUsage(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    operation: Operation;
    provider: string;
    model: string;
    credits?: number;
    meta?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("ai_usage").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    operation: input.operation,
    provider: input.provider,
    model: input.model,
    credits: input.credits ?? 1,
    meta: input.meta ?? {},
  });
  if (error) console.error("usage tracking failed", error.message);
}

export async function assertLeadQuota(supabase: SupabaseClient, workspaceId: string, adding: number) {
  const { data: ws } = await supabase.from("workspaces").select("plan_id").eq("id", workspaceId).maybeSingle();
  const { data: plan } = await supabase
    .from("plans")
    .select("lead_limit, name")
    .eq("id", ws?.plan_id ?? "free")
    .maybeSingle();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart());
  const limit = plan?.lead_limit ?? 25;
  if ((count ?? 0) + adding > limit) {
    throw new UsageError(
      `This scan would exceed your monthly lead limit (${limit} on the ${plan?.name ?? "Free"} plan). Reduce the count or upgrade your plan.`,
    );
  }
}
