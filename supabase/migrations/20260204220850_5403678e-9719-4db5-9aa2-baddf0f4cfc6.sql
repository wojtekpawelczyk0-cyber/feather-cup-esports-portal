-- Add swiss_group column for separating matches into Group A and Group B
ALTER TABLE public.matches 
ADD COLUMN swiss_group text DEFAULT NULL;

-- Add index for efficient filtering by group
CREATE INDEX idx_matches_swiss_group ON public.matches(swiss_group, swiss_round, swiss_order);

COMMENT ON COLUMN public.matches.swiss_group IS 'Swiss group assignment: A or B';