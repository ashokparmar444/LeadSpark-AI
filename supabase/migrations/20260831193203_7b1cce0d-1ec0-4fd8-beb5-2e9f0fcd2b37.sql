
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('owner','admin','member');
CREATE TYPE public.job_status AS ENUM ('pending','running','completed','failed');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','demo_created','demo_sent','interested','proposal','won','lost','not_interested');
CREATE TYPE public.outreach_status AS ENUM ('none','queued','sent','replied','bounced');
CREATE TYPE public.campaign_status AS ENUM ('draft','active','paused','completed');
CREATE TYPE public.project_status AS ENUM ('draft','generating','ready','published');
CREATE TYPE public.outreach_channel AS ENUM ('email','whatsapp','instagram','facebook','linkedin');
CREATE TYPE public.ai_operation AS ENUM ('audit','ranking','website_prompt','outreach','other');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PLANS
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  lead_limit INTEGER NOT NULL DEFAULT 25,
  audit_limit INTEGER NOT NULL DEFAULT 10,
  website_prompt_limit INTEGER NOT NULL DEFAULT 5,
  outreach_limit INTEGER NOT NULL DEFAULT 20,
  team_seats INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active);

INSERT INTO public.plans (id,name,price_cents,lead_limit,audit_limit,website_prompt_limit,outreach_limit,team_seats,sort_order,features) VALUES
('free','Free',0,25,10,5,20,1,1,'["Demo data mode","1 workspace","Community support"]'::jsonb),
('starter','Starter',2900,500,200,50,500,2,2,'["Live lead scraping","CSV export","Email support"]'::jsonb),
('pro','Pro',9900,2500,1000,250,2500,5,3,'["Everything in Starter","Campaign automation","Priority support"]'::jsonb),
('agency','Agency',29900,10000,5000,1000,10000,25,4,'["Unlimited workspaces","Team roles","White-label ready"]'::jsonb);

-- WORKSPACES
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX idx_wm_user ON public.workspace_members(user_id);
CREATE INDEX idx_wm_ws ON public.workspace_members(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _ws AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_ws UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _ws AND m.user_id = auth.uid() AND m.role = ANY(_roles));
$$;

CREATE POLICY "ws_select_member" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id));
CREATE POLICY "ws_insert_own" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws_update_admin" ON public.workspaces FOR UPDATE TO authenticated USING (public.has_workspace_role(id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "ws_delete_owner" ON public.workspaces FOR DELETE TO authenticated USING (public.has_workspace_role(id, ARRAY['owner']::public.app_role[]));

CREATE POLICY "wm_select" ON public.workspace_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));
CREATE POLICY "wm_insert" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
);
CREATE POLICY "wm_update" ON public.workspace_members FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "wm_delete" ON public.workspace_members FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));

-- WORKSPACE SETTINGS
CREATE TABLE public.workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ai_provider TEXT NOT NULL DEFAULT 'gemini',
  default_language TEXT NOT NULL DEFAULT 'english',
  default_channel public.outreach_channel NOT NULL DEFAULT 'email',
  sender_name TEXT,
  sender_email TEXT,
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wss_select" ON public.workspace_settings FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "wss_insert" ON public.workspace_settings FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "wss_update" ON public.workspace_settings FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));
CREATE TRIGGER trg_wss_updated BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT NOT NULL DEFAULT 'none',
  external_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

-- SCRAPE JOBS
CREATE TABLE public.scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  niche TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  count INTEGER NOT NULL DEFAULT 25,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'demo',
  status public.job_status NOT NULL DEFAULT 'pending',
  total_found INTEGER NOT NULL DEFAULT 0,
  total_saved INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_jobs_ws ON public.scrape_jobs(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_jobs TO authenticated;
GRANT ALL ON public.scrape_jobs TO service_role;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_all" ON public.scrape_jobs FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scrape_job_id UUID REFERENCES public.scrape_jobs(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  category TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  google_place_id TEXT,
  google_maps_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_website BOOLEAN GENERATED ALWAYS AS (website IS NOT NULL AND length(website) > 0) STORED,
  website_status TEXT,
  audit_score INTEGER,
  opportunity_score INTEGER,
  opportunity_grade TEXT,
  lead_status public.lead_status NOT NULL DEFAULT 'new',
  outreach_status public.outreach_status NOT NULL DEFAULT 'none',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, dedupe_key)
);
CREATE INDEX idx_leads_ws ON public.leads(workspace_id, created_at DESC);
CREATE INDEX idx_leads_city ON public.leads(workspace_id, city);
CREATE INDEX idx_leads_category ON public.leads(workspace_id, category);
CREATE INDEX idx_leads_website ON public.leads(workspace_id, has_website);
CREATE INDEX idx_leads_opp ON public.leads(workspace_id, opportunity_score DESC);
CREATE INDEX idx_leads_audit ON public.leads(workspace_id, audit_score);
CREATE INDEX idx_leads_status ON public.leads(workspace_id, lead_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_all" ON public.leads FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TAGS
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'accent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_all" ON public.tags FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE public.lead_tags (
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);
GRANT SELECT, INSERT, DELETE ON public.lead_tags TO authenticated;
GRANT ALL ON public.lead_tags TO service_role;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_tags_all" ON public.lead_tags FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- NOTES + ACTIVITY
CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_lead ON public.lead_notes(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_all" ON public.lead_notes FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE public.lead_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_ws ON public.lead_activity(workspace_id, created_at DESC);
GRANT SELECT, INSERT ON public.lead_activity TO authenticated;
GRANT ALL ON public.lead_activity TO service_role;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_all" ON public.lead_activity FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- AUDITS
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  design_score INTEGER,
  mobile_score INTEGER,
  seo_score INTEGER,
  conversion_score INTEGER,
  trust_score INTEGER,
  biggest_opportunity TEXT,
  critical_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_monthly_opportunity TEXT,
  summary TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audits_lead ON public.audits(lead_id, created_at DESC);
CREATE INDEX idx_audits_ws ON public.audits(workspace_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audits_all" ON public.audits FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE public.audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  finding TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_items_audit ON public.audit_items(audit_id);
GRANT SELECT, INSERT, DELETE ON public.audit_items TO authenticated;
GRANT ALL ON public.audit_items TO service_role;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_items_all" ON public.audit_items FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- RANKING
CREATE TABLE public.ranking_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_count INTEGER NOT NULL DEFAULT 0,
  status public.job_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ranking_runs TO authenticated;
GRANT ALL ON public.ranking_runs TO service_role;
ALTER TABLE public.ranking_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranking_runs_all" ON public.ranking_runs FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE public.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  ranking_run_id UUID REFERENCES public.ranking_runs(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  reason TEXT,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scores_lead ON public.lead_scores(lead_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.lead_scores TO authenticated;
GRANT ALL ON public.lead_scores TO service_role;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_all" ON public.lead_scores FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- WEBSITE PROJECTS
CREATE TABLE public.website_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'lovable',
  prompt TEXT,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  demo_url TEXT,
  status public.project_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_ws ON public.website_projects(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_projects TO authenticated;
GRANT ALL ON public.website_projects TO service_role;
ALTER TABLE public.website_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all" ON public.website_projects FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.website_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.website_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.website_projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.website_generations TO authenticated;
GRANT ALL ON public.website_generations TO service_role;
ALTER TABLE public.website_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wgen_all" ON public.website_generations FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- OUTREACH
CREATE TABLE public.outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel public.outreach_channel NOT NULL DEFAULT 'email',
  language TEXT NOT NULL DEFAULT 'english',
  step TEXT NOT NULL DEFAULT 'initial',
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_templates TO authenticated;
GRANT ALL ON public.outreach_templates TO service_role;
ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_all" ON public.outreach_templates FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.outreach_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel public.outreach_channel NOT NULL DEFAULT 'email',
  language TEXT NOT NULL DEFAULT 'english',
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_campaigns TO authenticated;
GRANT ALL ON public.outreach_campaigns TO service_role;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all" ON public.outreach_campaigns FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.outreach_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'added',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_leads TO authenticated;
GRANT ALL ON public.campaign_leads TO service_role;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_leads_all" ON public.campaign_leads FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER trg_cl_updated BEFORE UPDATE ON public.campaign_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  channel public.outreach_channel NOT NULL DEFAULT 'email',
  language TEXT NOT NULL DEFAULT 'english',
  step TEXT NOT NULL DEFAULT 'initial',
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msgs_lead ON public.outreach_messages(lead_id, created_at DESC);
CREATE INDEX idx_msgs_ws ON public.outreach_messages(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT ALL ON public.outreach_messages TO service_role;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs_all" ON public.outreach_messages FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- AI USAGE
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  operation public.ai_operation NOT NULL,
  provider TEXT,
  model TEXT,
  credits INTEGER NOT NULL DEFAULT 1,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_ws ON public.ai_usage(workspace_id, created_at DESC);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_select" ON public.ai_usage FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SIGNUP BOOTSTRAP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ws UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspaces (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'workspace_name', split_part(NEW.email,'@',1) || '''s Workspace'), NEW.id)
  RETURNING id INTO _ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_ws, NEW.id, 'owner');
  INSERT INTO public.workspace_settings (workspace_id) VALUES (_ws);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
