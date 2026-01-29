-- Add swiss tournament fields to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS swiss_round integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_playoff boolean DEFAULT false;

-- Create swiss standings view for easy querying
CREATE OR REPLACE VIEW public.swiss_standings AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.logo_url,
  COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins,
  COUNT(CASE WHEN m.status = 'finished' AND m.winner_id != t.id AND (m.team1_id = t.id OR m.team2_id = t.id) THEN 1 END) as losses,
  COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) * 3 as points,
  COALESCE(SUM(
    CASE 
      WHEN m.team1_id = t.id THEN m.team1_score - m.team2_score
      WHEN m.team2_id = t.id THEN m.team2_score - m.team1_score
      ELSE 0
    END
  ), 0) as round_difference
FROM public.teams t
LEFT JOIN public.matches m ON (m.team1_id = t.id OR m.team2_id = t.id) 
  AND m.swiss_round IS NOT NULL 
  AND m.status = 'finished'
WHERE t.status = 'registered'
GROUP BY t.id, t.name, t.logo_url
ORDER BY points DESC, round_difference DESC, wins DESC;