import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TournamentSettings {
  tournament_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  prize_pool: string;
  max_teams: string;
  tournament_days: string;
  total_matches: string;
  entry_fee: string;
  site_logo_url: string;
  // SEO settings
  site_title: string;
  site_description: string;
  favicon_url: string;
  og_image_url: string;
}

const defaultSettings: TournamentSettings = {
  tournament_name: 'Feather Cup 2024',
  hero_title: 'Feather Cup 2024',
  hero_subtitle: 'Dołącz do największego turnieju esportowego tego roku. Rywalizuj z najlepszymi, zdobywaj nagrody i stań się legendą.',
  hero_image_url: '',
  prize_pool: '₿50K',
  max_teams: '32',
  tournament_days: '7',
  total_matches: '64',
  entry_fee: '50',
  site_logo_url: '',
  // SEO defaults
  site_title: 'Feather Cup - Turniej CS2',
  site_description: 'Feather Cup - profesjonalny turniej CS2. Dołącz do rywalizacji i wygraj nagrody!',
  favicon_url: '',
  og_image_url: '',
};

export const useTournamentSettings = () => {
  const [settings, setSettings] = useState<TournamentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Partial<TournamentSettings> = {};
      (data || []).forEach((s: { key: string; value: string | null }) => {
        if (s.key in defaultSettings) {
          (settingsMap as any)[s.key] = s.value || (defaultSettings as any)[s.key];
        }
      });
      
      setSettings({ ...defaultSettings, ...settingsMap });
    } catch (error) {
      console.error('Error fetching tournament settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refreshSettings };
};
