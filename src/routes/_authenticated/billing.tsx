import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel, StatCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — LeadPilot AI" },
      { name: "description", content: "Your plan, monthly limits and AI credit usage for this LeadPilot workspace." },
      { property: "og:title", content: "Billing — LeadPilot AI" },
      { property: "og:description", content: "Plan limits and credit usage." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { workspaceId, workspace } = useApp();

  const { data } = useQuery({
    queryKey: ["billing", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const [plans, usage, leadCount] = await Promise.all([
        supabase.from("plans").select("*").order("lead_limit", { ascending: true }),
        supabase
          .from("ai_usage")
          .select("operation, credits")
          .eq("workspace_id", workspaceId!)
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!)
          .gte("created_at", monthStart.toISOString()),
      ]);
      return { plans: plans.data ?? [], usage: usage.data ?? [], leads: leadCount.count ?? 0 };
    },
  });

  const current = data?.plans.find((p) => p.id === workspace?.plan_id) ?? data?.plans[0];
  const used = (operation: string) =>
    (data?.usage ?? []).filter((u) => u.operation === operation).reduce((sum, u) => sum + (u.credits ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title={`You're on the ${current?.name ?? "Free"} plan`}
        description="Limits reset at the start of each calendar month."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads this month" value={`${data?.leads ?? 0} / ${current?.lead_limit ?? 0}`} />
        <StatCard label="Audits" value={`${used("audit")} / ${current?.audit_limit ?? 0}`} tone="hot" />
        <StatCard label="Build prompts" value={`${used("website_prompt")} / ${current?.website_prompt_limit ?? 0}`} />
        <StatCard label="Outreach drafts" value={`${used("outreach")} / ${current?.outreach_limit ?? 0}`} highlight tone="accent" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.plans ?? []).map((plan) => {
          const active = plan.id === current?.id;
          return (
            <Panel key={plan.id} className={active ? "ring-1 ring-accent/40" : undefined}>
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                {active ? <span className="label-mono text-accent">current</span> : null}
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                ${Math.round((plan.price_cents ?? 0) / 100)}
                <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 text-accent" /> {plan.lead_limit} leads / month
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 text-accent" /> {plan.audit_limit} AI audits
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 text-accent" /> {plan.website_prompt_limit} build prompts
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 text-accent" /> {plan.outreach_limit} outreach drafts
                </li>
              </ul>
              <Button
                size="sm"
                variant={active ? "secondary" : "default"}
                className="mt-5 w-full"
                disabled={active}
                onClick={() => toast.info("Payments aren't connected yet — ask to enable checkout and I'll wire it up.")}
              >
                {active ? "Current plan" : "Upgrade"}
              </Button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
