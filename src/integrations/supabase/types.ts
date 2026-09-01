export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          credits: number
          id: string
          meta: Json
          model: string | null
          operation: Database["public"]["Enums"]["ai_operation"]
          provider: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          meta?: Json
          model?: string | null
          operation: Database["public"]["Enums"]["ai_operation"]
          provider?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          meta?: Json
          model?: string | null
          operation?: Database["public"]["Enums"]["ai_operation"]
          provider?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items: {
        Row: {
          audit_id: string
          category: string
          created_at: string
          finding: string | null
          id: string
          score: number
          workspace_id: string
        }
        Insert: {
          audit_id: string
          category: string
          created_at?: string
          finding?: string | null
          id?: string
          score?: number
          workspace_id: string
        }
        Update: {
          audit_id?: string
          category?: string
          created_at?: string
          finding?: string | null
          id?: string
          score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          biggest_opportunity: string | null
          conversion_score: number | null
          created_at: string
          critical_problems: Json
          design_score: number | null
          estimated_monthly_opportunity: string | null
          id: string
          lead_id: string
          mobile_score: number | null
          model: string | null
          overall_score: number
          provider: string
          raw: Json
          recommendations: Json
          seo_score: number | null
          summary: string | null
          trust_score: number | null
          workspace_id: string
        }
        Insert: {
          biggest_opportunity?: string | null
          conversion_score?: number | null
          created_at?: string
          critical_problems?: Json
          design_score?: number | null
          estimated_monthly_opportunity?: string | null
          id?: string
          lead_id: string
          mobile_score?: number | null
          model?: string | null
          overall_score?: number
          provider?: string
          raw?: Json
          recommendations?: Json
          seo_score?: number | null
          summary?: string | null
          trust_score?: number | null
          workspace_id: string
        }
        Update: {
          biggest_opportunity?: string | null
          conversion_score?: number | null
          created_at?: string
          critical_problems?: Json
          design_score?: number | null
          estimated_monthly_opportunity?: string | null
          id?: string
          lead_id?: string
          mobile_score?: number | null
          model?: string | null
          overall_score?: number
          provider?: string
          raw?: Json
          recommendations?: Json
          seo_score?: number | null
          summary?: string | null
          trust_score?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leads: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          lead_id: string
          stage: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          lead_id: string
          stage?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          stage?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
          meta: Json
          type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          meta?: Json
          type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          meta?: Json
          type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          created_at: string
          factors: Json
          grade: string
          id: string
          lead_id: string
          priority: number
          ranking_run_id: string | null
          reason: string | null
          score: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          grade: string
          id?: string
          lead_id: string
          priority?: number
          ranking_run_id?: string | null
          reason?: string | null
          score: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          grade?: string
          id?: string
          lead_id?: string
          priority?: number
          ranking_run_id?: string | null
          reason?: string | null
          score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scores_ranking_run_id_fkey"
            columns: ["ranking_run_id"]
            isOneToOne: false
            referencedRelation: "ranking_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          lead_id: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          audit_score: number | null
          business_name: string
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          dedupe_key: string
          email: string | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          has_website: boolean | null
          id: string
          is_demo: boolean
          latitude: number | null
          lead_status: Database["public"]["Enums"]["lead_status"]
          longitude: number | null
          opportunity_grade: string | null
          opportunity_score: number | null
          outreach_status: Database["public"]["Enums"]["outreach_status"]
          owner_name: string | null
          phone: string | null
          postal_code: string | null
          review_count: number | null
          scrape_job_id: string | null
          social_links: Json
          state: string | null
          updated_at: string
          website: string | null
          website_status: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          audit_score?: number | null
          business_name: string
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dedupe_key: string
          email?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          has_website?: boolean | null
          id?: string
          is_demo?: boolean
          latitude?: number | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          longitude?: number | null
          opportunity_grade?: string | null
          opportunity_score?: number | null
          outreach_status?: Database["public"]["Enums"]["outreach_status"]
          owner_name?: string | null
          phone?: string | null
          postal_code?: string | null
          review_count?: number | null
          scrape_job_id?: string | null
          social_links?: Json
          state?: string | null
          updated_at?: string
          website?: string | null
          website_status?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          audit_score?: number | null
          business_name?: string
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dedupe_key?: string
          email?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          has_website?: boolean | null
          id?: string
          is_demo?: boolean
          latitude?: number | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          longitude?: number | null
          opportunity_grade?: string | null
          opportunity_score?: number | null
          outreach_status?: Database["public"]["Enums"]["outreach_status"]
          owner_name?: string | null
          phone?: string | null
          postal_code?: string | null
          review_count?: number | null
          scrape_job_id?: string | null
          social_links?: Json
          state?: string | null
          updated_at?: string
          website?: string | null
          website_status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["outreach_channel"]
          created_at: string
          id: string
          language: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          body: string
          campaign_id: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          created_at: string
          id: string
          language: string
          lead_id: string
          sent_at: string | null
          status: string
          step: string
          subject: string | null
          workspace_id: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          lead_id: string
          sent_at?: string | null
          status?: string
          step?: string
          subject?: string | null
          workspace_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          lead_id?: string
          sent_at?: string | null
          status?: string
          step?: string
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["outreach_channel"]
          created_at: string
          id: string
          language: string
          name: string
          step: string
          subject: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          name: string
          step?: string
          subject?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          id?: string
          language?: string
          name?: string
          step?: string
          subject?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          audit_limit: number
          created_at: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          lead_limit: number
          name: string
          outreach_limit: number
          price_cents: number
          sort_order: number
          team_seats: number
          updated_at: string
          website_prompt_limit: number
        }
        Insert: {
          audit_limit?: number
          created_at?: string
          currency?: string
          features?: Json
          id: string
          is_active?: boolean
          lead_limit?: number
          name: string
          outreach_limit?: number
          price_cents?: number
          sort_order?: number
          team_seats?: number
          updated_at?: string
          website_prompt_limit?: number
        }
        Update: {
          audit_limit?: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          lead_limit?: number
          name?: string
          outreach_limit?: number
          price_cents?: number
          sort_order?: number
          team_seats?: number
          updated_at?: string
          website_prompt_limit?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ranking_runs: {
        Row: {
          created_at: string
          id: string
          lead_count: number
          status: Database["public"]["Enums"]["job_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_count?: number
          status?: Database["public"]["Enums"]["job_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_count?: number
          status?: Database["public"]["Enums"]["job_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          city: string | null
          completed_at: string | null
          count: number
          country: string | null
          created_at: string
          error_message: string | null
          filters: Json
          id: string
          niche: string | null
          query: string
          source: string
          state: string | null
          status: Database["public"]["Enums"]["job_status"]
          total_found: number
          total_saved: number
          user_id: string
          workspace_id: string
        }
        Insert: {
          city?: string | null
          completed_at?: string | null
          count?: number
          country?: string | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          niche?: string | null
          query: string
          source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_found?: number
          total_saved?: number
          user_id: string
          workspace_id: string
        }
        Update: {
          city?: string | null
          completed_at?: string | null
          count?: number
          country?: string | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          niche?: string | null
          query?: string
          source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_found?: number
          total_saved?: number
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          external_id: string | null
          id: string
          plan_id: string
          provider: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          external_id?: string | null
          id?: string
          plan_id: string
          provider?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          external_id?: string | null
          id?: string
          plan_id?: string
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      website_generations: {
        Row: {
          created_at: string
          id: string
          model: string | null
          output: Json
          project_id: string
          provider: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          output?: Json
          project_id: string
          provider?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          output?: Json
          project_id?: string
          provider?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "website_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      website_projects: {
        Row: {
          created_at: string
          demo_url: string | null
          id: string
          lead_id: string | null
          name: string
          platform: string
          prompt: string | null
          published_at: string | null
          site_html: string | null
          slug: string | null
          status: Database["public"]["Enums"]["project_status"]
          strategy: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          demo_url?: string | null
          id?: string
          lead_id?: string | null
          name: string
          platform?: string
          prompt?: string | null
          published_at?: string | null
          site_html?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          strategy?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          demo_url?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          platform?: string
          prompt?: string | null
          published_at?: string | null
          site_html?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          strategy?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          ai_provider: string
          created_at: string
          default_channel: Database["public"]["Enums"]["outreach_channel"]
          default_language: string
          demo_mode: boolean
          sender_email: string | null
          sender_name: string | null
          settings: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_provider?: string
          created_at?: string
          default_channel?: Database["public"]["Enums"]["outreach_channel"]
          default_language?: string
          demo_mode?: boolean
          sender_email?: string | null
          sender_name?: string | null
          settings?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_provider?: string
          created_at?: string
          default_channel?: Database["public"]["Enums"]["outreach_channel"]
          default_language?: string
          demo_mode?: boolean
          sender_email?: string | null
          sender_name?: string | null
          settings?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          period_start: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          period_start?: string
          plan_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          period_start?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_workspace_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][]; _ws: string }
        Returns: boolean
      }
      is_workspace_member: { Args: { _ws: string }; Returns: boolean }
    }
    Enums: {
      ai_operation:
        | "audit"
        | "ranking"
        | "website_prompt"
        | "outreach"
        | "other"
      app_role: "owner" | "admin" | "member"
      campaign_status: "draft" | "active" | "paused" | "completed"
      job_status: "pending" | "running" | "completed" | "failed"
      lead_status:
        | "new"
        | "contacted"
        | "demo_created"
        | "demo_sent"
        | "interested"
        | "proposal"
        | "won"
        | "lost"
        | "not_interested"
      outreach_channel:
        | "email"
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "linkedin"
      outreach_status: "none" | "queued" | "sent" | "replied" | "bounced"
      project_status: "draft" | "generating" | "ready" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_operation: ["audit", "ranking", "website_prompt", "outreach", "other"],
      app_role: ["owner", "admin", "member"],
      campaign_status: ["draft", "active", "paused", "completed"],
      job_status: ["pending", "running", "completed", "failed"],
      lead_status: [
        "new",
        "contacted",
        "demo_created",
        "demo_sent",
        "interested",
        "proposal",
        "won",
        "lost",
        "not_interested",
      ],
      outreach_channel: [
        "email",
        "whatsapp",
        "instagram",
        "facebook",
        "linkedin",
      ],
      outreach_status: ["none", "queued", "sent", "replied", "bounced"],
      project_status: ["draft", "generating", "ready", "published"],
    },
  },
} as const
