-- Migration: cria função RPC para descobrir tabelas por coluna
-- Permite que a Edge Function delete-user descubra dinamicamente todas as tabelas
-- que possuem user_id, created_by_id ou sender_id, sem precisar de lista fixa.

CREATE OR REPLACE FUNCTION public.get_tables_by_column(column_name text)
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = $1
  ORDER BY table_name;
$$;

-- Garante que a função seja acessível via PostgREST (API)
GRANT EXECUTE ON FUNCTION public.get_tables_by_column(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_by_column(text) TO service_role;