-- Create table for map veto sessions and access
CREATE TABLE public.map_veto_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    team1_user_id uuid NOT NULL,
    team2_user_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    session_code text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex')
);

-- Enable RLS
ALTER TABLE public.map_veto_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage veto sessions"
ON public.map_veto_sessions
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Authorized users can view their sessions"
ON public.map_veto_sessions
FOR SELECT
USING (
    auth.uid() = team1_user_id OR 
    auth.uid() = team2_user_id OR
    has_role(auth.uid(), 'owner'::app_role)
);