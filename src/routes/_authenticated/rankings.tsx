import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { rankLeads } from "@/lib/ai.functions";
import { PageHeader, Panel, EmptyState, GradeBadge, StatCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — LeadPilot AI" },
      { name: "description", content: "Opportunity scores ranking every lead from hottest to coldest so your team works the best first." },
      { property: "og:title", content: "Rankings — LeadPilot AI" },
      { property: "og:description", content: "AI opportunity ranking for local business leads." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RankingsPage,
});

function RankingsPage() {
  const { workspaceId } = useApp();
  const queryClient = useQueryClient();
  const rank = useServerFn(rankLeads);

  const { data } = useQuery({
    queryKey: ["rankings", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [ranked, unranked] = await Promise.all([
        supabase
          .from("leads")
          .select("id, business_name, city, category, opportunity_score, opportunity_grade, audit_score")
          .eq("workspace_id", workspaceId!)
          .not("opportunity_score", "is", null)
          .order("opportunity_score", { ascending: false })
          .limit(200),
        supabase
          .from("leads")
          .select("id")
          .eq("workspace_id", workspaceId!)
          .is("opportunity_score", null)
          .limit(50),
      ]);
      return { ranked: ranked.data ?? [], unranked: (unranked.data ?? []).map((l) => l.id) };
    },
  });

  const rankAll = useMutation({
    mutationFn: async () => rank({ data: { workspaceId: workspaceId!, leadIds: (data?.unranked ?? []).slice(0, 50) } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Ranked ${result.updated} lead(s).`);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Ranking failed."),
  });

  const ranked = data?.ranked ?? [];
  const hot = ranked.filter((l) => (l.opportunity_score ?? 0) >= 90).length;
  const high = ranked.filter((l) => (l.opportunity_score ?? 0) >= 75 && (l.opportunity_score ?? 0) < 90).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 03"
        title="Opportunity rankings"
        description="Leads scored 0–100 on how much they need a new website and how likely they are to buy."
        actions={
          <Button
            size="sm"
            onClick={() => rankAll.mutate()}
            disabled={!data?.unranked.length || rankAll.isPending}
          >
            <ListOrdered className="mr-1.5 size-4" />
            {rankAll.isPending ? "Ranking…" : `Rank ${data?.unranked.length ?? 0} unranked`}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Ranked" value={ranked.length} />
        <StatCard label="Hot (90+)" value={hot} highlight tone="accent" />
        <StatCard label="High (75–89)" value={high} tone="hot" />
      </div>

      {!ranked.length ? (
        <EmptyState
          icon={<ListOrdered className="size-5" />}
          title="Nothing ranked yet"
          description="Rank your leads to sort the pipeline by opportunity. Auditing first produces sharper scores."
          action={
            <Button asChild size="sm">
              <Link to="/leads">Open leads</Link>
            </Button>
          }
        />
      ) : (
        <Panel className="p-0 sm:p-0">
          <ol className="divide-y divide-border/50">
            {ranked.map((lead, index) => (
              <li key={lead.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-8 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/leads/$id"
                    params={{ id: lead.id }}
                    className="truncate text-sm text-foreground hover:text-accent"
                  >
                    {lead.business_name}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {[lead.category, lead.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <GradeBadge score={lead.audit_score} />
                <GradeBadge score={lead.opportunity_score} />
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
