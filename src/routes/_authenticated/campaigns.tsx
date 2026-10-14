import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel, EmptyState, Pill } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHANNELS } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — LeadPilot AI" },
      { name: "description", content: "Group leads into outreach campaigns and track their progress from draft to closed." },
      { property: "og:title", content: "Campaigns — LeadPilot AI" },
      { property: "og:description", content: "Organise outreach into trackable campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { workspaceId, user } = useApp();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_campaigns")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = async () => {
    if (!name.trim() || !workspaceId || !user) return;
    const { error } = await supabase.from("outreach_campaigns").insert({
      workspace_id: workspaceId,
      name: name.trim(),
      channel: channel as never,
    });
    if (error) {
      toast.error("The campaign could not be created.");
      return;
    }
    setName("");
    toast.success("Campaign created.");
    void queryClient.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Campaigns"
        description="Bundle leads into a named push so you can track how each outreach effort performs."
      />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <span className="label-mono">Campaign name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmedabad dentists · March" />
          </div>
          <div className="w-40 space-y-1.5">
            <span className="label-mono">Channel</span>
            <Select value={channel} onValueChange={setChannel}>
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
          <Button onClick={create} disabled={!name.trim()}>
            Create campaign
          </Button>
        </div>
      </Panel>

      {!campaigns.length ? (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="No campaigns yet"
          description="Create a campaign to group a batch of leads and keep outreach organised."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <Panel key={campaign.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {campaign.channel} · {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Pill tone={campaign.status === "active" ? "accent" : "muted"}>{campaign.status}</Pill>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
