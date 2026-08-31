import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { auditLead } from "@/lib/ai.functions";
import { PageHeader, Panel, EmptyState, GradeBadge, ScoreBar } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/audits")({
  head: () => ({
    meta: [
      { title: "Audits — LeadPilot AI" },
      { name: "description", content: "AI website audits scoring design, mobile, SEO, conversion and trust for every lead." },
      { property: "og:title", content: "Audits — LeadPilot AI" },
      { property: "og:description", content: "Website audit scores across your lead database." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditsPage,
});

function AuditsPage() {
  const { workspaceId } = useApp();
  const queryClient = useQueryClient();
  const run = useServerFn(auditLead);

  const { data } = useQuery({
    queryKey: ["audits", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [audits, pending] = await Promise.all([
        supabase
          .from("audits")
          .select("*, leads(business_name, city)")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("leads")
          .select("id, business_name, city, website")
          .eq("workspace_id", workspaceId!)
          .is("audit_score", null)
          .not("website", "is", null)
          .limit(20),
      ]);
      return { audits: audits.data ?? [], pending: pending.data ?? [] };
    },
  });

  const audit = useMutation({
    mutationFn: async (leadId: string) => run({ data: { workspaceId: workspaceId!, leadId } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Audit complete · score ${result.score}`);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("The audit could not be completed."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 02"
        title="Website audits"
        description="AI grades each site on design, mobile, SEO, conversion and trust — then names the biggest opportunity."
      />

      {data?.pending.length ? (
        <Panel>
          <p className="label-mono">Waiting to be audited</p>
          <ul className="mt-3 divide-y divide-border/60">
            {data.pending.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{lead.business_name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{lead.website}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => audit.mutate(lead.id)} disabled={audit.isPending}>
                  Audit
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {!data?.audits.length ? (
        <EmptyState
          icon={<Gauge className="size-5" />}
          title="No audits yet"
          description="Audit a lead with a website to see how it scores across design, mobile, SEO, conversion and trust."
          action={
            <Button asChild size="sm">
              <Link to="/leads">Choose a lead</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.audits.map((item) => (
            <Panel key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/leads/$id"
                    params={{ id: item.lead_id }}
                    className="truncate text-sm font-medium text-foreground hover:text-accent"
                  >
                    {(item.leads as { business_name?: string } | null)?.business_name ?? "Lead"}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {(item.leads as { city?: string } | null)?.city ?? "—"}
                  </p>
                </div>
                <GradeBadge score={item.overall_score} />
              </div>
              <div className="mt-4 space-y-2">
                <ScoreBar label="design" score={item.design_score ?? 0} />
                <ScoreBar label="mobile" score={item.mobile_score ?? 0} delay={70} />
                <ScoreBar label="seo" score={item.seo_score ?? 0} delay={140} />
                <ScoreBar label="conversion" score={item.conversion_score ?? 0} delay={210} />
              </div>
              {item.biggest_opportunity ? (
                <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {item.biggest_opportunity}
                </p>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
