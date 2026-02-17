import { useState } from 'react';
import { Loader2, LayoutGrid, List, GitBranch } from 'lucide-react';
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

const Matches = () => {
  const { matches, loading } = useMatches();
  const { t, language } = useLanguage();
  const [view, setView] = useState<'groupA' | 'groupB' | 'bracket' | 'list'>('groupA');

  const dateLocale = language === 'pl' ? pl : enUS;

  const formatMatchForCard = (match: any) => {
    const hasDate = !!match.scheduled_at;
    const date = hasDate ? new Date(match.scheduled_at) : null;
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
      date: date ? format(date, 'd MMM', { locale: dateLocale }) : t('matches.no_date') || 'Brak terminu',
      time: date ? format(date, 'HH:mm') : '-',
      status: match.status === 'scheduled' ? 'upcoming' as const : match.status === 'live' ? 'live' as const : 'finished' as const,
    };
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
              variant={view === 'groupA' ? 'default' : 'outline'}
              onClick={() => setView('groupA')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Grupa A
            </Button>
            <Button
              variant={view === 'groupB' ? 'default' : 'outline'}
              onClick={() => setView('groupB')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Grupa B
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
              {/* Grupa A view */}
              {view === 'groupA' && (
                <div className="glass-card p-6 overflow-hidden">
                  <SwissBracket group="A" />
                </div>
              )}

              {/* Grupa B view */}
              {view === 'groupB' && (
                <div className="glass-card p-6 overflow-hidden">
                  <SwissBracket group="B" />
                </div>
              )}

              {/* Playoff Bracket view */}
              {view === 'bracket' && (
                <div className="glass-card p-6 overflow-hidden">
                  <TournamentBracket />
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
