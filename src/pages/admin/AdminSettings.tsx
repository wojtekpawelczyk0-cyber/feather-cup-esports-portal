import { useState, useEffect } from 'react';
import { Loader2, Save, Trophy, Calendar, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    entry_fee: '50',
    tournament_name: 'Feather Cup 2024',
    max_teams: '32',
    prize_pool: '₿50K',
    tournament_days: '7',
    hero_title: 'Feather Cup 2024',
    hero_subtitle: 'Dołącz do największego turnieju esportowego tego roku. Rywalizuj z najlepszymi, zdobywaj nagrody i stań się legendą.',
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
              <Input
                id="hero_subtitle"
                value={settings.hero_subtitle}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                placeholder="Opis turnieju..."
              />
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
