-- ============================================================
-- FEATHER CUP - KOMPLETNA MIGRACJA BAZY DANYCH
-- Wersja: 1.0
-- Data: 2024-12-27
-- 
-- INSTRUKCJA:
-- 1. Utwórz nowy projekt na supabase.com
-- 2. Przejdź do SQL Editor
-- 3. Wklej całą zawartość tego pliku
-- 4. Kliknij "Run"
-- ============================================================

-- ============================================================
-- CZĘŚĆ 1: TWORZENIE TABEL I TYPÓW
-- ============================================================

-- Tworzenie enumów (typów wyliczeniowych)
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'commentator', 'support');
CREATE TYPE public.team_status AS ENUM ('preparing', 'ready', 'registered');
CREATE TYPE public.member_role AS ENUM ('player', 'reserve', 'coach');
CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');

-- ============================================================
-- TABELA: profiles (Profile użytkowników)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  steam_id TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABELA: user_roles (Role użytkowników)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: teams (Drużyny)
-- ============================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status team_status NOT NULL DEFAULT 'preparing',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: team_members (Członkowie drużyn)
-- ============================================================
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

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: matches (Mecze)
-- ============================================================
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
  commentator1_id UUID,
  commentator2_id UUID,
  round_number INTEGER,
  bracket_position INTEGER,
  next_match_id UUID REFERENCES public.matches(id),
  winner_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Indeks dla zapytań o drabinkę
CREATE INDEX idx_matches_bracket ON public.matches(round_number, bracket_position);

-- ============================================================
-- TABELA: sponsors (Sponsorzy)
-- ============================================================
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: tournament_settings (Ustawienia turnieju)
-- ============================================================
CREATE TABLE public.tournament_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;

-- Domyślne ustawienia
INSERT INTO public.tournament_settings (key, value) VALUES 
  ('entry_fee', '50'),
  ('tournament_name', 'Feather Cup 2024'),
  ('max_teams', '32');

-- ============================================================
-- TABELA: user_bans (Bany użytkowników)
-- ============================================================
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: page_visits (Statystyki odwiedzin)
-- ============================================================
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_path TEXT NOT NULL DEFAULT '/',
  visitor_id TEXT
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: static_pages (Strony statyczne)
-- ============================================================
CREATE TABLE public.static_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

-- Domyślne strony statyczne
INSERT INTO public.static_pages (slug, title, content) VALUES
('regulamin', 'Regulamin', '# Regulamin turnieju

## 1. Postanowienia ogólne
Niniejszy regulamin określa zasady uczestnictwa w turnieju.

## 2. Warunki uczestnictwa
- Uczestnikiem może być osoba pełnoletnia
- Wymagane jest posiadanie konta Steam
- Drużyna musi składać się z 5 graczy + 2 rezerwowych + trenera

## 3. Zasady rozgrywek
- Mecze rozgrywane są w formacie BO1/BO3
- Obowiązuje punktualność
- W przypadku niestawienia się drużyna przegrywa walkowerem'),

('polityka-prywatnosci', 'Polityka prywatności', '# Polityka prywatności

## 1. Administrator danych
Administratorem danych osobowych jest organizator turnieju.

## 2. Zakres zbieranych danych
Zbieramy następujące dane:
- Adres e-mail
- Nazwa użytkownika
- Steam ID

## 3. Cel przetwarzania
Dane przetwarzane są w celu:
- Organizacji turnieju
- Kontaktu z uczestnikami
- Prowadzenia statystyk

## 4. Prawa użytkownika
Masz prawo do:
- Wglądu w swoje dane
- Poprawiania danych
- Usunięcia danych'),

('faq', 'FAQ - Często zadawane pytania', '# Często zadawane pytania

## Jak dołączyć do turnieju?
Załóż konto, stwórz drużynę lub dołącz do istniejącej, a następnie opłać wpisowe.

## Ile kosztuje udział?
Sprawdź aktualną cenę wpisowego na stronie głównej.

## Kiedy odbywają się mecze?
Harmonogram meczy dostępny jest w zakładce "Mecze".

## Jak zgłosić problem?
Skontaktuj się z nami przez formularz wsparcia lub Discord.

## Czy mogę zmienić skład drużyny?
Tak, do momentu rozpoczęcia turnieju możesz edytować skład.'),

('wsparcie', 'Wsparcie', '# Wsparcie

## Kontakt
Jeśli potrzebujesz pomocy, skontaktuj się z nami:

- **Discord**: discord.gg/turniej
- **Email**: support@turniej.pl

## Godziny pracy
Odpowiadamy na zgłoszenia:
- Poniedziałek - Piątek: 10:00 - 20:00
- Sobota - Niedziela: 12:00 - 18:00

## Najczęstsze problemy

### Nie mogę się zalogować
Sprawdź czy używasz poprawnego adresu e-mail. Możesz zresetować hasło.

### Nie widzę mojej drużyny
Upewnij się, że jesteś zalogowany na właściwe konto.

### Płatność nie przeszła
Skontaktuj się z nami podając szczegóły transakcji.');

-- ============================================================
-- CZĘŚĆ 2: FUNKCJE POMOCNICZE
-- ============================================================

-- Funkcja aktualizacji timestampu
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Funkcja obsługi nowego użytkownika
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Funkcja sprawdzania roli
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

-- Funkcja sprawdzania admina
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

-- Funkcja sprawdzania staff
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

-- Funkcja sprawdzania bana
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

-- Funkcja sprawdzania komentatora
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

-- Funkcja aktualizacji statusu drużyny
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

-- Funkcja awansu zwycięzcy w drabince
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
  IF NEW.status = 'finished' AND NEW.next_match_id IS NOT NULL AND OLD.status != 'finished' THEN
    IF NEW.team1_score > NEW.team2_score THEN
      winner := NEW.team1_id;
    ELSIF NEW.team2_score > NEW.team1_score THEN
      winner := NEW.team2_id;
    ELSE
      RETURN NEW;
    END IF;
    
    NEW.winner_id := winner;
    is_upper_slot := (NEW.bracket_position % 2 = 1);
    
    IF is_upper_slot THEN
      UPDATE public.matches SET team1_id = winner WHERE id = NEW.next_match_id;
    ELSE
      UPDATE public.matches SET team2_id = winner WHERE id = NEW.next_match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- CZĘŚĆ 3: TRIGGERY
-- ============================================================

-- Trigger dla nowego użytkownika
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggery updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger aktualizacji statusu drużyny
CREATE TRIGGER update_team_status_on_member_change
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_status();

-- Trigger awansu w drabince
CREATE TRIGGER advance_winner_trigger
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.advance_winner();

-- ============================================================
-- CZĘŚĆ 4: POLITYKI RLS (Row Level Security)
-- ============================================================

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- teams
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

-- team_members
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

-- matches
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage matches"
  ON public.matches FOR ALL
  USING (public.is_staff(auth.uid()));

-- sponsors
CREATE POLICY "Anyone can view active sponsors"
  ON public.sponsors FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage sponsors"
  ON public.sponsors FOR ALL
  USING (public.is_admin(auth.uid()));

-- tournament_settings
CREATE POLICY "Anyone can view settings"
  ON public.tournament_settings FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage settings"
  ON public.tournament_settings FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- user_bans
CREATE POLICY "Admins can manage bans"
  ON public.user_bans FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own bans"
  ON public.user_bans FOR SELECT
  USING (auth.uid() = user_id);

-- page_visits
CREATE POLICY "Anyone can insert visits" 
  ON public.page_visits FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Owners can view visits" 
  ON public.page_visits FOR SELECT 
  USING (has_role(auth.uid(), 'owner'::app_role));

-- static_pages
CREATE POLICY "Anyone can view published pages"
  ON public.static_pages FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can manage pages"
  ON public.static_pages FOR ALL
  USING (has_role(auth.uid(), 'owner'));

-- ============================================================
-- CZĘŚĆ 5: REALTIME
-- ============================================================

-- Włączenie realtime dla tabeli matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ============================================================
-- KONIEC MIGRACJI
-- ============================================================
