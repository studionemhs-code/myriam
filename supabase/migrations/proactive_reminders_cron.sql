-- ============================================================================
-- Agente Proativo: agendamento do check-proactive-reminders (a cada hora)
-- ============================================================================

SELECT cron.schedule(
  'check-proactive-reminders-hourly',
  '0 * * * *',
  $$SELECT public.call_edge_function('check-proactive-reminders', '{}'::jsonb)$$
);