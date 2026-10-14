import { z } from "zod";

export const siteCopySchema = z.object({
  hero_headline: z.string().max(160),
  hero_subheadline: z.string().max(300),
  cta: z.string().max(120),
  services: z.array(z.string().max(300)).max(9),
  about: z.string().max(900),
  testimonials: z.array(z.string().max(300)).max(3),
  faq: z.array(z.object({ q: z.string().max(200), a: z.string().max(500) })).max(6),
  contact: z.string().max(500),
  strategy: z.string().max(1500),
});

export type SiteCopy = z.infer<typeof siteCopySchema>;

export function toSiteCopy(value: unknown): SiteCopy {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string, max: number) => String(source[key] ?? "").slice(0, max);
  const list = (key: string, max: number) => Array.isArray(source[key])
    ? source[key].slice(0, max).map((item) => String(item).slice(0, 300)) : [];
  return {
    hero_headline: text("hero_headline", 160), hero_subheadline: text("hero_subheadline", 300),
    cta: text("cta", 120), services: list("services", 9), about: text("about", 900),
    testimonials: list("testimonials", 3), contact: text("contact", 500), strategy: text("strategy", 1500),
    faq: Array.isArray(source["faq"]) ? source["faq"].slice(0, 6).map((item) => ({
      q: String(item?.q ?? "").slice(0, 200), a: String(item?.a ?? "").slice(0, 500),
    })) : [],
  };
}