
-- Add bo_format column to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bo_format TEXT DEFAULT 'bo1';

-- Create match_maps table
CREATE TABLE IF NOT EXISTS public.match_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    map_number INT DEFAULT 1,
    map_name TEXT NOT NULL,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.match_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match maps" ON public.match_maps FOR SELECT USING (true);
CREATE POLICY "Staff can manage match maps" ON public.match_maps FOR ALL USING (is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_match_maps_match_id ON public.match_maps(match_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_maps;
