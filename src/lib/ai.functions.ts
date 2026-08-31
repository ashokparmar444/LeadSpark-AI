import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertMember, assertWithinLimit, trackUsage } from "@/lib/usage.server";
import { AIProviderFactory, AIError, untrusted } from "@/lib/ai.server";
import { gradeForScore, priorityForScore } from "@/lib/domain";

type Ctx = { supabase: ReturnType<typeof Object>; userId: string };

function clamp(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeText(value: unknown, max = 1200): string {
  return String(value ?? "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\son\w+\s*=/gi, " ")
    .slice(0, max)
    .trim();
}

function sanitizeList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((v) => sanitizeText(typeof v === "string" ? v : JSON.stringify(v), 300));
}

function friendlyError(error: unknown): string {
  if (error instanceof AIError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please retry.";
}

async function providerFor(supabase: any, workspaceId: string) {
  const { data } = await supabase
    .from("workspace_settings")
    .select("ai_provider")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return AIProviderFactory.create(data?.ai_provider ?? "gemini");
}

/* ------------------------------- PHASE 2 — AUDIT ------------------------------ */

const auditSchema = z.object({ workspaceId: z.string().uuid(), leadId: z.string().uuid() });

export const auditLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => auditSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx & { supabase: any };
    try {
      await assertMember(supabase, data.workspaceId);
      await assertWithinLimit(supabase, data.workspaceId, "audit");
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!lead) return { ok: false as const, error: "Lead not found." };
    if (!lead.website) {
      return { ok: false as const, error: "This business does not have a website available for audit." };
    }

    const provider = await providerFor(supabase, data.workspaceId);
    const system = `You audit local-business websites for a web agency. Score every category 0-100 where 100 is excellent.
Consider: design, mobile responsiveness, page speed indicators, SEO, local SEO, content, calls to action, lead capture,
contact info, booking, trust signals, reviews, social proof, conversion optimisation, accessibility and modernity.
Return JSON with keys: overall_score, design_score, mobile_score, seo_score, conversion_score, trust_score,
biggest_opportunity (string), critical_problems (string[]), recommendations (string[]),
estimated_monthly_opportunity (string, phrased as an estimate), summary (string), categories (array of {category, score, finding}).`;

    const user = `Audit this local business website. Base your judgement on the business profile below.
${untrusted("business", JSON.stringify({
      name: lead.business_name,
      category: lead.category,
      city: lead.city,
      country: lead.country,
      website: lead.website,
      rating: lead.google_rating,
      reviews: lead.review_count,
      social: lead.social_links,
      address: lead.address,
    }))}`;

    let raw: Record<string, unknown>;
    try {
      raw = await provider.generateStructuredJSON<Record<string, unknown>>(system, user);
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const audit = {
      workspace_id: data.workspaceId,
      lead_id: lead.id,
      provider: provider.id,
      model: provider.model,
      overall_score: clamp(raw["overall_score"]),
      design_score: clamp(raw["design_score"]),
      mobile_score: clamp(raw["mobile_score"]),
      seo_score: clamp(raw["seo_score"]),
      conversion_score: clamp(raw["conversion_score"]),
      trust_score: clamp(raw["trust_score"]),
      biggest_opportunity: sanitizeText(raw["biggest_opportunity"], 400),
      critical_problems: sanitizeList(raw["critical_problems"]),
      recommendations: sanitizeList(raw["recommendations"], 10),
      estimated_monthly_opportunity: sanitizeText(raw["estimated_monthly_opportunity"], 160),
      summary: sanitizeText(raw["summary"], 900),
      raw: {},
    };

    const { data: inserted, error } = await supabase.from("audits").insert(audit).select("id").single();
    if (error) return { ok: false as const, error: "The audit could not be saved. Please retry." };

    const categories = Array.isArray(raw["categories"]) ? (raw["categories"] as Record<string, unknown>[]) : [];
    if (categories.length) {
      await supabase.from("audit_items").insert(
        categories.slice(0, 20).map((c) => ({
          workspace_id: data.workspaceId,
          audit_id: inserted.id,
          category: sanitizeText(c["category"], 60) || "General",
          score: clamp(c["score"]),
          finding: sanitizeText(c["finding"], 300),
        })),
      );
    }

    await supabase
      .from("leads")
      .update({ audit_score: audit.overall_score, website_status: audit.overall_score < 50 ? "needs_work" : "ok" })
      .eq("id", lead.id);

    await supabase.from("lead_activity").insert({
      workspace_id: data.workspaceId,
      lead_id: lead.id,
      user_id: userId,
      type: "audit",
      message: `Audit completed · ${lead.business_name} scored ${audit.overall_score}`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await trackUsage(supabaseAdmin, {
      workspaceId: data.workspaceId,
      userId,
      operation: "audit",
      provider: provider.id,
      model: provider.model,
      meta: { lead_id: lead.id },
    });

    return { ok: true as const, auditId: inserted.id, score: audit.overall_score };
  });

/* ------------------------------- PHASE 3 — RANK ------------------------------- */

const rankSchema = z.object({ workspaceId: z.string().uuid(), leadIds: z.array(z.string().uuid()).min(1).max(50) });

export const rankLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rankSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx & { supabase: any };
    try {
      await assertMember(supabase, data.workspaceId);
      await assertWithinLimit(supabase, data.workspaceId, "ranking", 1);
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const { data: leads } = await supabase
      .from("leads")
      .select("id, business_name, category, city, website, google_rating, review_count, audit_score, social_links")
      .eq("workspace_id", data.workspaceId)
      .in("id", data.leadIds);
    if (!leads?.length) return { ok: false as const, error: "No leads found to rank." };

    const provider = await providerFor(supabase, data.workspaceId);
    const { data: run } = await supabase
      .from("ranking_runs")
      .insert({ workspace_id: data.workspaceId, user_id: userId, lead_count: leads.length, status: "running" })
      .select("id")
      .single();

    const system = `You score local businesses as opportunities for a web-design agency, 0-100.
High score = the business clearly needs a better website AND has demand signals (rating, reviews, category value).
Weigh website quality/absence, conversion opportunity, category, rating, review count, online presence, mobile
experience, CTA quality, booking availability, local SEO opportunity and improvement potential.
Return JSON: { "results": [ { "id": string, "score": number, "reason": string } ] } — one entry per input business.`;

    const user = `Score these businesses.
${untrusted("businesses", JSON.stringify(leads))}`;

    let parsed: { results?: { id?: string; score?: unknown; reason?: unknown }[] };
    try {
      parsed = await provider.generateStructuredJSON(system, user);
    } catch (error) {
      await supabase.from("ranking_runs").update({ status: "failed" }).eq("id", run?.id);
      return { ok: false as const, error: friendlyError(error) };
    }

    const byId = new Map((parsed.results ?? []).map((r) => [String(r.id), r]));
    let updated = 0;
    for (const lead of leads) {
      const result = byId.get(lead.id);
      if (!result) continue;
      const score = clamp(result.score);
      const { grade } = gradeForScore(score);
      const priority = priorityForScore(score);
      const reason = sanitizeText(result.reason, 400);

      await supabase.from("lead_scores").insert({
        workspace_id: data.workspaceId,
        lead_id: lead.id,
        ranking_run_id: run?.id ?? null,
        score,
        grade,
        priority,
        reason,
        factors: { audit_score: lead.audit_score, rating: lead.google_rating, reviews: lead.review_count },
      });
      await supabase
        .from("leads")
        .update({ opportunity_score: score, opportunity_grade: grade })
        .eq("id", lead.id);
      updated += 1;
    }

    await supabase.from("ranking_runs").update({ status: "completed", lead_count: updated }).eq("id", run?.id);
    await supabase.from("lead_activity").insert({
      workspace_id: data.workspaceId,
      user_id: userId,
      type: "ranking",
      message: `Ranked ${updated} lead${updated === 1 ? "" : "s"}`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await trackUsage(supabaseAdmin, {
      workspaceId: data.workspaceId,
      userId,
      operation: "ranking",
      provider: provider.id,
      model: provider.model,
      credits: 1,
      meta: { lead_count: updated },
    });

    return { ok: true as const, updated };
  });

/* ---------------------------- PHASE 4 — WEBSITE BUILD --------------------------- */

const buildSchema = z.object({
  workspaceId: z.string().uuid(),
  leadId: z.string().uuid(),
  platform: z.enum(["lovable", "bolt", "claude-code", "custom"]),
});

export const generateWebsiteStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => buildSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx & { supabase: any };
    try {
      await assertMember(supabase, data.workspaceId);
      await assertWithinLimit(supabase, data.workspaceId, "website_prompt");
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!lead) return { ok: false as const, error: "Lead not found." };

    const { data: audit } = await supabase
      .from("audits")
      .select("overall_score, biggest_opportunity, critical_problems, recommendations, summary")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = await providerFor(supabase, data.workspaceId);
    const system = `You are a senior web strategist producing a build brief for a local business site targeting ${data.platform}.
Return JSON with keys: strategy, sitemap (string[]), sections (string[]), hero_headline, hero_subheadline, cta,
services (string[]), about, testimonials (string[]), faq (array of {q,a}), contact, seo (string[]),
design_direction, image_prompts (string[]), builder_prompt (a complete, copy-pasteable prompt), sales_pitch (string[]).
The builder_prompt must be thorough and self-contained.`;

    const user = `Create the website strategy and builder prompt.
${untrusted("business", JSON.stringify({ ...lead, social_links: lead.social_links }))}
${untrusted("audit", JSON.stringify(audit ?? { note: "no audit yet" }))}`;

    let raw: Record<string, unknown>;
    try {
      raw = await provider.generateStructuredJSON<Record<string, unknown>>(system, user);
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const strategy = {
      strategy: sanitizeText(raw["strategy"], 1500),
      sitemap: sanitizeList(raw["sitemap"], 12),
      sections: sanitizeList(raw["sections"], 14),
      hero_headline: sanitizeText(raw["hero_headline"], 160),
      hero_subheadline: sanitizeText(raw["hero_subheadline"], 300),
      cta: sanitizeText(raw["cta"], 120),
      services: sanitizeList(raw["services"], 12),
      about: sanitizeText(raw["about"], 900),
      testimonials: sanitizeList(raw["testimonials"], 6),
      faq: Array.isArray(raw["faq"])
        ? (raw["faq"] as Record<string, unknown>[]).slice(0, 8).map((f) => ({
            q: sanitizeText(f["q"], 200),
            a: sanitizeText(f["a"], 500),
          }))
        : [],
      contact: sanitizeText(raw["contact"], 500),
      seo: sanitizeList(raw["seo"], 10),
      design_direction: sanitizeText(raw["design_direction"], 800),
      image_prompts: sanitizeList(raw["image_prompts"], 8),
      sales_pitch: sanitizeList(raw["sales_pitch"], 8),
    };
    const builderPrompt = sanitizeText(raw["builder_prompt"], 12000);

    const { data: project, error } = await supabase
      .from("website_projects")
      .insert({
        workspace_id: data.workspaceId,
        lead_id: lead.id,
        name: `${lead.business_name} website`,
        platform: data.platform,
        prompt: builderPrompt,
        strategy,
        status: "ready",
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: "The strategy could not be saved. Please retry." };

    await supabase.from("website_generations").insert({
      workspace_id: data.workspaceId,
      project_id: project.id,
      provider: provider.id,
      model: provider.model,
      output: strategy,
    });
    await supabase.from("leads").update({ lead_status: "demo_created" }).eq("id", lead.id).eq("lead_status", "new");
    await supabase.from("lead_activity").insert({
      workspace_id: data.workspaceId,
      lead_id: lead.id,
      user_id: userId,
      type: "build",
      message: `Website strategy generated · ${lead.business_name}`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await trackUsage(supabaseAdmin, {
      workspaceId: data.workspaceId,
      userId,
      operation: "website_prompt",
      provider: provider.id,
      model: provider.model,
      meta: { lead_id: lead.id },
    });

    return { ok: true as const, projectId: project.id };
  });

/* ------------------------------ PHASE 5 — OUTREACH ----------------------------- */

const outreachSchema = z.object({
  workspaceId: z.string().uuid(),
  leadId: z.string().uuid(),
  channel: z.enum(["email", "whatsapp", "instagram", "facebook", "linkedin"]),
  language: z.enum(["english", "hinglish", "hindi", "gujarati"]),
  steps: z.array(z.enum(["initial", "day3", "day7", "demo", "proposal", "final"])).min(1).max(6),
  senderName: z.string().trim().max(80).optional().default(""),
  demoUrl: z.string().trim().max(300).optional().default(""),
});

export const generateOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => outreachSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx & { supabase: any };
    try {
      await assertMember(supabase, data.workspaceId);
      await assertWithinLimit(supabase, data.workspaceId, "outreach", data.steps.length);
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!lead) return { ok: false as const, error: "Lead not found." };

    const { data: audit } = await supabase
      .from("audits")
      .select("overall_score, biggest_opportunity")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = await providerFor(supabase, data.workspaceId);
    const system = `You write short, human, non-spammy B2B outreach for a web-design agency contacting local businesses.
Channel: ${data.channel}. Language: ${data.language}. Keep ${data.channel === "email" ? "emails under 140 words" : "messages under 70 words"}.
Never guarantee revenue; frame improvements as opportunities. No emoji spam, no fake urgency.
Return JSON: { "messages": [ { "step": string, "subject": string, "body": string } ] } with exactly these steps: ${data.steps.join(", ")}.`;

    const user = `Write the outreach sequence.
${untrusted("business", JSON.stringify({
      business_name: lead.business_name,
      owner_name: lead.owner_name,
      city: lead.city,
      category: lead.category,
      website: lead.website,
      rating: lead.google_rating,
      reviews: lead.review_count,
    }))}
${untrusted("audit", JSON.stringify(audit ?? { note: "not audited" }))}
Sender name: ${sanitizeText(data.senderName, 80) || "{{your_name}}"}
Demo URL: ${sanitizeText(data.demoUrl, 300) || "{{demo_url}}"}`;

    let parsed: { messages?: { step?: string; subject?: unknown; body?: unknown }[] };
    try {
      parsed = await provider.generateStructuredJSON(system, user);
    } catch (error) {
      return { ok: false as const, error: friendlyError(error) };
    }

    const rows = (parsed.messages ?? []).slice(0, 6).map((m) => ({
      workspace_id: data.workspaceId,
      lead_id: lead.id,
      channel: data.channel,
      language: data.language,
      step: sanitizeText(m.step, 24) || "initial",
      subject: data.channel === "email" ? sanitizeText(m.subject, 160) : null,
      body: sanitizeText(m.body, 4000),
      status: "draft",
    }));
    if (!rows.length) return { ok: false as const, error: "The AI returned no messages. Please retry." };

    const { data: inserted, error } = await supabase.from("outreach_messages").insert(rows).select("*");
    if (error) return { ok: false as const, error: "Messages could not be saved. Please retry." };

    await supabase.from("lead_activity").insert({
      workspace_id: data.workspaceId,
      lead_id: lead.id,
      user_id: userId,
      type: "outreach",
      message: `Outreach drafted · ${lead.business_name} · ${data.channel}`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await trackUsage(supabaseAdmin, {
      workspaceId: data.workspaceId,
      userId,
      operation: "outreach",
      provider: provider.id,
      model: provider.model,
      credits: rows.length,
      meta: { lead_id: lead.id },
    });

    return { ok: true as const, messages: inserted };
  });
