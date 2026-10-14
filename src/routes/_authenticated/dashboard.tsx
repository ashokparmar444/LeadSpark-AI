import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radar as RadarIcon, Gauge, ListOrdered, Blocks, Send, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { Panel, PageHeader, StatCard, GradeBadge, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LeadPilot AI" },
      { name: "description", content: "Your live lead pipeline: leads found, audits run, hot opportunities and outreach sent." },
      { property: "og:title", content: "Dashboard — LeadPilot AI" },
      { property: "og:description", content: "Track the five-phase lead pipeline in one console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const PHASE_CARDS = [
  { to: "/lead-finder", icon: RadarIcon, tag: "01", title: "Find leads", body: "Scan a niche + city for local businesses." },
  { to: "/audits", icon: Gauge, tag: "02", title: "Audit websites", body: "Score design, SEO, mobile and conversion." },
  { to: "/rankings", icon: ListOrdered, tag: "03", title: "Rank opportunities", body: "Sort the list by who needs you most." },
  { to: "/builder", icon: Blocks, tag: "04", title: "Build demo sites", body: "Generate strategy + builder prompt." },
  { to: "/outreach", icon: Send, tag: "05", title: "Convert", body: "Draft multi-step personalised outreach." },
] as const;

function DashboardPage() {
  const { workspaceId, workspace } = useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [leads, audits, hot, activity] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!),
        supabase.from("audits").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!),
        supabase
          .from("leads")
          .select("id, business_name, city, opportunity_score, lead_status, audit_score")
          .eq("workspace_id", workspaceId!)
          .order("opportunity_score", { ascending: false, nullsFirst: false })
          .limit(6),
        supabase
          .from("lead_activity")
          .select("id, type, message, created_at")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      const { count: outreachCount } = await supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!);
      return {
        leads: leads.count ?? 0,
        audits: audits.count ?? 0,
        outreach: outreachCount ?? 0,
        top: hot.data ?? [],
        activity: activity.data ?? [],
      };
    },
  });

  const hotCount = (data?.top ?? []).filter((l) => (l.opportunity_score ?? 0) >= 90).length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Workspace · ${workspace?.name ?? ""}`}
        title="Pipeline overview"
        description="Everything from first scan to signed client, in one console."
        actions={
          <Button asChild>
            <Link to="/lead-finder">
              New scan <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={isLoading ? "—" : data!.leads} />
        <StatCard label="Audits run" value={isLoading ? "—" : data!.audits} tone="hot" />
        <StatCard label="Hot leads" value={isLoading ? "—" : hotCount} highlight tone="accent" hint="score ≥ 90" />
        <StatCard label="Outreach drafted" value={isLoading ? "—" : data!.outreach} />
      </div>

      <div>
        <p className="label-mono mb-3">The five-phase pipeline</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PHASE_CARDS.map((phase) => (
            <Link key={phase.to} to={phase.to} className="group">
              <Panel className="h-full transition-colors group-hover:bg-panel2/50">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/25">
                    <phase.icon className="size-4" />
                  </span>
                  <span className="label-mono">{phase.tag}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{phase.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{phase.body}</p>
              </Panel>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <p className="label-mono">Top opportunities</p>
            <Link to="/leads" className="font-mono text-[11px] text-accent hover:underline">
              view all
            </Link>
          </div>
          {!data?.top.length ? (
            <div className="py-8">
              <EmptyState
                icon={<RadarIcon className="size-5" />}
                title="No leads yet"
                description="Run your first scan to populate the pipeline. You can use demo data if you don't have a scraping key."
                action={
                  <Button asChild size="sm">
                    <Link to="/lead-finder">Find leads</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {data.top.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      to="/leads/$id"
                      params={{ id: lead.id }}
                      className="truncate text-sm text-foreground hover:text-accent"
                    >
                      {lead.business_name}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {lead.city ?? "—"} · {statusLabel(lead.lead_status)}
                    </p>
                  </div>
                  <GradeBadge score={lead.opportunity_score} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <p className="label-mono">Recent activity</p>
          {!data?.activity.length ? (
            <p className="mt-4 text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-sm text-foreground">{item.message}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
