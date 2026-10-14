import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Gauge, Blocks, Send, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { auditLead, generateWebsiteStrategy, generateOutreach } from "@/lib/ai.functions";
import { Panel, PageHeader, ScoreCircle, ScoreBar, GradeBadge, DemoTag } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES, statusLabel } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({
    meta: [
      { title: "Lead detail — LeadPilot AI" },
      { name: "description", content: "Full profile, audit results, website strategy and outreach history for a single lead." },
      { property: "og:title", content: "Lead detail — LeadPilot AI" },
      { property: "og:description", content: "Audit, rank, build and convert a single local business lead." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = useParams({ from: "/_authenticated/leads/$id" });
  const { workspaceId, user } = useApp();
  const queryClient = useQueryClient();
  const runAudit = useServerFn(auditLead);
  const runBuild = useServerFn(generateWebsiteStrategy);
  const runOutreach = useServerFn(generateOutreach);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [lead, audit, project, messages, notes] = await Promise.all([
        supabase.from("leads").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("audits")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("website_projects")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("outreach_messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
        supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      ]);
      return {
        lead: lead.data,
        audit: audit.data,
        project: project.data,
        messages: messages.data ?? [],
        notes: notes.data ?? [],
      };
    },
  });

  const invalidate = () => void queryClient.invalidateQueries();

  const audit = useMutation({
    mutationFn: async () => runAudit({ data: { workspaceId: workspaceId!, leadId: id } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Audit complete · score ${result.score}`);
      invalidate();
    },
    onError: () => toast.error("The audit could not be completed."),
  });

  const build = useMutation({
    mutationFn: async () => runBuild({ data: { workspaceId: workspaceId!, leadId: id, platform: "lovable" } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Website strategy generated.");
      invalidate();
    },
    onError: () => toast.error("The strategy could not be generated."),
  });

  const outreach = useMutation({
    mutationFn: async () =>
      runOutreach({
        data: {
          workspaceId: workspaceId!,
          leadId: id,
          channel: "email",
          language: "english",
          steps: ["initial", "day3", "day7"],
          senderName: "",
          demoUrl: "",
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outreach sequence drafted.");
      invalidate();
    },
    onError: () => toast.error("Outreach could not be generated."),
  });

  const updateStatus = async (value: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ lead_status: value as never })
      .eq("id", id);
    if (error) {
      toast.error("Status could not be updated.");
      return;
    }
    toast.success("Status updated.");
    invalidate();
  };

  const addNote = async () => {
    if (!note.trim() || !workspaceId) return;
    const { error } = await supabase
      .from("lead_notes")
      .insert({ workspace_id: workspaceId, lead_id: id, user_id: user!.id, body: note.trim() });
    if (error) {
      toast.error("The note could not be saved.");
      return;
    }
    setNote("");
    invalidate();
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading lead…</p>;
  }
  const lead = data?.lead;
  if (!lead) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">This lead no longer exists.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/leads" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> back to leads
      </Link>

      <PageHeader
        eyebrow={[lead.category, lead.city].filter(Boolean).join(" · ")}
        title={lead.business_name}
        actions={
          <>
            <Select value={lead.lead_status} onValueChange={updateStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => audit.mutate()} disabled={audit.isPending}>
              <Gauge className="mr-1.5 size-4" /> {audit.isPending ? "Auditing…" : "Run audit"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <p className="label-mono">Business</p>
              {lead.is_demo ? <DemoTag /> : null}
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Phone" value={lead.phone} />
              <Row label="Email" value={lead.email} />
              <Row label="Website" value={lead.website} href={lead.website} />
              <Row label="Address" value={lead.address} />
              <Row label="Rating" value={lead.google_rating ? `${lead.google_rating} (${lead.review_count ?? 0} reviews)` : null} />
              <Row label="Status" value={statusLabel(lead.lead_status)} />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
              <span className="label-mono">Opportunity</span>
              <GradeBadge score={lead.opportunity_score} />
            </div>
          </Panel>

          <Panel>
            <p className="label-mono">Notes</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this lead…"
              className="mt-3"
              rows={3}
            />
            <Button size="sm" className="mt-2" onClick={addNote} disabled={!note.trim()}>
              Save note
            </Button>
            <ul className="mt-4 space-y-3">
              {data?.notes.map((item) => (
                <li key={item.id} className="rounded-lg bg-panel2/50 p-3">
                  <p className="text-sm text-foreground">{item.body}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <p className="label-mono">Website audit</p>
            {!data?.audit ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  No audit yet. Run one to score design, mobile, SEO, conversion and trust.
                </p>
                <Button size="sm" className="mt-3" onClick={() => audit.mutate()} disabled={audit.isPending}>
                  {audit.isPending ? "Auditing…" : "Run AI audit"}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="flex items-center gap-5">
                  <ScoreCircle score={data.audit.overall_score ?? 0} />
                  <div className="flex-1 space-y-2">
                    <ScoreBar label="design" score={data.audit.design_score ?? 0} />
                    <ScoreBar label="mobile" score={data.audit.mobile_score ?? 0} delay={80} />
                    <ScoreBar label="seo" score={data.audit.seo_score ?? 0} delay={160} />
                    <ScoreBar label="conversion" score={data.audit.conversion_score ?? 0} delay={240} />
                    <ScoreBar label="trust" score={data.audit.trust_score ?? 0} delay={320} />
                  </div>
                </div>
                {data.audit.biggest_opportunity ? (
                  <div className="rounded-lg bg-accent/8 p-3 ring-1 ring-accent/20">
                    <p className="label-mono text-accent">Biggest opportunity</p>
                    <p className="mt-1 text-sm text-foreground">{data.audit.biggest_opportunity}</p>
                  </div>
                ) : null}
                {Array.isArray(data.audit.critical_problems) && data.audit.critical_problems.length ? (
                  <div>
                    <p className="label-mono">Critical problems</p>
                    <ul className="mt-2 space-y-1.5">
                      {(data.audit.critical_problems as string[]).map((problem) => (
                        <li key={problem} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warn" />
                          {problem}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(data.audit.recommendations) && data.audit.recommendations.length ? (
                  <div>
                    <p className="label-mono">Recommendations</p>
                    <ul className="mt-2 space-y-1.5">
                      {(data.audit.recommendations as string[]).map((rec) => (
                        <li key={rec} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {data.audit.estimated_monthly_opportunity ? (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Estimated monthly opportunity: {data.audit.estimated_monthly_opportunity} (estimate, not a guarantee)
                  </p>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <p className="label-mono">Website build</p>
              <Button size="sm" variant="secondary" onClick={() => build.mutate()} disabled={build.isPending}>
                <Blocks className="mr-1.5 size-4" /> {build.isPending ? "Generating…" : "Generate strategy"}
              </Button>
            </div>
            {!data?.project ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Generate a full site strategy plus a copy-paste builder prompt for Lovable, Bolt or Claude Code.
              </p>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{(data.project.strategy as { strategy?: string })?.strategy}</p>
                <div className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-ink p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {data.project.prompt}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(data.project!.prompt ?? "");
                    toast.success("Builder prompt copied.");
                  }}
                >
                  <Copy className="mr-1.5 size-3.5" /> Copy prompt
                </Button>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <p className="label-mono">Outreach</p>
              <Button size="sm" variant="secondary" onClick={() => outreach.mutate()} disabled={outreach.isPending}>
                <Send className="mr-1.5 size-4" /> {outreach.isPending ? "Drafting…" : "Draft sequence"}
              </Button>
            </div>
            {!data?.messages.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No messages yet. Draft a personalised three-step email sequence built from the audit findings.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.messages.map((message) => (
                  <li key={message.id} className="rounded-lg bg-panel2/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="label-mono text-accent">{message.step} · {message.channel}</span>
                      <button
                        className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          void navigator.clipboard.writeText(message.body);
                          toast.success("Message copied.");
                        }}
                      >
                        copy
                      </button>
                    </div>
                    {message.subject ? (
                      <p className="mt-1.5 text-sm font-medium text-foreground">{message.subject}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value?: string | number | null; href?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="label-mono">{label}</dt>
      <dd className="max-w-[60%] break-words text-right text-sm text-foreground">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent hover:underline">
            {String(value)} <ExternalLink className="size-3" />
          </a>
        ) : (
          (value ?? "—")
        )}
      </dd>
    </div>
  );
}
