import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Trophy, ArrowLeft, MapPin } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { getMapThumbnail, getMapDisplayName } from '@/lib/mapThumbnails';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface MatchMap {
  id: string;
  map_name: string;
  map_number: number;
  team1_score: number;
  team2_score: number;
  status: string;
}

interface Match {
  id: string;
  scheduled_at: string | null;
  status: string;
  round: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  bo_format: string | null;
  team1?: Team | null;
  team2?: Team | null;
}

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [maps, setMaps] = useState<MatchMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const [matchRes, mapsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*, team1:teams!matches_team1_id_fkey(id, name, logo_url), team2:teams!matches_team2_id_fkey(id, name, logo_url)')
          .eq('id', id)
          .single(),
        supabase
          .from('match_maps')
          .select('*')
          .eq('match_id', id)
          .order('map_number', { ascending: true }),
      ]);

      if (matchRes.data) setMatch(matchRes.data as any);
      if (mapsRes.data) setMaps(mapsRes.data as any);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`match-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_maps', filter: `match_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!match) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground text-lg">Mecz nie został znaleziony</p>
          <Link to="/wyniki" className="text-primary hover:underline mt-4 inline-block">← Wróć do wyników</Link>
        </div>
      </Layout>
    );
  }

  const isLive = match.status === 'live';
  const isTeam1Winner = match.winner_id === match.team1?.id || 
    (!match.winner_id && match.status === 'finished' && (match.team1_score ?? 0) > (match.team2_score ?? 0));
  const isTeam2Winner = match.winner_id === match.team2?.id || 
    (!match.winner_id && match.status === 'finished' && (match.team2_score ?? 0) > (match.team1_score ?? 0));

  const mapStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return { text: 'Na żywo', cls: 'bg-red-500/20 text-red-400' };
      case 'finished': return { text: 'Zakończona', cls: 'bg-green-500/20 text-green-400' };
      default: return { text: 'Oczekuje', cls: 'bg-yellow-500/20 text-yellow-400' };
    }
  };

  return (
    <Layout>
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Back link */}
          <Link to="/wyniki" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Wróć do wyników
          </Link>

          {/* Match header */}
          <div className={`glass-card p-8 mb-8 ${isLive ? 'ring-2 ring-red-500/50' : ''}`}>
            {isLive && (
              <div className="flex items-center gap-2 mb-4 justify-center">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">Na żywo</span>
              </div>
            )}

            {match.round && (
              <div className="text-center mb-4">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">{match.round}</span>
                {match.bo_format && (
                  <span className="ml-2 text-xs text-muted-foreground">({match.bo_format.toUpperCase()})</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              {/* Team 1 */}
              <div className={`flex-1 flex items-center gap-4 ${isTeam1Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {match.team1?.logo_url ? (
                    <img src={match.team1.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">{match.team1?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-xl text-foreground">{match.team1?.name || 'TBD'}</p>
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
                <div className={`text-5xl font-black ${isLive ? 'text-red-400' : 'text-foreground'}`}>
                  <span className={isTeam1Winner ? 'text-green-400' : ''}>{match.team1_score ?? 0}</span>
                  <span className="text-muted-foreground mx-3">:</span>
                  <span className={isTeam2Winner ? 'text-green-400' : ''}>{match.team2_score ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Wynik ogólny (mapy)</p>
              </div>

              {/* Team 2 */}
              <div className={`flex-1 flex items-center gap-4 justify-end ${isTeam2Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
                <div className="text-right">
                  <p className="font-bold text-xl text-foreground">{match.team2?.name || 'TBD'}</p>
                  {isTeam2Winner && (
                    <div className="flex items-center gap-1 text-yellow-400 justify-end">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs font-medium">Zwycięzca</span>
                    </div>
                  )}
                </div>
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {match.team2?.logo_url ? (
                    <img src={match.team2.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">{match.team2?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Maps */}
          {maps.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Mapy
              </h2>
              {maps.map((map) => {
                const status = mapStatusLabel(map.status);
                const t1Won = map.status === 'finished' && map.team1_score > map.team2_score;
                const t2Won = map.status === 'finished' && map.team2_score > map.team1_score;

                return (
                  <div key={map.id} className={`relative glass-card overflow-hidden ${map.status === 'live' ? 'ring-2 ring-red-500/40' : ''}`}>
                    {/* Map background */}
                    <div className="absolute inset-0">
                      <img
                        src={getMapThumbnail(map.map_name)}
                        alt={map.map_name}
                        className="w-full h-full object-cover opacity-20"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/80 to-background/90" />
                    </div>

                    <div className="relative p-6 flex items-center justify-between">
                      {/* Map info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                          <img
                            src={getMapThumbnail(map.map_name)}
                            alt={map.map_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground">
                            Mapa {map.map_number} — {getMapDisplayName(map.map_name)}
                          </p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${status.cls}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>

                      {/* Map score */}
                      <div className="text-center px-6">
                        <div className={`text-3xl font-black ${map.status === 'live' ? 'text-red-400' : ''}`}>
                          <span className={t1Won ? 'text-green-400' : ''}>{map.team1_score}</span>
                          <span className="text-muted-foreground mx-2">:</span>
                          <span className={t2Won ? 'text-green-400' : ''}>{map.team2_score}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1 gap-4">
                          <span>{match.team1?.name}</span>
                          <span>{match.team2?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Brak danych o mapach dla tego meczu</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default MatchDetails;
