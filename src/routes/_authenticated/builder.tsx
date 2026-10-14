import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Blocks, Copy, ExternalLink, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { generateWebsiteStrategy } from "@/lib/ai.functions";
import { SiteEditor } from "@/components/app/SiteEditor";
import { PageHeader, Panel, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { BUILDER_PLATFORMS } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Platform = (typeof BUILDER_PLATFORMS)[number]["value"];

export const Route = createFileRoute("/_authenticated/builder")({
  head: () => ({
    meta: [
      { title: "Website Builder — LeadPilot AI" },
      { name: "description", content: "Generate, edit and preview local business website copy, then publish your approved site." },
      { property: "og:title", content: "Website Builder — LeadPilot AI" },
      { property: "og:description", content: "Turn an audit into a demo-site build prompt in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const { workspaceId } = useApp();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateWebsiteStrategy);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState("");
  const [platform, setPlatform] = useState<Platform>("lovable");

  const { data } = useQuery({
    queryKey: ["builder", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return { leads: [], projects: [] };
      const [leads, projects] = await Promise.all([
        supabase
          .from("leads")
          .select("id, business_name, city")
          .eq("workspace_id", workspaceId)
          .order("opportunity_score", { ascending: false, nullsFirst: false })
          .limit(200),
        supabase
          .from("website_projects")
          .select("*, leads(business_name, category, phone, email, address, city, state, country, google_rating, review_count, google_maps_url)")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (leads.error || projects.error) throw new Error("Website projects could not be loaded.");
      return { leads: leads.data ?? [], projects: projects.data ?? [] };
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Choose a workspace first.");
      return generate({ data: { workspaceId, leadId, platform } });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Website strategy generated.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("The strategy could not be generated."),
  });

  const editingProject = data?.projects.find((project) => project.id === editingId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 04"
        title="Website builder"
        description="Website projects"
      />

      <Panel>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <span className="label-mono">Lead</span>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead" />
              </SelectTrigger>
              <SelectContent>
                {(data?.leads ?? []).map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.business_name}
                    {lead.city ? ` · ${lead.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="label-mono">Platform</span>
            <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDER_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => run.mutate()} disabled={!leadId || run.isPending}>
            <Blocks className="mr-1.5 size-4" /> {run.isPending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Panel>

      {!data?.projects.length ? (
        <EmptyState
          icon={<Blocks className="size-5" />}
          title="No website projects yet"
          description="Pick a lead above to generate its strategy, sitemap, copy and builder prompt."
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/leads">Browse leads</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.projects.map((project) => {
            const strategy = (project.strategy ?? {}) as {
              strategy?: string;
              sitemap?: string[];
              hero_headline?: string;
              sales_pitch?: string[];
            };
            const liveUrl = project.slug ? `/sites/${project.slug}` : project.demo_url;
            return (
              <Panel key={project.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {project.platform} · {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditingId(project.id)}>
                      <Pencil className="mr-1.5 size-3.5" /> Edit site
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(project.prompt ?? "");
                        toast.success("Builder prompt copied.");
                      }}
                    >
                      <Copy className="mr-1.5 size-3.5" /> Copy prompt
                    </Button>
                    {project.status === "published" && liveUrl ? (
                      <Button asChild size="sm">
                        <a href={liveUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 size-3.5" /> View live site
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
                {strategy.hero_headline ? (
                  <p className="mt-3 text-sm text-foreground">“{strategy.hero_headline}”</p>
                ) : null}
                {strategy.strategy ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{strategy.strategy}</p>
                ) : null}
                {strategy.sitemap?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {strategy.sitemap.map((page) => (
                      <span key={page} className="rounded bg-panel2/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {page}
                      </span>
                    ))}
                  </div>
                ) : null}
                <details className="mt-4">
                  <summary className="cursor-pointer font-mono text-[11px] text-accent">view builder prompt</summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-ink p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {project.prompt}
                  </pre>
                </details>
              </Panel>
            );
          })}
        </div>
      )}
      {workspaceId && editingProject?.leads && (
        <SiteEditor
          key={`${workspaceId}:${editingProject.id}`}
          workspaceId={workspaceId}
          project={editingProject}
          business={editingProject.leads}
          onClose={() => setEditingId(null)}
          onSaved={() => { void queryClient.invalidateQueries({ queryKey: ["builder", workspaceId] }); }}
        />
      )}
    </div>
  );
}
