-- Add swiss_order column for ordering matches within Swiss rounds
ALTER TABLE public.matches 
ADD COLUMN swiss_order integer DEFAULT 0;

-- Add index for efficient sorting
CREATE INDEX idx_matches_swiss_order ON public.matches(swiss_round, swiss_order);

COMMENT ON COLUMN public.matches.swiss_order IS 'Order of match display within Swiss round (lower = higher on bracket)';