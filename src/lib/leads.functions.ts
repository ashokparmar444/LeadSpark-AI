import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLeadQuota, assertMember, UsageError } from "@/lib/usage.server";
import { DEMO_BUSINESSES } from "@/lib/demo-data";

const finderSchema = z.object({
  workspaceId: z.string().uuid(),
  niche: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().min(1).max(80),
  count: z.number().int().min(1).max(200),
  keyword: z.string().trim().max(120).optional().default(""),
  minRating: z.number().min(0).max(5).optional().default(0),
  minReviews: z.number().int().min(0).optional().default(0),
  hasWebsite: z.enum(["any", "yes", "no"]).optional().default("any"),
  hasPhone: z.boolean().optional().default(false),
  hasEmail: z.boolean().optional().default(false),
  hasSocial: z.boolean().optional().default(false),
  source: z.enum(["apify", "demo"]),
});

type NormalizedLead = {
  business_name: string;
  category: string | null;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  google_rating: number | null;
  review_count: number;
  google_place_id: string | null;
  google_maps_url: string | null;
  social_links: Record<string, string>;
};

function dedupeKey(lead: NormalizedLead): string {
  const base = lead.google_place_id || `${lead.business_name}|${lead.city ?? ""}|${lead.phone ?? ""}`;
  return base.toLowerCase().replace(/\s+/g, " ").trim();
}

function passesFilters(lead: NormalizedLead, f: z.infer<typeof finderSchema>): boolean {
  if ((lead.google_rating ?? 0) < f.minRating) return false;
  if (lead.review_count < f.minReviews) return false;
  if (f.hasWebsite === "yes" && !lead.website) return false;
  if (f.hasWebsite === "no" && lead.website) return false;
  if (f.hasPhone && !lead.phone) return false;
  if (f.hasEmail && !lead.email) return false;
  if (f.hasSocial && Object.keys(lead.social_links).length === 0) return false;
  if (f.keyword) {
    const hay = `${lead.business_name} ${lead.category ?? ""} ${lead.address ?? ""}`.toLowerCase();
    if (!hay.includes(f.keyword.toLowerCase())) return false;
  }
  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeApifyItem(item: any, fallback: { city: string; state: string; country: string }): NormalizedLead | null {
  const name = item?.title ?? item?.name;
  if (!name) return null;
  const social: Record<string, string> = {};
  for (const key of ["instagram", "facebook", "linkedin", "twitter", "youtube"]) {
    const value = item?.[`${key}s`]?.[0] ?? item?.[key];
    if (typeof value === "string") social[key] = value;
  }
  return {
    business_name: String(name).slice(0, 200),
    category: item?.categoryName ?? item?.category ?? null,
    owner_name: null,
    phone: item?.phone ?? item?.phoneUnformatted ?? null,
    email: item?.email ?? item?.emails?.[0] ?? null,
    website: item?.website ?? null,
    address: item?.address ?? null,
    city: item?.city ?? fallback.city,
    state: item?.state ?? (fallback.state || null),
    country: item?.countryCode ?? fallback.country,
    google_rating: typeof item?.totalScore === "number" ? Math.round(item.totalScore * 10) / 10 : null,
    review_count: Number(item?.reviewsCount ?? 0) || 0,
    google_place_id: item?.placeId ?? null,
    google_maps_url: item?.url ?? null,
    social_links: social,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Phase 1 — create a scrape job and populate leads (Apify or Demo Mode). */
export const findLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => finderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      await assertMember(supabase, data.workspaceId);
      await assertLeadQuota(supabase, data.workspaceId, data.count);
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }

    const apifyToken = process.env["APIFY_TOKEN"];
    if (data.source === "apify" && !apifyToken) {
      return {
        ok: false as const,
        error: "Live lead scraping is not configured. You can use Demo Data or configure Apify in Settings.",
      };
    }

    // Prevent duplicate concurrent jobs for the same query.
    const query = `${data.niche} in ${data.city}, ${data.country}`;
    const { data: running } = await supabase
      .from("scrape_jobs")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("query", query)
      .in("status", ["pending", "running"])
      .maybeSingle();
    if (running) {
      return { ok: false as const, error: "A scan for this exact search is already running." };
    }

    const { data: job, error: jobError } = await supabase
      .from("scrape_jobs")
      .insert({
        workspace_id: data.workspaceId,
        user_id: userId,
        query,
        niche: data.niche,
        city: data.city,
        state: data.state || null,
        country: data.country,
        count: data.count,
        filters: {
          minRating: data.minRating,
          minReviews: data.minReviews,
          hasWebsite: data.hasWebsite,
          hasPhone: data.hasPhone,
          hasEmail: data.hasEmail,
          hasSocial: data.hasSocial,
          keyword: data.keyword,
        },
        source: data.source,
        status: "running",
      })
      .select("id")
      .single();

    if (jobError || !job) return { ok: false as const, error: "Could not start the scan. Please retry." };

    const fail = async (message: string) => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
      return { ok: false as const, error: message, jobId: job.id };
    };

    let candidates: NormalizedLead[] = [];

    if (data.source === "demo") {
      candidates = DEMO_BUSINESSES.map((b) => ({
        ...b,
        google_place_id: null,
        google_maps_url: null,
      }));
    } else {
      // Over-fetch when post-filters are active so we can still hit the requested count.
      const filtersActive =
        data.minReviews > 0 || data.hasWebsite !== "any" || data.hasPhone || data.hasEmail || data.hasSocial || Boolean(data.keyword);
      const requested = Math.min(200, filtersActive ? data.count * 3 : data.count);
      // The actor supports a native minimum-stars filter; everything else is applied locally.
      const minStars =
        data.minRating >= 4.5 ? "4.5" : data.minRating >= 4 ? "four" : data.minRating >= 3 ? "three" : data.minRating >= 2 ? "two" : undefined;
      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}&timeout=280`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              searchStringsArray: [data.keyword ? `${data.niche} ${data.keyword}` : data.niche],
              locationQuery: [data.city, data.state, data.country].filter(Boolean).join(", "),
              maxCrawledPlacesPerSearch: requested,
              language: "en",
              skipClosedPlaces: true,
              scrapeContacts: false,
              ...(minStars ? { placeMinimumStars: minStars } : {}),
            }),
          },
        );
        if (!response.ok) {
          const detail = await response.text();
          console.error(`Apify error ${response.status}: ${detail.slice(0, 500)}`);
          const message =
            response.status === 401 || response.status === 403
              ? "The lead source rejected the credentials. Check the Apify token in Settings."
              : response.status === 429
                ? "The lead source is rate limited right now. Please retry in a minute."
                : "The lead source rejected this request. Check your Apify configuration and retry.";
          return await fail(message);
        }
        const items = (await response.json()) as unknown[];
        candidates = items
          .map((item) => normalizeApifyItem(item, { city: data.city, state: data.state, country: data.country }))
          .filter((x): x is NormalizedLead => x !== null);
      } catch (error) {
        console.error("Apify request failed", error);
        return await fail("The lead source could not be reached. Please retry in a moment.");
      }
    }


    const totalFound = candidates.length;
    const filtered = candidates.filter((lead) => passesFilters(lead, data)).slice(0, data.count);

    // In-batch dedupe, then DB-level dedupe via the unique (workspace, key) index.
    const seen = new Set<string>();
    const rows = filtered
      .map((lead) => ({ ...lead, dedupe_key: dedupeKey(lead) }))
      .filter((lead) => (seen.has(lead.dedupe_key) ? false : (seen.add(lead.dedupe_key), true)))
      .map((lead) => ({
        ...lead,
        workspace_id: data.workspaceId,
        scrape_job_id: job.id,
        is_demo: data.source === "demo",
        website_status: lead.website ? "live" : "missing",
      }));

    let saved = 0;
    if (rows.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("leads")
        .upsert(rows, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true })
        .select("id");
      if (insertError) {
        console.error("lead insert failed", insertError.message);
        return await fail("Leads could not be saved. Please retry.");
      }
      saved = inserted?.length ?? 0;
    }

    await supabase
      .from("scrape_jobs")
      .update({
        status: "completed",
        total_found: totalFound,
        total_saved: saved,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await supabase.from("lead_activity").insert({
      workspace_id: data.workspaceId,
      user_id: userId,
      type: "scrape",
      message: `Scraped ${saved} lead${saved === 1 ? "" : "s"} · ${query}${data.source === "demo" ? " (demo data)" : ""}`,
    });

    return {
      ok: true as const,
      jobId: job.id,
      totalFound,
      saved,
      skipped: filtered.length - saved,
      demo: data.source === "demo",
    };
  });

/** Reports whether live scraping is configured, without exposing the token. */
export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    apifyConfigured: Boolean(process.env["APIFY_TOKEN"]),
    aiConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
    emailConfigured: Boolean(process.env["RESEND_API_KEY"]),
    stripeConfigured: Boolean(process.env["STRIPE_SECRET_KEY"]),
  }));

