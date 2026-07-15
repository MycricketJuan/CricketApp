-- ============================================================
-- Handoff Agent — metadata para briefings estructurados
-- El HandoffAgent persiste el briefing completo (JSON) en
-- metadata.briefing; el texto legible va en context_summary
-- (escalations) / ai_recommendation (cognitive_checkpoints).
-- ============================================================

ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cognitive_checkpoints
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN escalations.metadata IS 'Briefing estructurado del HandoffAgent en metadata.briefing';
COMMENT ON COLUMN cognitive_checkpoints.metadata IS 'Briefing del HandoffAgent (metadata.briefing) + draft original de la IA (metadata.original_recommendation)';
