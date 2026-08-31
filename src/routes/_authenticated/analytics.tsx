import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel, StatCard, ScoreBar } from "@/components/app/primitives";
import { LEAD_STATUSES, statusLabel } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — LeadPilot AI" },
      { name: "description", content: "Conversion funnel, audit averages and AI usage across your LeadPilot workspace." },
      { property: "og:title", content: "Analytics — LeadPilot AI" },
      { property: "og:description", content: "Measure the pipeline from lead found to client won." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { workspaceId } = useApp();

  const { data } = useQuery({
    queryKey: ["analytics", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [leads, audits, usage] = await Promise.all([
        supabase.from("leads").select("lead_status, opportunity_score, audit_score").eq("workspace_id", workspaceId!),
        supabase.from("audits").select("overall_score").eq("workspace_id", workspaceId!),
        supabase.from("ai_usage").select("operation, credits").eq("workspace_id", workspaceId!),
      ]);
      return { leads: leads.data ?? [], audits: audits.data ?? [], usage: usage.data ?? [] };
    },
  });

  const leads = data?.leads ?? [];
  const won = leads.filter((l) => l.lead_status === "won").length;
  const contacted = leads.filter((l) => l.lead_status !== "new").length;
  const avgAudit = data?.audits.length
    ? Math.round(data.audits.reduce((sum, a) => sum + (a.overall_score ?? 0), 0) / data.audits.length)
    : 0;
  const credits = (data?.usage ?? []).reduce((sum, u) => sum + (u.credits ?? 0), 0);

  const byStatus = LEAD_STATUSES.map((status) => ({
    label: status.label,
    count: leads.filter((l) => l.lead_status === status.value).length,
  })).filter((row) => row.count > 0);

  const byOperation = Object.entries(
    (data?.usage ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.operation] = (acc[row.operation] ?? 0) + (row.credits ?? 0);
      return acc;
    }, {}),
  );

  const max = Math.max(1, ...byStatus.map((row) => row.count));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reporting"
        title="Analytics"
        description="How the pipeline is performing, from first scan to signed client."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={leads.length} />
        <StatCard label="Contacted" value={contacted} tone="hot" />
        <StatCard label="Won" value={won} highlight tone="accent" />
        <StatCard
          label="Conversion"
          value={`${leads.length ? Math.round((won / leads.length) * 100) : 0}%`}
          hint="won / total leads"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="label-mono">Pipeline by status</p>
          {!byStatus.length ? (
            <p className="mt-4 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {byStatus.map((row, index) => (
                <div key={row.label}>
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{row.label}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink">
                    <div
                      className="bar-fill h-full rounded-full bg-accent"
                      style={{ width: `${(row.count / max) * 100}%`, animationDelay: `${index * 70}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <p className="label-mono">Audit & AI usage</p>
          <div className="mt-4 space-y-4">
            <ScoreBar label="average audit score" score={avgAudit} />
            <div className="flex items-baseline justify-between">
              <span className="label-mono">AI credits used</span>
              <span className="font-mono text-sm text-foreground">{credits}</span>
            </div>
            <ul className="space-y-1.5">
              {byOperation.map(([operation, value]) => (
                <li key={operation} className="flex justify-between text-sm text-muted-foreground">
                  <span>{statusLabel(operation)}</span>
                  <span className="font-mono text-[11px]">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}
