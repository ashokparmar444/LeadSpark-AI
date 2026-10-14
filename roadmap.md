# LeadPilot AI — Roadmap

## Done
- [x] Design direction locked (Deep console)
- [x] Lovable Cloud enabled

## Build order
- [ ] Replace one-click publishing with saved copy editing, live preview and explicit publishing.
- [x] 1. Design system tokens (src/styles.css) + fonts
- [x] 2. Database schema + RLS + plans seed
- [x] 3. Auth (email/password + Google) + protected layout
- [x] 4. Workspace bootstrap + switcher
- [x] 5. App shell (sidebar, topbar, credits, phase strip)
- [x] 6. Landing page
- [x] 7. Lead Finder (demo data + Apify server fn)
- [x] 8. Leads table + filters + bulk actions + CSV export
- [x] 9. Lead detail page
- [x] 10. AI provider abstraction (Lovable AI Gateway: Claude/Gemini)
- [x] 11. Audit (phase 2)
- [x] 12. Ranking (phase 3)
- [x] 13. Website builder prompt (phase 4)
- [x] 14. Outreach generator + templates (phase 5)
- [x] 15. Campaigns CRM
- [x] 16. Credits/usage enforcement
- [x] 17. Dashboard + Analytics charts
- [x] 18. Settings + Billing + Admin
- [x] 19. Security/QA pass (end-to-end verified: demo scan → audit → rank → builder → outreach)
- [x] 20. One-click public demo-site publishing from generated website copy
- [x] 21. Team client portal for workspace leads, audits and outreach messages
- [ ] 22. Real outreach email delivery with sender-domain setup and delivery tracking (blocked: needs sender domain + backend resumed)

## Notes
- Stack is TanStack Start: server logic uses createServerFn, not edge functions.
- Never expose Apify/AI keys client-side.
- [ ] 23. Publish Jaipur plumber demo site and verify public link (blocked: backend paused)
