# LeadPilot AI — Roadmap

## Done
- [ ] Design direction locked (Deep console)
- [ ] Lovable Cloud enabled

## Build order
- [ ] 1. Design system tokens (src/styles.css) + fonts
- [ ] 2. Database schema + RLS + plans seed
- [ ] 3. Auth (email/password + Google) + protected layout
- [ ] 4. Workspace bootstrap + switcher
- [ ] 5. App shell (sidebar, topbar, credits, phase strip)
- [ ] 6. Landing page
- [ ] 7. Lead Finder (demo data + Apify server fn)
- [ ] 8. Leads table + filters + bulk actions + CSV export
- [ ] 9. Lead detail page
- [ ] 10. AI provider abstraction (Lovable AI Gateway: Claude/Gemini)
- [ ] 11. Audit (phase 2)
- [ ] 12. Ranking (phase 3)
- [ ] 13. Website builder prompt (phase 4)
- [ ] 14. Outreach generator + templates (phase 5)
- [ ] 15. Campaigns CRM
- [ ] 16. Credits/usage enforcement
- [ ] 17. Dashboard + Analytics charts
- [ ] 18. Settings + Billing + Admin
- [ ] 19. Security/QA pass

## Notes
- Stack is TanStack Start: server logic uses createServerFn, not edge functions.
- Never expose Apify/AI keys client-side.
