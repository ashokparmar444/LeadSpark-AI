import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel, EmptyState, StatCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Team Portal — LeadPilot AI" },
      { name: "description", content: "Shared read-only view of this workspace's leads, audits and outreach messages for your team." },
      { property: "og:title", content: "Team Portal — LeadPilot AI" },
      { property: "og:description", content: "Workspace leads, audits and outreach in one shared view." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

type Tab = "leads" | "audits" | "outreach";

function PortalPage() {
  const { workspaceId } = useApp();
  const [tab, setTab] = useState<Tab>("leads");

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [leads, audits, outreach] = await Promise.all([
        supabase
          .from("leads")
          .select("id, business_name, city, phone, website, lead_status, audit_score")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("audits")
          .select("id, lead_id, overall_score, summary, biggest_opportunity, created_at, leads(business_name)")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("outreach_messages")
          .select("id, lead_id, channel, step, subject, body, status, sent_at, created_at, leads(business_name)")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      const failed = leads.error ?? audits.error ?? outreach.error;
      if (failed) throw failed;
      return { leads: leads.data ?? [], audits: audits.data ?? [], outreach: outreach.data ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Client portal"
        description="Everyone in this workspace sees the same leads, audit results and outreach messages here — read-only."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads" value={data?.leads.length ?? 0} />
        <StatCard label="Audits" value={data?.audits.length ?? 0} />
        <StatCard label="Outreach messages" value={data?.outreach.length ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["leads", "audits", "outreach"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t === "leads" ? "Leads" : t === "audits" ? "Audits" : "Outreach"}
          </Button>
        ))}
      </div>

      <Panel>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading workspace data…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Workspace data is unavailable right now. Please try again shortly.</p>
        ) : tab === "leads" ? (
          data?.leads.length ? (
            <ul className="divide-y divide-border/60">
              {data.leads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link to="/leads/$id" params={{ id: l.id }} className="font-medium hover:underline">
                      {l.business_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[l.city, l.phone, l.website].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="label-mono">
                    {l.lead_status}
                    {l.audit_score != null ? ` · ${l.audit_score}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No leads yet" description="Leads found by your team will appear here." />
          )
        ) : tab === "audits" ? (
          data?.audits.length ? (
            <ul className="divide-y divide-border/60">
              {data.audits.map((a) => (
                <li key={a.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.leads?.business_name ?? "Lead"}</span>
                    <span className="label-mono">Score {a.overall_score}</span>
                  </div>
                  {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
                  {a.biggest_opportunity && <p className="text-xs">Opportunity: {a.biggest_opportunity}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No audits yet" description="Website audits run by your team will appear here." />
          )
        ) : data?.outreach.length ? (
          <ul className="divide-y divide-border/60">
            {data.outreach.map((m) => (
              <li key={m.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{m.leads?.business_name ?? "Lead"}</span>
                  <span className="label-mono">
                    {m.channel} · {m.step} · {m.sent_at ? "sent" : m.status}
                  </span>
                </div>
                {m.subject && <p className="text-sm font-medium">{m.subject}</p>}
                <p className="whitespace-pre-line text-sm text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No outreach yet" description="Outreach messages drafted by your team will appear here." />
        )}
      </Panel>
    </div>
  );
}
