import { useState, useEffect } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
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
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  team1?: Team | null;
  team2?: Team | null;
}

const Results = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('results-realtime')
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
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .in('status', ['live', 'finished'])
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const liveMatches = matches.filter(m => m.status === 'live');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  const MatchResultCard = ({ match }: { match: Match }) => {
    const isLive = match.status === 'live';
    const team1Won = match.status === 'finished' && match.winner_id === match.team1?.id;
    const team2Won = match.status === 'finished' && match.winner_id === match.team2?.id;
    
    // Fallback to score comparison if winner_id is not set
    const team1WonByScore = !match.winner_id && match.status === 'finished' && 
      (match.team1_score ?? 0) > (match.team2_score ?? 0);
    const team2WonByScore = !match.winner_id && match.status === 'finished' && 
      (match.team2_score ?? 0) > (match.team1_score ?? 0);

    const isTeam1Winner = team1Won || team1WonByScore;
    const isTeam2Winner = team2Won || team2WonByScore;

    return (
      <div className={`glass-card p-6 transition-all ${isLive ? 'ring-2 ring-red-500/50 animate-pulse-slow' : ''}`}>
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">Na żywo</span>
          </div>
        )}

        {/* Round info */}
        {match.round && (
          <div className="text-center mb-4">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">{match.round}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className={`flex-1 flex items-center gap-4 ${isTeam1Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {match.team1?.logo_url ? (
                <img src={match.team1.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {match.team1?.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground truncate">{match.team1?.name || 'TBD'}</p>
              {isTeam1Winner && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-medium">Zwycięzca</span>
                </div>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="px-8 text-center">
            <div className={`text-4xl font-black ${isLive ? 'text-red-400' : 'text-foreground'}`}>
              <span className={isTeam1Winner ? 'text-green-400' : ''}>{match.team1_score ?? 0}</span>
              <span className="text-muted-foreground mx-2">:</span>
              <span className={isTeam2Winner ? 'text-green-400' : ''}>{match.team2_score ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(match.scheduled_at), 'd MMM yyyy, HH:mm', { locale: pl })}
            </p>
          </div>

          {/* Team 2 */}
          <div className={`flex-1 flex items-center gap-4 justify-end ${isTeam2Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-bold text-lg text-foreground truncate">{match.team2?.name || 'TBD'}</p>
              {isTeam2Winner && (
                <div className="flex items-center gap-1 text-yellow-400 justify-end">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-medium">Zwycięzca</span>
                </div>
              )}
            </div>
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {match.team2?.logo_url ? (
                <img src={match.team2.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {match.team2?.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <HeroSection
        title="Wyniki meczów"
        subtitle="Sprawdź wszystkie zakończone mecze i rezultaty rozgrywek na żywo"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Live Matches */}
              {liveMatches.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    Mecze na żywo
                  </h2>
                  <div className="grid gap-4">
                    {liveMatches.map((match) => (
                      <MatchResultCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              )}

              {/* Finished Matches */}
              {finishedMatches.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">Zakończone mecze</h2>
                  <div className="grid gap-4">
                    {finishedMatches.map((match, index) => (
                      <div
                        key={match.id}
                        className="opacity-0 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <MatchResultCard match={match} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 && (
                <div className="text-center py-16">
                  <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg">
                    Brak zakończonych meczów. Turniej jeszcze się nie rozpoczął!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Results;
