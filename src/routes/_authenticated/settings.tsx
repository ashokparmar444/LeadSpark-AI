import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { PageHeader, Panel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_PROVIDERS } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LeadPilot AI" },
      { name: "description", content: "Manage your workspace name, team members and AI provider preferences." },
      { property: "og:title", content: "Settings — LeadPilot AI" },
      { property: "og:description", content: "Workspace, team and AI configuration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { workspaceId, workspace, role, user, refreshWorkspaces } = useApp();
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace?.name ?? "");
  const [provider, setProvider] = useState("gemini");
  const canEdit = role === "owner" || role === "admin";

  useEffect(() => {
    setName(workspace?.name ?? "");
  }, [workspace?.name]);

  const { data } = useQuery({
    queryKey: ["settings", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [settings, members] = await Promise.all([
        supabase.from("workspace_settings").select("*").eq("workspace_id", workspaceId!).maybeSingle(),
        supabase.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", workspaceId!),
      ]);
      return { settings: settings.data, members: members.data ?? [] };
    },
  });

  useEffect(() => {
    if (data?.settings?.ai_provider) setProvider(data.settings.ai_provider);
  }, [data?.settings?.ai_provider]);

  const saveWorkspace = async () => {
    if (!workspaceId) return;
    const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", workspaceId);
    if (error) {
      toast.error("The workspace could not be updated.");
      return;
    }
    toast.success("Workspace updated.");
    refreshWorkspaces();
  };

  const saveProvider = async (value: string) => {
    if (!workspaceId) return;
    setProvider(value);
    const { error } = await supabase
      .from("workspace_settings")
      .upsert({ workspace_id: workspaceId, ai_provider: value }, { onConflict: "workspace_id" });
    if (error) {
      toast.error("The AI provider could not be saved.");
      return;
    }
    toast.success("AI provider updated.");
    void queryClient.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration" title="Settings" description="Workspace, team and AI engine preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="label-mono">Workspace</p>
          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
            <Button size="sm" onClick={saveWorkspace} disabled={!canEdit || !name.trim()}>
              Save
            </Button>
            {!canEdit ? (
              <p className="font-mono text-[11px] text-muted-foreground">Only owners and admins can rename a workspace.</p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <p className="label-mono">AI engine</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which model powers audits, ranking, website strategy and outreach.
          </p>
          <Select value={provider} onValueChange={saveProvider} disabled={!canEdit}>
            <SelectTrigger className="mt-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.filter((p) => p.available).map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>

        <Panel className="lg:col-span-2">
          <p className="label-mono">Team</p>
          <ul className="mt-4 divide-y divide-border/60">
            {(data?.members ?? []).map((member) => (
              <li key={member.user_id} className="flex items-center justify-between py-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {member.user_id === user?.id ? `${user.email} (you)` : member.user_id}
                </span>
                <span className="rounded bg-panel2/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Invites are coming soon. Members added to this workspace share every lead, audit and campaign.
          </p>
        </Panel>
      </div>
    </div>
  );
}
