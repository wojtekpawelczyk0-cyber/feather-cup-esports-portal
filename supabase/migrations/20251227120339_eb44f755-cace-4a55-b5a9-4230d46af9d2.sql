-- Add bracket fields to matches table
ALTER TABLE public.matches 
ADD COLUMN round_number integer,
ADD COLUMN bracket_position integer,
ADD COLUMN next_match_id uuid REFERENCES public.matches(id),
ADD COLUMN winner_id uuid REFERENCES public.teams(id);

-- Create index for bracket queries
CREATE INDEX idx_matches_bracket ON public.matches(round_number, bracket_position);

-- Create function to advance winner to next match
CREATE OR REPLACE FUNCTION public.advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winner uuid;
  is_upper_slot boolean;
BEGIN
  -- Only run when match is finished and has a next match
  IF NEW.status = 'finished' AND NEW.next_match_id IS NOT NULL AND OLD.status != 'finished' THEN
    -- Determine winner based on scores
    IF NEW.team1_score > NEW.team2_score THEN
      winner := NEW.team1_id;
    ELSIF NEW.team2_score > NEW.team1_score THEN
      winner := NEW.team2_id;
    ELSE
      -- In case of tie, no advancement (shouldn't happen in tournament)
      RETURN NEW;
    END IF;
    
    -- Update the match with winner_id
    NEW.winner_id := winner;
    
    -- Determine if this match feeds into upper or lower slot of next match
    -- Even bracket positions go to team1, odd go to team2
    is_upper_slot := (NEW.bracket_position % 2 = 1);
    
    IF is_upper_slot THEN
      UPDATE public.matches 
      SET team1_id = winner 
      WHERE id = NEW.next_match_id;
    ELSE
      UPDATE public.matches 
      SET team2_id = winner 
      WHERE id = NEW.next_match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-advancement
CREATE TRIGGER advance_winner_trigger
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.advance_winner();