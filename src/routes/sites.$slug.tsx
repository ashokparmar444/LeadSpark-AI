import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

async function getPublishedSite(slugValue: string) {
    const data = z.object({ slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/) }).parse({ slug: slugValue });
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) return null;
    const publicClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data: site } = await publicClient
      .from("website_projects")
      .select("site_html")
      .eq("slug", data.slug)
      .eq("status", "published")
      .not("published_at", "is", null)
      .maybeSingle();
    return site?.site_html ?? null;
}

export const Route = createFileRoute("/sites/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const html = await getPublishedSite(params.slug);
        if (!html) return new Response("Site not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
          },
        });
      },
    },
  },
});