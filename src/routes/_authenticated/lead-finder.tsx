import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radar as RadarIcon, Sparkles } from "lucide-react";
import { findLeads, getIntegrationStatus } from "@/lib/leads.functions";
import { useApp } from "@/hooks/useApp";
import { Panel, PageHeader, Radar } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/lead-finder")({
  head: () => ({
    meta: [
      { title: "Lead Finder — LeadPilot AI" },
      { name: "description", content: "Scan any niche in any city for local business leads with filters for rating, reviews, website and contact details." },
      { property: "og:title", content: "Lead Finder — LeadPilot AI" },
      { property: "og:description", content: "Find local business leads by niche and city." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadFinderPage,
});

function LeadFinderPage() {
  const { workspaceId } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const find = useServerFn(findLeads);
  const status = useServerFn(getIntegrationStatus);

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => status({}),
  });

  const [form, setForm] = useState({
    niche: "Dentists",
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    keyword: "",
    count: 12,
    minRating: 0,
    minReviews: 0,
    hasWebsite: "any" as "any" | "yes" | "no",
    hasPhone: false,
    hasEmail: false,
    hasSocial: false,
  });

  const run = useMutation({
    mutationFn: async (source: "live" | "demo") => {
      if (!workspaceId) throw new Error("No workspace selected.");
      return find({ data: { workspaceId, source: source === "live" ? "apify" : "demo", ...form } });
    },

    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries();
      toast.success(`${result.saved} new lead${result.saved === 1 ? "" : "s"} added${result.skipped ? ` · ${result.skipped} duplicate(s) skipped` : ""}.`);
      void navigate({ to: "/leads" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The scan failed."),
  });

  const busy = run.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 01"
        title="Lead Finder"
        description="Target a niche and a city. Results are de-duplicated against your existing leads automatically."
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business type / niche">
              <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Dentists" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ahmedabad" />
            </Field>
            <Field label="State / region">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Gujarat" />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="India" />
            </Field>
            <Field label="Extra keyword (optional)">
              <Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="implants" />
            </Field>
            <Field label="Number of leads">
              <Input
                type="number"
                min={1}
                max={200}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) || 1 })}
              />
            </Field>
          </div>

          <div className="mt-6 border-t border-border/70 pt-5">
            <p className="label-mono">Filters</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label="Minimum rating">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  value={form.minRating}
                  onChange={(e) => setForm({ ...form, minRating: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Minimum reviews">
                <Input
                  type="number"
                  min={0}
                  value={form.minReviews}
                  onChange={(e) => setForm({ ...form, minReviews: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Website">
                <Select
                  value={form.hasWebsite}
                  onValueChange={(value) => setForm({ ...form, hasWebsite: value as typeof form.hasWebsite })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Has a website</SelectItem>
                    <SelectItem value="no">No website</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-5">
              <Toggle label="Has phone" checked={form.hasPhone} onChange={(v) => setForm({ ...form, hasPhone: v })} />
              <Toggle label="Has email" checked={form.hasEmail} onChange={(v) => setForm({ ...form, hasEmail: v })} />
              <Toggle label="Has social" checked={form.hasSocial} onChange={(v) => setForm({ ...form, hasSocial: v })} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-border/70 pt-5">
            <Button onClick={() => run.mutate("live")} disabled={busy}>
              <RadarIcon className="mr-1.5 size-4" />
              {busy ? "Scanning…" : "Find leads"}
            </Button>
            <Button variant="secondary" onClick={() => run.mutate("demo")} disabled={busy}>
              <Sparkles className="mr-1.5 size-4" />
              Use demo data
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <p className="label-mono">Scanner</p>
              <Radar size={40} active={busy} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {busy
                ? "Scanning Google Maps and cleaning the results…"
                : "Ready. Live scanning pulls fresh Google Maps data; demo data uses a fictional Ahmedabad dental dataset."}
            </p>
          </Panel>

          <Panel>
            <p className="label-mono">Integrations</p>
            <ul className="mt-3 space-y-2 text-sm">
              <IntegrationRow label="Live scraping" ok={integrations?.apifyConfigured} />
              <IntegrationRow label="AI engine" ok={integrations?.aiConfigured} />
            </ul>
            {integrations && !integrations.apifyConfigured ? (
              <p className="mt-3 font-mono text-[11px] text-hot">
                Live scraping is not connected — demo data still works.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function IntegrationRow({ label, ok }: { label: string; ok?: boolean | undefined }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "font-mono text-[11px] text-accent" : "font-mono text-[11px] text-muted-foreground"}>
        {ok === undefined ? "…" : ok ? "connected" : "not configured"}
      </span>
    </li>
  );
}
