ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS swiss_status TEXT DEFAULT NULL;
COMMENT ON COLUMN public.teams.swiss_status IS 'Status w Swiss: advanced (awans), eliminated (odpada), null (w grze)';