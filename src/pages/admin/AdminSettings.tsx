import { useState, useEffect } from 'react';
import { Loader2, Save, Trophy, Calendar, Zap, Users, Link2, Twitter, Youtube, Image, Globe, FileImage, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUpload from '@/components/admin/FileUpload';
import { format } from 'date-fns';
interface Setting {
  id: string;
  key: string;
  value: string | null;
}

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    // Tournament settings
    entry_fee: '50',
    tournament_name: 'Feather Cup 2024',
    max_teams: '32',
    prize_pool: '₿50K',
    tournament_days: '7',
    // Hero section
    hero_title: 'Feather Cup 2024',
    hero_subtitle: 'Dołącz do największego turnieju esportowego tego roku. Rywalizuj z najlepszymi, zdobywaj nagrody i stań się legendą.',
    hero_image_url: '',
    // Branding
    site_logo_url: '',
    // SEO settings
    site_title: 'Feather Cup - Turniej CS2',
    site_description: 'Feather Cup - profesjonalny turniej CS2. Dołącz do rywalizacji i wygraj nagrody!',
    favicon_url: '',
    og_image_url: '',
    // Footer settings
    footer_description: 'Profesjonalny turniej esportowy z nagrodami. Dołącz do najlepszych graczy i pokaż swoje umiejętności na arenie Feather Cup.',
    footer_twitter: '',
    footer_youtube: '',
    footer_twitch: '',
    footer_discord: '',
    footer_copyright: '© 2024 Feather Cup. Wszelkie prawa zastrzeżone.',
    // Team lock
    team_lock_date: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      (data || []).forEach((s: Setting) => {
        settingsMap[s.key] = s.value || '';
      });
      setSettings((prev) => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('tournament_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) throw error;
      }

      toast({ title: 'Ustawienia zapisane!' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Ustawienia</h1>
        <p className="text-muted-foreground">Konfiguracja turnieju i strony głównej</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Hero Section Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sekcja Hero
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Tytuł Hero</Label>
              <Input
                id="hero_title"
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                placeholder="Feather Cup 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Podtytuł Hero</Label>
              <Textarea
                id="hero_subtitle"
                value={settings.hero_subtitle}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                placeholder="Opis turnieju..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                Obraz tła Hero
              </Label>
              <FileUpload
                value={settings.hero_image_url}
                onChange={(url) => setSettings({ ...settings, hero_image_url: url })}
                label="hero-background"
                folder="branding"
              />
              <p className="text-xs text-muted-foreground">
                Zalecany rozmiar: 1920x1080 lub większy. Obraz będzie wyświetlany w tle sekcji hero na stronie głównej.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Statystyki na stronie głównej
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prize_pool" className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                Pula nagród
              </Label>
              <Input
                id="prize_pool"
                value={settings.prize_pool}
                onChange={(e) => setSettings({ ...settings, prize_pool: e.target.value })}
                placeholder="np. ₿50K, $10,000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_teams" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Maksymalna liczba drużyn
              </Label>
              <Input
                id="max_teams"
                type="number"
                min="2"
                value={settings.max_teams}
                onChange={(e) => setSettings({ ...settings, max_teams: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tournament_days" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Dni turnieju
              </Label>
              <Input
                id="tournament_days"
                type="number"
                min="1"
                value={settings.tournament_days}
                onChange={(e) => setSettings({ ...settings, tournament_days: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Wpisowe (PLN)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                value={settings.entry_fee}
                onChange={(e) => setSettings({ ...settings, entry_fee: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Tournament Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Podstawowe ustawienia</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tournament_name">Nazwa turnieju</Label>
              <Input
                id="tournament_name"
                value={settings.tournament_name}
                onChange={(e) => setSettings({ ...settings, tournament_name: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Team Lock Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Blokada edycji drużyn
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_lock_date">Data i godzina blokady</Label>
              <Input
                id="team_lock_date"
                type="datetime-local"
                value={settings.team_lock_date ? format(new Date(settings.team_lock_date), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setSettings({ ...settings, team_lock_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                Po tej dacie użytkownicy nie będą mogli edytować swoich drużyn, dodawać/usuwać graczy ani tworzyć nowych drużyn.
                Pozostaw puste, aby zezwolić na edycję bez ograniczeń czasowych.
              </p>
              {settings.team_lock_date && new Date(settings.team_lock_date) <= new Date() && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <Lock className="w-4 h-4" />
                  <span>Blokada jest aktywna - edycja drużyn jest zablokowana</span>
                </div>
              )}
              {settings.team_lock_date && new Date(settings.team_lock_date) > new Date() && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm mt-2">
                  <Calendar className="w-4 h-4" />
                  <span>Blokada nastąpi: {format(new Date(settings.team_lock_date), 'dd.MM.yyyy HH:mm')}</span>
                </div>
              )}
            </div>
            {settings.team_lock_date && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSettings({ ...settings, team_lock_date: '' })}
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                Usuń blokadę
              </Button>
            )}
          </div>
        </div>

        {/* Branding Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            Logo / Branding
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Logo turnieju (zamieni ikonę pucharu)</Label>
              <FileUpload
                value={settings.site_logo_url}
                onChange={(url) => setSettings({ ...settings, site_logo_url: url })}
                label="logo"
                folder="branding"
              />
              <p className="text-xs text-muted-foreground">
                Zostanie użyte w nawigacji i stopce zamiast ikony pucharu.
              </p>
            </div>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            SEO / Przeglądarka
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">Tytuł strony (w karcie przeglądarki)</Label>
              <Input
                id="site_title"
                value={settings.site_title}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                placeholder="Feather Cup - Turniej CS2"
              />
              <p className="text-xs text-muted-foreground">
                Wyświetlany w karcie przeglądarki i wynikach wyszukiwania Google.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_description">Meta opis (SEO)</Label>
              <Textarea
                id="site_description"
                value={settings.site_description}
                onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                placeholder="Opis strony dla wyszukiwarek..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Wyświetlany w wynikach wyszukiwania Google. Max 160 znaków.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon_url" className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-muted-foreground" />
                Favicon URL (ikona w karcie)
              </Label>
              <Input
                id="favicon_url"
                value={settings.favicon_url}
                onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">
                Podaj bezpośredni URL do pliku .ico lub .png. Ikona wyświetlana w karcie przeglądarki.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Obrazek Open Graph (udostępnianie)</Label>
              <FileUpload
                value={settings.og_image_url}
                onChange={(url) => setSettings({ ...settings, og_image_url: url })}
                label="og-image"
                folder="branding"
              />
              <p className="text-xs text-muted-foreground">
                Obrazek wyświetlany przy udostępnianiu strony na social media. Zalecany rozmiar: 1200x630.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Stopka
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="footer_description">Opis w stopce</Label>
              <Textarea
                id="footer_description"
                value={settings.footer_description}
                onChange={(e) => setSettings({ ...settings, footer_description: e.target.value })}
                placeholder="Opis turnieju w stopce..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_copyright">Copyright</Label>
              <Input
                id="footer_copyright"
                value={settings.footer_copyright}
                onChange={(e) => setSettings({ ...settings, footer_copyright: e.target.value })}
                placeholder="© 2024 Feather Cup..."
              />
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-medium text-foreground mb-3">Social Media (URL)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="footer_twitter" className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-muted-foreground" />
                    Twitter / X
                  </Label>
                  <Input
                    id="footer_twitter"
                    value={settings.footer_twitter}
                    onChange={(e) => setSettings({ ...settings, footer_twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_youtube" className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-muted-foreground" />
                    YouTube
                  </Label>
                  <Input
                    id="footer_youtube"
                    value={settings.footer_youtube}
                    onChange={(e) => setSettings({ ...settings, footer_youtube: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_twitch">Twitch</Label>
                  <Input
                    id="footer_twitch"
                    value={settings.footer_twitch}
                    onChange={(e) => setSettings({ ...settings, footer_twitch: e.target.value })}
                    placeholder="https://twitch.tv/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_discord">Discord</Label>
                  <Input
                    id="footer_discord"
                    value={settings.footer_discord}
                    onChange={(e) => setSettings({ ...settings, footer_discord: e.target.value })}
                    placeholder="https://discord.gg/..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button variant="hero" onClick={saveSettings} disabled={saving} className="w-fit">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Zapisz ustawienia
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
