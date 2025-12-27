-- Create user_bans table for tracking user bans
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Policies for user_bans
CREATE POLICY "Admins can manage bans"
ON public.user_bans
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own bans"
ON public.user_bans
FOR SELECT
USING (auth.uid() = user_id);

-- Add commentator columns to matches
ALTER TABLE public.matches
ADD COLUMN commentator1_id UUID,
ADD COLUMN commentator2_id UUID;

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_bans
    WHERE user_id = _user_id
      AND banned_until > now()
  )
$$;

-- Create function to check if user is commentator
CREATE OR REPLACE FUNCTION public.is_commentator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'commentator'
  )
$$;