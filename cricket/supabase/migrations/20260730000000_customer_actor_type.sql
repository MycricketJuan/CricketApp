-- ============================================================
-- Cricket — Agrega CUSTOMER al enum actor_type
-- El journey engine nunca persistía el mensaje entrante del
-- cliente en `interactions` (solo la respuesta de la IA), por lo
-- que el historial de conversación reconstruido en cada turno
-- perdía las respuestas del cliente y los agentes (ej. trámites)
-- volvían a preguntar lo mismo en bucle. Con este valor se puede
-- registrar cada mensaje con su actor real.
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER'
    AND enumtypid = 'actor_type'::regtype) THEN
    ALTER TYPE actor_type ADD VALUE 'CUSTOMER';
  END IF;
END $$;
