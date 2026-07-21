---
type: "query"
date: "2026-07-21T03:20:00.900127+00:00"
question: "Si, tenemos dos tipos de cliente el cliente de nosotros y el cliente de mi cliente. Whatsapp es el medio que se atiende a mi cliente de mi cliente. En el proceso de conseguir clientes para Cricket es por medio de la web, desde ahí se crearia todo el self-service"
contributor: "graphify"
outcome: "corrected"
correction: "Separar explícitamente Cliente Cricket o tenant del Cliente final o end_user; la web adquiere y configura tenants, WhatsApp atiende end_users."
source_nodes: ["Self-service Onboarding", "Self-service Registration", "Multi-tenancy", "tenant_channels", "Multi-tenant WhatsApp Webhook"]
---

# Q: Si, tenemos dos tipos de cliente el cliente de nosotros y el cliente de mi cliente. Whatsapp es el medio que se atiende a mi cliente de mi cliente. En el proceso de conseguir clientes para Cricket es por medio de la web, desde ahí se crearia todo el self-service

## Answer

Expanded from original query via vocab: [self, service, registration, onboarding, whats, channels, tenant, multi, tenancy]. Corrección conceptual: Cricket opera como B2B2C. El Cliente Cricket es la empresa tenant que llega por la web, compra, se registra y completa el self-service. El Cliente final es el end_user de esa empresa y recibe atención por WhatsApp. El flujo web provisiona tenant, tenant_admin, plan, knowledge base, catálogo, equipo y tenant_channels; el flujo WhatsApp crea o identifica end_user y session, enruta por tenant, ejecuta IA y permite handoff IH. La especificación debe nombrar ambos actores y separar adquisición B2B de atención B2C.

## Outcome

- Signal: corrected
- Correction: Separar explícitamente Cliente Cricket o tenant del Cliente final o end_user; la web adquiere y configura tenants, WhatsApp atiende end_users.

## Source Nodes

- Self-service Onboarding
- Self-service Registration
- Multi-tenancy
- tenant_channels
- Multi-tenant WhatsApp Webhook