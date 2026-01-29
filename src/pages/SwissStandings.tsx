import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { SectionTitle } from '@/components/shared/SectionTitle';
import { Trophy, Medal, TrendingUp, Users } from 'lucide-react';

interface Standing {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  points: number;
  round_difference: number;
}

const SwissStandings = () => {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('swiss_standings').select('*'),
        supabase.from('matches').select('swiss_round').not('swiss_round', 'is', null).order('swiss_round', { ascending: false }).limit(1),
      ]);

      if (standingsRes.error) throw standingsRes.error;
      setStandings((standingsRes.data || []) as Standing[]);

      if (matchesRes.data && matchesRes.data.length > 0) {
        setCurrentRound(matchesRes.data[0].swiss_round || 0);
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-gray-300';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getPositionBg = (position: number) => {
    if (position < 8) return 'bg-green-500/10 border-green-500/20';
    return 'bg-secondary/30 border-border/50';
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">Ładowanie rankingu...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <SectionTitle 
          title="Ranking Szwajcarski" 
          subtitle={currentRound > 0 ? `Po rundzie ${currentRound}` : 'Faza grupowa'}
        />

        {standings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Brak danych</h3>
            <p className="text-muted-foreground">
              Ranking pojawi się po rozegraniu pierwszych meczów fazy szwajcarskiej.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {standings.slice(0, 3).map((standing, index) => (
                <div 
                  key={standing.team_id}
                  className={`glass-card p-6 text-center ${index === 0 ? 'md:order-2 ring-2 ring-yellow-400/50' : index === 1 ? 'md:order-1' : 'md:order-3'}`}
                >
                  <div className="flex justify-center mb-3">
                    {index === 0 ? (
                      <Trophy className="w-10 h-10 text-yellow-400" />
                    ) : (
                      <Medal className={`w-8 h-8 ${getMedalColor(index)}`} />
                    )}
                  </div>
                  {standing.logo_url && (
                    <img 
                      src={standing.logo_url} 
                      alt={standing.team_name || ''} 
                      className="w-16 h-16 mx-auto rounded-lg object-cover mb-3"
                    />
                  )}
                  <div className="text-2xl font-bold text-foreground mb-1">
                    #{index + 1}
                  </div>
                  <div className="text-lg font-semibold text-foreground mb-2">
                    {standing.team_name}
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {standing.points} pkt
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {standing.wins}W - {standing.losses}L
                  </div>
                </div>
              ))}
            </div>

            {/* Full standings table */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Pełny ranking</h3>
                <span className="text-sm text-muted-foreground ml-auto">
                  Top 8 awansuje do playoff
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="text-left p-4 text-muted-foreground font-medium">#</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Drużyna</th>
                      <th className="text-center p-4 text-muted-foreground font-medium">W</th>
                      <th className="text-center p-4 text-muted-foreground font-medium">L</th>
                      <th className="text-center p-4 text-muted-foreground font-medium">PKT</th>
                      <th className="text-center p-4 text-muted-foreground font-medium">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing, index) => (
                      <tr 
                        key={standing.team_id} 
                        className={`border-b ${getPositionBg(index)} transition-colors hover:bg-secondary/40`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Medal className={`w-4 h-4 ${getMedalColor(index)}`} />
                            )}
                            <span className="font-bold text-foreground">{index + 1}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {standing.logo_url ? (
                              <img 
                                src={standing.logo_url} 
                                alt={standing.team_name || ''} 
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                                <Users className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium text-foreground">{standing.team_name}</span>
                            {index < 8 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                                Playoff
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-medium text-green-400">{standing.wins}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-medium text-red-400">{standing.losses}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-primary text-lg">{standing.points}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-medium ${standing.round_difference > 0 ? 'text-green-400' : standing.round_difference < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {standing.round_difference > 0 ? '+' : ''}{standing.round_difference}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/20"></div>
                <span>Awans do playoff</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">W</span> - Wygrane
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">L</span> - Przegrane
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">PKT</span> - Punkty (3 za wygraną)
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">+/-</span> - Różnica rund
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default SwissStandings;
