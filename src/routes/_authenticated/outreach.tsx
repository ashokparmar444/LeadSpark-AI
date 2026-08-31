import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { generateOutreach } from "@/lib/ai.functions";
import { PageHeader, Panel, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CHANNELS, LANGUAGES, OUTREACH_STEPS, MESSAGE_VARIABLES } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Channel = (typeof CHANNELS)[number]["value"];
type Language = (typeof LANGUAGES)[number];
type Step = (typeof OUTREACH_STEPS)[number]["value"];

export const Route = createFileRoute("/_authenticated/outreach")({
  head: () => ({
    meta: [
      { title: "Outreach — LeadPilot AI" },
      { name: "description", content: "Draft personalised multi-step outreach in English, Hinglish, Hindi or Gujarati across email and social channels." },
      { property: "og:title", content: "Outreach — LeadPilot AI" },
      { property: "og:description", content: "AI outreach sequences built from real audit findings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OutreachPage,
});

function OutreachPage() {
  const { workspaceId } = useApp();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateOutreach);

  const [leadId, setLeadId] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [language, setLanguage] = useState<Language>("english");
  const [steps, setSteps] = useState<Step[]>(["initial", "day3", "day7"]);
  const [senderName, setSenderName] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  const { data } = useQuery({
    queryKey: ["outreach", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [leads, messages] = await Promise.all([
        supabase
          .from("leads")
          .select("id, business_name, city")
          .eq("workspace_id", workspaceId!)
          .order("opportunity_score", { ascending: false, nullsFirst: false })
          .limit(200),
        supabase
          .from("outreach_messages")
          .select("*, leads(business_name)")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      return { leads: leads.data ?? [], messages: messages.data ?? [] };
    },
  });

  const run = useMutation({
    mutationFn: async () =>
      generate({
        data: { workspaceId: workspaceId!, leadId, channel, language, steps, senderName, demoUrl },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outreach sequence drafted.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Outreach could not be generated."),
  });

  const toggleStep = (step: Step, on: boolean) =>
    setSteps((prev) => (on ? [...prev, step] : prev.filter((s) => s !== step)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 05"
        title="Outreach"
        description="Short, human, audit-backed messages. Nothing is sent automatically — review, copy, then send from your own account."
      />

      <Panel>
        <div className="grid gap-4 sm:grid-cols-3">
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="label-mono">Channel</span>
            <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="label-mono">Language</span>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang[0]!.toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="label-mono">Your name</span>
            <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Alex" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <span className="label-mono">Demo URL (optional)</span>
            <Input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://demo.yoursite.com" />
          </div>
        </div>

        <div className="mt-5 border-t border-border/70 pt-4">
          <p className="label-mono">Sequence steps</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {OUTREACH_STEPS.map((step) => (
              <label key={step.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={steps.includes(step.value)}
                  onCheckedChange={(v) => toggleStep(step.value, Boolean(v))}
                />
                {step.label}
              </label>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            Variables available: {MESSAGE_VARIABLES.join(" ")}
          </p>
        </div>

        <Button className="mt-5" onClick={() => run.mutate()} disabled={!leadId || !steps.length || run.isPending}>
          <Send className="mr-1.5 size-4" /> {run.isPending ? "Drafting…" : "Generate sequence"}
        </Button>
      </Panel>

      {!data?.messages.length ? (
        <EmptyState
          icon={<Send className="size-5" />}
          title="No outreach drafted yet"
          description="Choose a lead and generate a sequence. Audited leads produce far more specific messages."
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/audits">Run an audit first</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.messages.map((message) => (
            <Panel key={message.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/leads/$id"
                    params={{ id: message.lead_id }}
                    className="truncate text-sm font-medium text-foreground hover:text-accent"
                  >
                    {(message.leads as { business_name?: string } | null)?.business_name ?? "Lead"}
                  </Link>
                  <p className="label-mono text-accent">
                    {message.step} · {message.channel} · {message.language}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(message.body);
                    toast.success("Message copied.");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              {message.subject ? <p className="mt-3 text-sm font-medium text-foreground">{message.subject}</p> : null}
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{message.body}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
