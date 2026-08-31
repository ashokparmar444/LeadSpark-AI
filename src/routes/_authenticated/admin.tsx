import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/app/primitives";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LeadPilot AI" },
      { name: "description", content: "Owner-only view of workspace activity, scrape jobs and AI operations." },
      { property: "og:title", content: "Admin — LeadPilot AI" },
      { property: "og:description", content: "Owner-only workspace operations view." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { workspaceId, role } = useApp();
  const isOwner = role === "owner";

  const { data } = useQuery({
    queryKey: ["admin", workspaceId],
    enabled: Boolean(workspaceId) && isOwner,
    queryFn: async () => {
      const [jobs, usage, members] = await Promise.all([
        supabase
          .from("scrape_jobs")
          .select("id, query, status, results_count, created_at")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("ai_usage").select("credits").eq("workspace_id", workspaceId!),
        supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspaceId!),
      ]);
      return {
        jobs: jobs.data ?? [],
        credits: (usage.data ?? []).reduce((sum, u) => sum + (u.credits ?? 0), 0),
        members: members.count ?? 0,
      };
    },
  });

  if (!isOwner) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="Owners only"
        description="Ask the workspace owner for access to the admin view."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Admin" description="Workspace activity and job history." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Team members" value={data?.members ?? 0} />
        <StatCard label="Scrape jobs" value={data?.jobs.length ?? 0} tone="hot" />
        <StatCard label="AI credits used" value={data?.credits ?? 0} highlight tone="accent" />
      </div>

      <Panel>
        <p className="label-mono">Recent scrape jobs</p>
        {!data?.jobs.length ? (
          <p className="mt-4 text-sm text-muted-foreground">No scrape jobs have run yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {data.jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{job.query}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[11px] text-muted-foreground">{job.status}</p>
                  <p className="font-mono text-[11px] text-foreground">{job.results_count ?? 0} results</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
