import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const WS_KEY = "leadpilot.workspace";

export type Workspace = { id: string; name: string; plan_id: string; owner_id: string };
export type Membership = { workspace_id: string; role: "owner" | "admin" | "member"; workspaces: Workspace | null };

type AppContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  workspaces: { workspace: Workspace; role: Membership["role"] }[];
  workspaceId: string | null;
  workspace: Workspace | null;
  role: Membership["role"] | null;
  setWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => void;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(WS_KEY) : null;
    if (stored) setWorkspaceIdState(stored);
  }, []);

  const userId = session?.user?.id ?? null;

  const { data: memberships = [], refetch } = useQuery({
    queryKey: ["workspaces", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(id, name, plan_id, owner_id)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Membership[];
    },
  });

  const workspaces = useMemo(
    () =>
      memberships
        .filter((m) => m.workspaces)
        .map((m) => ({ workspace: m.workspaces as Workspace, role: m.role })),
    [memberships],
  );

  useEffect(() => {
    if (!workspaces.length) return;
    const valid = workspaces.some((w) => w.workspace.id === workspaceId);
    if (!valid) {
      const next = workspaces[0]!.workspace.id;
      setWorkspaceIdState(next);
      window.localStorage.setItem(WS_KEY, next);
    }
  }, [workspaces, workspaceId]);

  const setWorkspaceId = useCallback(
    (id: string) => {
      setWorkspaceIdState(id);
      window.localStorage.setItem(WS_KEY, id);
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const active = workspaces.find((w) => w.workspace.id === workspaceId) ?? null;

  const value: AppContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    workspaces,
    workspaceId: active?.workspace.id ?? null,
    workspace: active?.workspace ?? null,
    role: active?.role ?? null,
    setWorkspaceId,
    refreshWorkspaces: () => void refetch(),
    signOut: async () => {
      await supabase.auth.signOut();
      queryClient.clear();
      window.localStorage.removeItem(WS_KEY);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** Workspace id guaranteed non-null inside the authenticated area. */
export function useWorkspaceId(): string | null {
  return useApp().workspaceId;
}
