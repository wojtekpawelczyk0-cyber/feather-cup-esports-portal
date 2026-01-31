-- Add format column to map_veto_sessions
ALTER TABLE public.map_veto_sessions 
ADD COLUMN format TEXT NOT NULL DEFAULT 'bo3' CHECK (format IN ('bo1', 'bo3'));