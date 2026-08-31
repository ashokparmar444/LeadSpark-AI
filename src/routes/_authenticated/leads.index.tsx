import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radar as RadarIcon, Download, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/useApp";
import { rankLeads } from "@/lib/ai.functions";
import { PageHeader, Panel, GradeBadge, EmptyState, DemoTag } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LEAD_STATUSES, statusLabel } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — LeadPilot AI" },
      { name: "description", content: "Your full local business lead database with scores, status and contact details." },
      { property: "og:title", content: "Leads — LeadPilot AI" },
      { property: "og:description", content: "Manage every local business lead in one table." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { workspaceId } = useApp();
  const queryClient = useQueryClient();
  const rank = useServerFn(rankLeads);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("opportunity_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (status !== "all" && lead.lead_status !== status) return false;
      if (!q) return true;
      return [lead.business_name, lead.city, lead.category, lead.email, lead.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [leads, search, status]);

  const rankSelected = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected.");
      return rank({ data: { workspaceId, leadIds: selected.slice(0, 50) } });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Ranked ${result.updated} lead(s).`);
      setSelected([]);
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ranking failed."),
  });

  const exportCsv = () => {
    const header = ["Business", "Category", "City", "Phone", "Email", "Website", "Rating", "Reviews", "Audit", "Opportunity", "Status"];
    const rows = filtered.map((l) => [
      l.business_name, l.category, l.city, l.phone, l.email, l.website,
      l.google_rating, l.review_count, l.audit_score, l.opportunity_score, l.lead_status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadpilot-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const allSelected = filtered.length > 0 && selected.length === filtered.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lead database"
        title="Leads"
        description="Every business you've discovered, scored and worked."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="mr-1.5 size-4" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => rankSelected.mutate()}
              disabled={!selected.length || rankSelected.isPending}
            >
              <ListOrdered className="mr-1.5 size-4" />
              {rankSelected.isPending ? "Ranking…" : `Rank ${selected.length || ""}`}
            </Button>
          </>
        }
      />

      <Panel className="p-3 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, city, email…"
            className="max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {filtered.length} of {leads.length}
          </span>
        </div>
      </Panel>

      {isLoading ? (
        <Panel>
          <p className="text-sm text-muted-foreground">Loading leads…</p>
        </Panel>
      ) : !filtered.length ? (
        <EmptyState
          icon={<RadarIcon className="size-5" />}
          title={leads.length ? "No leads match those filters" : "No leads yet"}
          description={
            leads.length
              ? "Try clearing the search or status filter."
              : "Run a scan in the Lead Finder to populate your database. Demo data is available if live scraping isn't connected."
          }
          action={
            <Button asChild size="sm">
              <Link to="/lead-finder">Open Lead Finder</Link>
            </Button>
          }
        />
      ) : (
        <Panel className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected(v ? filtered.map((l) => l.id) : [])}
                    aria-label="Select all"
                  />
                </th>
                {["Business", "Location", "Contact", "Rating", "Audit", "Opportunity", "Status"].map((h) => (
                  <th key={h} className="label-mono px-3 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-panel2/40">
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selected.includes(lead.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => (v ? [...prev, lead.id] : prev.filter((id) => id !== lead.id)))
                      }
                      aria-label={`Select ${lead.business_name}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link to="/leads/$id" params={{ id: lead.id }} className="font-medium text-foreground hover:text-accent">
                      {lead.business_name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{lead.category ?? "—"}</span>
                      {lead.is_demo ? <DemoTag /> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.city ?? "—"}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                    {lead.phone ?? "—"}
                    <br />
                    {lead.email ?? "—"}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                    {lead.google_rating ?? "—"} ({lead.review_count ?? 0})
                  </td>
                  <td className="px-3 py-3">
                    <GradeBadge score={lead.audit_score} />
                  </td>
                  <td className="px-3 py-3">
                    <GradeBadge score={lead.opportunity_score} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{statusLabel(lead.lead_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
