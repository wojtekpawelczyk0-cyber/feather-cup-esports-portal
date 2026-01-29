import { useState, useEffect } from 'react';
import { Loader2, LayoutGrid, List, Medal, Trophy, Users, TrendingUp, GitBranch } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { useMatches } from '@/hooks/useMatches';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import TournamentBracket from '@/components/bracket/TournamentBracket';
import SwissBracket from '@/components/bracket/SwissBracket';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Standing {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  points: number;
  round_difference: number;
}

const Matches = () => {
  const { matches, loading } = useMatches();
  const { t, language } = useLanguage();
  const [view, setView] = useState<'swiss' | 'bracket' | 'list' | 'ranking'>('swiss');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [standingsLoading, setStandingsLoading] = useState(true);

  const dateLocale = language === 'pl' ? pl : enUS;

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('swiss_standings').select('*'),
        supabase.from('matches').select('swiss_round').not('swiss_round', 'is', null).order('swiss_round', { ascending: false }).limit(1),
      ]);

      if (standingsRes.data) {
        setStandings(standingsRes.data as Standing[]);
      }
      if (matchesRes.data && matchesRes.data.length > 0) {
        setCurrentRound(matchesRes.data[0].swiss_round || 0);
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
    } finally {
      setStandingsLoading(false);
    }
  };

  const formatMatchForCard = (match: any) => {
    const date = new Date(match.scheduled_at);
    return {
      id: match.id,
      team1: {
        name: match.team1?.name || t('common.tbd'),
        logo: match.team1?.logo_url || undefined,
        score: match.team1_score ?? undefined,
      },
      team2: {
        name: match.team2?.name || t('common.tbd'),
        logo: match.team2?.logo_url || undefined,
        score: match.team2_score ?? undefined,
      },
      date: format(date, 'd MMM', { locale: dateLocale }),
      time: format(date, 'HH:mm'),
      status: match.status === 'scheduled' ? 'upcoming' as const : match.status === 'live' ? 'live' as const : 'finished' as const,
    };
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

  const upcomingMatches = matches.filter((m) => m.status === 'scheduled' || m.status === 'live');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  return (
    <Layout>
      <HeroSection
        title={t('matches.title')}
        subtitle={t('matches.subtitle')}
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* View toggle */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <Button
              variant={view === 'swiss' ? 'default' : 'outline'}
              onClick={() => setView('swiss')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Swiss Stage
            </Button>
            <Button
              variant={view === 'bracket' ? 'default' : 'outline'}
              onClick={() => setView('bracket')}
              className="gap-2"
            >
              <GitBranch className="w-4 h-4" />
              Playoff
            </Button>
            <Button
              variant={view === 'ranking' ? 'default' : 'outline'}
              onClick={() => setView('ranking')}
              className="gap-2"
            >
              <Medal className="w-4 h-4" />
              Tabela
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              {t('matches.list')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Swiss Stage view */}
              {view === 'swiss' && (
                <div className="glass-card p-6 overflow-hidden">
                  <SwissBracket />
                </div>
              )}

              {/* Playoff Bracket view */}
              {view === 'bracket' && (
                <div className="glass-card p-6 overflow-hidden">
                  <TournamentBracket />
                </div>
              )}

              {/* Ranking view */}
              {view === 'ranking' && (
                <div className="space-y-6">
                  {standingsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : standings.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">Brak danych</h3>
                      <p className="text-muted-foreground">
                        Tabela pojawi się po rozegraniu pierwszych meczów fazy szwajcarskiej.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Top 3 podium */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <h3 className="font-semibold text-foreground">Tabela szwajcarska</h3>
                          {currentRound > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (po rundzie {currentRound})
                            </span>
                          )}
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
                    </>
                  )}
                </div>
              )}

              {/* List view */}
              {view === 'list' && (
                <>
                  {/* Upcoming Matches */}
                  {upcomingMatches.length > 0 && (
                    <div className="mb-12">
                      <h2 className="section-title mb-6">{t('matches.upcoming')}</h2>
                      <div className="grid gap-4">
                        {upcomingMatches.map((match, index) => (
                          <div
                            key={match.id}
                            className="opacity-0 animate-fade-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <MatchCard {...formatMatchForCard(match)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finished Matches */}
                  {finishedMatches.length > 0 && (
                    <div>
                      <h2 className="section-title mb-6">{t('matches.finished')}</h2>
                      <div className="grid gap-4">
                        {finishedMatches.map((match, index) => (
                          <div
                            key={match.id}
                            className="opacity-0 animate-fade-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <MatchCard {...formatMatchForCard(match)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matches.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground text-lg">
                        {t('matches.no_matches')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Matches;
