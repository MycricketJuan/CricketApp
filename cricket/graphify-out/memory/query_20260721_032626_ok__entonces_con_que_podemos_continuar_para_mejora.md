---
type: "query"
date: "2026-07-21T03:26:26.830724+00:00"
question: "Ok, entonces con que podemos continuar para mejorar la plataforma?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Self-service Registration", "Self-service Onboarding", "Setup Wizard", "tenant_channels", "Multi-tenant WhatsApp Webhook", "Knowledge Base Builder"]
---

# Q: Ok, entonces con que podemos continuar para mejorar la plataforma?

## Answer

Expanded from original query via vocab: [self, service, registration, onboarding, setup, tenant, multi, tenancy, channels, webhook, knowledge, billing]. La prioridad recomendada es un vertical slice de adquisición web a activación: extraer createTenant a un servicio reutilizable, registrar al tenant_admin con Auth0, crear tenant_channels con credenciales protegidas, construir un wizard que reutilice la knowledge base existente, consolidar los dos webhooks y resolver el tenant por canal, y terminar con un mensaje de prueba. No conviene priorizar Salud, catálogo o billing antes de que una empresa pueda registrarse y activar WhatsApp sin intervención del superadmin.

## Outcome

- Signal: useful

## Source Nodes

- Self-service Registration
- Self-service Onboarding
- Setup Wizard
- tenant_channels
- Multi-tenant WhatsApp Webhook
- Knowledge Base Builder