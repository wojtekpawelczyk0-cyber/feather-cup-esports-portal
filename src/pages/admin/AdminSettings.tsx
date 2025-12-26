import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
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
        <p className="text-muted-foreground">Konfiguracja turnieju</p>
      </div>

      <div className="glass-card p-6 max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tournament_name">Nazwa turnieju</Label>
            <Input
              id="tournament_name"
              value={settings.tournament_name}
              onChange={(e) => setSettings({ ...settings, tournament_name: e.target.value })}
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

          <div className="space-y-2">
            <Label htmlFor="max_teams">Maksymalna liczba drużyn</Label>
            <Input
              id="max_teams"
              type="number"
              min="2"
              value={settings.max_teams}
              onChange={(e) => setSettings({ ...settings, max_teams: e.target.value })}
            />
          </div>

          <Button variant="hero" onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Zapisz ustawienia
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
