import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  is_active: boolean;
}

export const useSponsors = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('sponsors')
          .select('*')
          .eq('is_active', true)
          .order('tier', { ascending: true });

        if (fetchError) throw fetchError;
        setSponsors(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  return { sponsors, loading, error };
};
