# Graph Report - /Users/juandavidfranco/Documents/Productos/CricketJourney/Nueva Versión/cricket/docs/spec  (2026-07-20)

## Corpus Check
- Corpus is ~5,441 words - fits in a single context window. You may not need a graph.

## Summary
- 27 nodes · 27 edges · 6 communities (4 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 10,634 input · 6,421 output

## Community Hubs (Navigation)
- Salud y Citas
- Onboarding Self-Service
- Gobernanza y Multitenancy
- Precios y Facturación
- Sector Bancario
- Sector Retail

## God Nodes (most connected - your core abstractions)
1. `Self-service Onboarding` - 7 edges
2. `Cricket` - 4 edges
3. `Citas Agent` - 3 edges
4. `tenant_channels` - 3 edges
5. `Risk Mitigation Plan` - 3 edges
6. `IA + IH` - 2 edges
7. `Multi-tenancy` - 2 edges
8. `Hybrid Conversation-based Pricing` - 2 edges
9. `schedule_lookup` - 2 edges
10. `schedule_appointment` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Cricket` --implements--> `Self-service Onboarding`  [EXTRACTED]
  cricket-spec-phase1.md → cricket-spec-phase1.md  _Bridges community 2 → community 1_

## Hyperedges (group relationships)
- **Phase 1 Target Sectors** — docs_spec_cricket_spec_phase1_banking_sector, docs_spec_cricket_spec_phase1_retail_sector, docs_spec_cricket_spec_phase1_health_sector [EXTRACTED 1.00]
- **Self-service Platform Foundation** — docs_spec_cricket_spec_phase1_self_service_registration, docs_spec_cricket_spec_phase1_setup_wizard, docs_spec_cricket_spec_phase1_knowledge_base_builder, docs_spec_cricket_spec_phase1_multitenant_whatsapp_webhook [EXTRACTED 1.00]
- **Health Scheduling Flow** — docs_spec_cricket_spec_phase1_citas_agent, docs_spec_cricket_spec_phase1_schedule_lookup, docs_spec_cricket_spec_phase1_schedule_appointment, docs_spec_cricket_spec_phase1_appointments_slots, docs_spec_cricket_spec_phase1_appointments [EXTRACTED 1.00]

## Communities (6 total, 2 thin omitted)

### Community 0 - "Salud y Citas"
Cohesion: 0.33
Nodes (7): appointments, appointments_slots, Citas Agent, Health Sector Extension, Health Sector, schedule_appointment, schedule_lookup

### Community 1 - "Onboarding Self-Service"
Cohesion: 0.38
Nodes (7): Catalog Builder, Knowledge Base Builder, Risk Mitigation Plan, Self-service Onboarding, Self-service Registration, Setup Wizard, tenant_channels

### Community 2 - "Gobernanza y Multitenancy"
Cohesion: 0.33
Nodes (6): IA + IH, Cricket, Cricket Phase 1 Specification, Global Acceptance Criteria, Multi-tenancy, Multi-tenant WhatsApp Webhook

### Community 3 - "Precios y Facturación"
Cohesion: 0.40
Nodes (5): billing_events, Conversation Counter, Hybrid Conversation-based Pricing, Manual Billing, monthly_conversation_counts

## Knowledge Gaps
- **8 isolated node(s):** `Cricket Phase 1 Specification`, `Banking Sector`, `Retail Sector`, `Health Sector`, `Self-service Registration` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Self-service Onboarding` connect `Onboarding Self-Service` to `Gobernanza y Multitenancy`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `Cricket` connect `Gobernanza y Multitenancy` to `Onboarding Self-Service`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `Cricket Phase 1 Specification`, `Banking Sector`, `Retail Sector` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._