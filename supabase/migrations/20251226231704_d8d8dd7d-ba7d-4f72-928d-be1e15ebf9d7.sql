-- Create role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'commentator', 'support');

-- Create team status enum
CREATE TYPE public.team_status AS ENUM ('preparing', 'ready', 'registered');

-- Create member role enum
CREATE TYPE public.member_role AS ENUM ('player', 'reserve', 'coach');

-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status team_status NOT NULL DEFAULT 'preparing',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  steam_id TEXT,
  nickname TEXT NOT NULL,
  role member_role NOT NULL DEFAULT 'player',
  avatar_url TEXT,
  position TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status match_status NOT NULL DEFAULT 'scheduled',
  round TEXT,
  stream_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sponsors table
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament settings table
CREATE TABLE public.tournament_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.tournament_settings (key, value) VALUES 
  ('entry_fee', '50'),
  ('tournament_name', 'Feather Cup 2024'),
  ('max_teams', '32');

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Function to check if user has any staff role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- Teams policies
CREATE POLICY "Anyone can view teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Team members policies
CREATE POLICY "Anyone can view team members"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Team owners can manage members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Team owners can delete members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    ) OR public.is_admin(auth.uid())
  );

-- Matches policies
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage matches"
  ON public.matches FOR ALL
  USING (public.is_staff(auth.uid()));

-- Sponsors policies
CREATE POLICY "Anyone can view active sponsors"
  ON public.sponsors FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage sponsors"
  ON public.sponsors FOR ALL
  USING (public.is_admin(auth.uid()));

-- Tournament settings policies
CREATE POLICY "Anyone can view settings"
  ON public.tournament_settings FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage settings"
  ON public.tournament_settings FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update team status based on members
CREATE OR REPLACE FUNCTION public.update_team_status()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  reserve_count INTEGER;
  coach_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE role = 'player'),
    COUNT(*) FILTER (WHERE role = 'reserve'),
    COUNT(*) FILTER (WHERE role = 'coach')
  INTO player_count, reserve_count, coach_count
  FROM public.team_members
  WHERE team_id = COALESCE(NEW.team_id, OLD.team_id);

  UPDATE public.teams
  SET status = CASE
    WHEN player_count >= 5 AND reserve_count >= 2 AND coach_count >= 1 THEN 'ready'::team_status
    ELSE 'preparing'::team_status
  END
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_team_status_on_member_change
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_status();

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;