-- Add columns to store veto state in the session
ALTER TABLE public.map_veto_sessions 
ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS maps_state jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;

-- Enable realtime for map_veto_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_sessions;