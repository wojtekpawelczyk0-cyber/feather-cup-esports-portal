-- Add step_started_at column to track timer synchronization
ALTER TABLE public.map_veto_sessions
ADD COLUMN IF NOT EXISTS step_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add updated_at column for change tracking
ALTER TABLE public.map_veto_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();