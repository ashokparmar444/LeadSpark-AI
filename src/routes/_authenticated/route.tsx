import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { AppShell } from "@/components/app/AppShell";
import { Panel, Radar } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, workspaces, workspace, refreshWorkspaces } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Radar size={44} />
      </div>
    );
  }

  if (!workspaces.length) {
    return <CreateWorkspace onCreated={refreshWorkspaces} />;
  }

  if (!workspace) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Radar size={44} />
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function CreateWorkspace({ onCreated }: { onCreated: () => void }) {
  const { user } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name: name.trim() || "My Agency", owner_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: data.id, user_id: user.id, role: "owner" });
      if (memberError) throw memberError;
      toast.success("Workspace created.");
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the workspace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <Radar size={30} />
          <span className="text-sm font-semibold tracking-tight">
            LeadPilot<span className="text-accent"> AI</span>
          </span>
        </div>
        <Panel>
          <p className="label-mono text-accent">Setup · step 1</p>
          <h1 className="mt-1.5 text-lg font-semibold text-foreground">Name your workspace</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every lead, audit and campaign lives inside a workspace. You can invite teammates later.
          </p>
          <form onSubmit={create} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ws">Workspace name</Label>
              <Input id="ws" value={name} onChange={(e) => setName(e.target.value)} placeholder="Northline Studio" required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
