import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  round: string | null;
  stream_url: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1?: Team | null;
  team2?: Team | null;
}

export const useMatches = (status?: 'scheduled' | 'live' | 'finished' | 'cancelled') => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        let query = supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name, logo_url),
            team2:teams!matches_team2_id_fkey(id, name, logo_url)
          `)
          .order('scheduled_at', { ascending: true });

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setMatches(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  return { matches, loading, error };
};
