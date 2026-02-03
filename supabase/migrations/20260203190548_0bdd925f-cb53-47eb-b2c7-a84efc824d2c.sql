-- Map Veto: make state + history truly shared for all authenticated viewers

-- Ensure timestamp columns exist (in case earlier migration didn't fully apply)
ALTER TABLE public.map_veto_sessions
ADD COLUMN IF NOT EXISTS step_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.map_veto_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill nulls
UPDATE public.map_veto_sessions
SET
  step_started_at = COALESCE(step_started_at, created_at, now()),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE step_started_at IS NULL OR updated_at IS NULL;

-- Server-sourced timestamps: updated_at always bumps; step_started_at bumps when current_step changes
CREATE OR REPLACE FUNCTION public.map_veto_sessions_set_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  IF TG_OP = 'UPDATE' THEN
    IF NEW.current_step IS DISTINCT FROM OLD.current_step THEN
      NEW.step_started_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS map_veto_sessions_set_timestamps ON public.map_veto_sessions;
CREATE TRIGGER map_veto_sessions_set_timestamps
BEFORE UPDATE ON public.map_veto_sessions
FOR EACH ROW
EXECUTE FUNCTION public.map_veto_sessions_set_timestamps();

-- RLS: allow everyone logged in to VIEW; captains/admins to UPDATE; admins to INSERT/DELETE
DROP POLICY IF EXISTS "Authorized users can view their sessions" ON public.map_veto_sessions;
DROP POLICY IF EXISTS "Owners can manage veto sessions" ON public.map_veto_sessions;

DROP POLICY IF EXISTS "Authenticated users can view veto sessions" ON public.map_veto_sessions;
CREATE POLICY "Authenticated users can view veto sessions"
ON public.map_veto_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Captains/admins can update veto sessions" ON public.map_veto_sessions;
CREATE POLICY "Captains/admins can update veto sessions"
ON public.map_veto_sessions
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = team1_user_id OR
    auth.uid() = team2_user_id OR
    public.is_admin(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = team1_user_id OR
    auth.uid() = team2_user_id OR
    public.is_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can insert veto sessions" ON public.map_veto_sessions;
CREATE POLICY "Admins can insert veto sessions"
ON public.map_veto_sessions
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete veto sessions" ON public.map_veto_sessions;
CREATE POLICY "Admins can delete veto sessions"
ON public.map_veto_sessions
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Action log table: each ban/pick stored as an event so everyone can see who did what
DO $$ BEGIN
  CREATE TYPE public.map_veto_action_type AS ENUM ('ban', 'pick', 'decider', 'random');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.map_veto_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.map_veto_sessions(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL,
  step INTEGER NOT NULL,
  action public.map_veto_action_type NOT NULL,
  map_id TEXT NOT NULL,
  performed_by UUID NOT NULL,
  performed_by_team TEXT NOT NULL, -- 'team1' | 'team2' | 'system'
  is_auto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_veto_actions_session_code_created_at
  ON public.map_veto_actions (session_code, created_at);

ALTER TABLE public.map_veto_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view actions" ON public.map_veto_actions;
CREATE POLICY "Authenticated users can view actions"
ON public.map_veto_actions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Captains/admins can insert actions" ON public.map_veto_actions;
CREATE POLICY "Captains/admins can insert actions"
ON public.map_veto_actions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND performed_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.map_veto_sessions s
    WHERE s.id = session_id
      AND s.is_active = true
      AND (
        auth.uid() = s.team1_user_id OR
        auth.uid() = s.team2_user_id OR
        public.is_admin(auth.uid())
      )
  )
);

-- Realtime: ensure both tables broadcast changes
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_actions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;