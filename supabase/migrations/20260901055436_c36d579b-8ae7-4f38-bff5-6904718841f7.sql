ALTER TABLE public.website_projects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS site_html text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS website_projects_slug_key ON public.website_projects (slug) WHERE slug IS NOT NULL;

GRANT SELECT ON public.website_projects TO anon;

DROP POLICY IF EXISTS "Published demo sites are publicly readable" ON public.website_projects;
CREATE POLICY "Published demo sites are publicly readable"
ON public.website_projects FOR SELECT TO anon
USING (status = 'published' AND slug IS NOT NULL AND published_at IS NOT NULL);