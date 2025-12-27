-- Create table for static pages content
CREATE TABLE public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view published pages
CREATE POLICY "Anyone can view published pages"
ON public.static_pages
FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'owner'));

-- Only owners can manage pages
CREATE POLICY "Owners can manage pages"
ON public.static_pages
FOR ALL
USING (has_role(auth.uid(), 'owner'));

-- Create trigger for updated_at
CREATE TRIGGER update_static_pages_updated_at
BEFORE UPDATE ON public.static_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pages
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