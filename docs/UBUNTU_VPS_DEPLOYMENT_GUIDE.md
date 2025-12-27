# 🚀 Pełna instrukcja wdrożenia na Ubuntu Server 24.04 LTS

## Wymagania
- VPS z Ubuntu Server 24.04 LTS
- Minimum 1GB RAM, 20GB dysku
- Domena wskazująca na IP serwera
- Dostęp SSH (root lub sudo)

---

## CZĘŚĆ 1: Przygotowanie serwera

### 1.1 Połączenie z serwerem
```bash
ssh root@TWOJE_IP
# lub
ssh uzytkownik@TWOJE_IP
```

### 1.2 Aktualizacja systemu
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalacja podstawowych narzędzi
```bash
sudo apt install -y curl wget git unzip software-properties-common
```

---

## CZĘŚĆ 2: Instalacja Node.js 20.x

### 2.1 Dodanie repozytorium NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

### 2.2 Instalacja Node.js
```bash
sudo apt install -y nodejs
```

### 2.3 Weryfikacja instalacji
```bash
node --version   # Powinno pokazać v20.x.x
npm --version    # Powinno pokazać 10.x.x
```

---

## CZĘŚĆ 3: Instalacja Nginx (serwer WWW)

### 3.1 Instalacja Nginx
```bash
sudo apt install -y nginx
```

### 3.2 Uruchomienie i włączenie autostartu
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.3 Sprawdzenie statusu
```bash
sudo systemctl status nginx
```

---

## CZĘŚĆ 4: Pobranie i budowanie projektu

### 4.1 Utworzenie katalogu dla projektu
```bash
sudo mkdir -p /var/www/feathercup
sudo chown $USER:$USER /var/www/feathercup
```

### 4.2 Klonowanie repozytorium
```bash
cd /var/www/feathercup
git clone https://github.com/TWOJA-NAZWA/TWOJE-REPO.git .
```

### 4.3 Instalacja zależności
```bash
npm install
```

### 4.4 Utworzenie pliku .env
```bash
nano .env
```

Wklej następującą zawartość (zamień wartości na swoje):
```env
# Jeśli używasz Lovable Cloud (obecna baza danych):
VITE_SUPABASE_URL=https://beaalazjcgefwsdsnzev.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWFsYXpqY2dlZndzZHNuemV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3ODI5MjQsImV4cCI6MjA4MjM1ODkyNH0.AxwK5rNJ0PRYLOVxr4brvEoGiFDoF05n7Wqf7gdY4GA

# LUB jeśli tworzysz własny projekt Supabase:
# VITE_SUPABASE_URL=https://TWOJ-PROJEKT.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=TWOJ-ANON-KEY
```

Zapisz: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.5 Budowanie produkcyjne
```bash
npm run build
```

To utworzy folder `dist/` z gotowymi plikami.

---

## CZĘŚĆ 5: Konfiguracja Nginx

### 5.1 Utworzenie konfiguracji dla domeny
```bash
sudo nano /etc/nginx/sites-available/feathercup
```

Wklej (zamień `twoja-domena.pl` na swoją domenę):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name twoja-domena.pl www.twoja-domena.pl;
    
    root /var/www/feathercup/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - wszystkie ścieżki przekierowują do index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Zapisz: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.2 Aktywacja konfiguracji
```bash
sudo ln -s /etc/nginx/sites-available/feathercup /etc/nginx/sites-enabled/
```

### 5.3 Usunięcie domyślnej konfiguracji (opcjonalnie)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 5.4 Test konfiguracji
```bash
sudo nginx -t
```

Powinno pokazać: `syntax is ok` i `test is successful`

### 5.5 Restart Nginx
```bash
sudo systemctl restart nginx
```

---

## CZĘŚĆ 6: Instalacja certyfikatu SSL (HTTPS)

### 6.1 Instalacja Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Uzyskanie certyfikatu
```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

Postępuj zgodnie z instrukcjami:
1. Podaj adres e-mail
2. Zaakceptuj warunki (Y)
3. Wybierz czy chcesz przekierowywać HTTP na HTTPS (zalecane: 2)

### 6.3 Automatyczne odnowienie certyfikatu
Certbot automatycznie dodaje cron job. Możesz sprawdzić:
```bash
sudo certbot renew --dry-run
```

---

## CZĘŚĆ 7: Konfiguracja firewalla

### 7.1 Włączenie UFW
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 7.2 Sprawdzenie statusu
```bash
sudo ufw status
```

---

## CZĘŚĆ 8: Konfiguracja własnej bazy danych (opcjonalnie)

Jeśli chcesz przenieść bazę danych na własny projekt Supabase:

### 8.1 Utworzenie projektu Supabase
1. Przejdź na [supabase.com](https://supabase.com)
2. Kliknij "Start your project"
3. Zaloguj się przez GitHub
4. Kliknij "New project"
5. Wybierz organizację, nazwę projektu i hasło do bazy

### 8.2 Wykonanie migracji
1. W panelu Supabase przejdź do **SQL Editor**
2. Kliknij "New query"
3. Wklej całą zawartość pliku `docs/FULL_DATABASE_MIGRATION.sql`
4. Kliknij "Run"

### 8.3 Pobranie kluczy API
1. Przejdź do **Settings → API**
2. Skopiuj:
   - **Project URL** (np. `https://xyz.supabase.co`)
   - **anon public** key

### 8.4 Aktualizacja .env na serwerze
```bash
nano /var/www/feathercup/.env
```

Zmień wartości na nowe klucze.

### 8.5 Przebudowanie projektu
```bash
cd /var/www/feathercup
npm run build
```

### 8.6 Utworzenie pierwszego użytkownika z rolą owner
W SQL Editor na Supabase:
```sql
-- Najpierw znajdź user_id po rejestracji
SELECT id, email FROM auth.users;

-- Następnie przypisz rolę owner (zamień USER_ID na prawdziwe ID)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID', 'owner');
```

---

## CZĘŚĆ 9: Konfiguracja DNS domeny

### 9.1 W panelu rejestratora domeny
Dodaj rekordy DNS:

| Typ | Nazwa | Wartość | TTL |
|-----|-------|---------|-----|
| A | @ | TWOJE_IP_SERWERA | 3600 |
| A | www | TWOJE_IP_SERWERA | 3600 |

### 9.2 Weryfikacja propagacji
Sprawdź na [dnschecker.org](https://dnschecker.org) czy DNS się propaguje (może zająć do 24h).

---

## CZĘŚĆ 10: Automatyczne aktualizacje (CI/CD)

### 10.1 Skrypt aktualizacji
```bash
nano /var/www/feathercup/deploy.sh
```

Wklej:
```bash
#!/bin/bash
cd /var/www/feathercup
git pull origin main
npm install
npm run build
echo "Deploy completed at $(date)"
```

### 10.2 Nadanie uprawnień
```bash
chmod +x /var/www/feathercup/deploy.sh
```

### 10.3 Użycie
```bash
/var/www/feathercup/deploy.sh
```

---

## CZĘŚĆ 11: Monitorowanie

### 11.1 Sprawdzanie logów Nginx
```bash
# Logi dostępu
sudo tail -f /var/log/nginx/access.log

# Logi błędów
sudo tail -f /var/log/nginx/error.log
```

### 11.2 Sprawdzanie użycia zasobów
```bash
htop  # Instalacja: sudo apt install htop
```

### 11.3 Sprawdzanie miejsca na dysku
```bash
df -h
```

---

## ✅ Checklist końcowy

- [ ] Serwer zaktualizowany
- [ ] Node.js 20.x zainstalowany
- [ ] Nginx zainstalowany i uruchomiony
- [ ] Projekt sklonowany i zbudowany
- [ ] Plik .env skonfigurowany
- [ ] Konfiguracja Nginx utworzona
- [ ] SSL certyfikat zainstalowany
- [ ] Firewall skonfigurowany
- [ ] DNS skonfigurowany
- [ ] Strona działa pod domeną

---

## 🔧 Rozwiązywanie problemów

### Strona nie działa
```bash
# Sprawdź czy Nginx działa
sudo systemctl status nginx

# Sprawdź logi
sudo tail -50 /var/log/nginx/error.log

# Sprawdź czy pliki istnieją
ls -la /var/www/feathercup/dist/
```

### Błąd 502 Bad Gateway
```bash
# Sprawdź uprawnienia
sudo chown -R www-data:www-data /var/www/feathercup/dist
```

### Certyfikat SSL nie działa
```bash
# Sprawdź certyfikat
sudo certbot certificates

# Odnów ręcznie
sudo certbot renew
```

### Brak połączenia z bazą danych
1. Sprawdź czy klucze w .env są poprawne
2. Sprawdź czy w Supabase masz włączone RLS
3. Sprawdź konsole przeglądarki (F12 → Console)

---

## 📞 Pomoc

Jeśli masz problemy:
1. Sprawdź logi błędów Nginx
2. Sprawdź konsolę przeglądarki (F12)
3. Sprawdź czy DNS się propaguje
4. Upewnij się, że firewall nie blokuje portów 80/443
