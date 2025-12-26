import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FooterSettings {
  footer_description: string;
  footer_twitter: string;
  footer_youtube: string;
  footer_twitch: string;
  footer_discord: string;
  footer_copyright: string;
}

const defaultFooterSettings: FooterSettings = {
  footer_description: 'Profesjonalny turniej esportowy z nagrodami. Dołącz do najlepszych graczy i pokaż swoje umiejętności na arenie Feather Cup.',
  footer_twitter: '',
  footer_youtube: '',
  footer_twitch: '',
  footer_discord: '',
  footer_copyright: '© 2024 Feather Cup. Wszelkie prawa zastrzeżone.',
};

export const useFooterSettings = () => {
  const [settings, setSettings] = useState<FooterSettings>(defaultFooterSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('tournament_settings')
          .select('key, value');

        if (error) throw error;

        const settingsMap: Partial<FooterSettings> = {};
        (data || []).forEach((s: { key: string; value: string | null }) => {
          if (s.key in defaultFooterSettings) {
            (settingsMap as any)[s.key] = s.value || (defaultFooterSettings as any)[s.key];
          }
        });
        
        setSettings({ ...defaultFooterSettings, ...settingsMap });
      } catch (error) {
        console.error('Error fetching footer settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};
