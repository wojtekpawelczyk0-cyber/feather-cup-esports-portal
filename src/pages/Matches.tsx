import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { useMatches } from '@/hooks/useMatches';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Matches = () => {
  const { matches, loading } = useMatches();

  const formatMatchForCard = (match: any) => {
    const date = new Date(match.scheduled_at);
    return {
      id: match.id,
      team1: {
        name: match.team1?.name || 'TBD',
        logo: match.team1?.logo_url || undefined,
        score: match.team1_score ?? undefined,
      },
      team2: {
        name: match.team2?.name || 'TBD',
        logo: match.team2?.logo_url || undefined,
        score: match.team2_score ?? undefined,
      },
      date: format(date, 'd MMM', { locale: pl }),
      time: format(date, 'HH:mm'),
      status: match.status === 'scheduled' ? 'upcoming' as const : match.status === 'live' ? 'live' as const : 'finished' as const,
    };
  };

  const upcomingMatches = matches.filter((m) => m.status === 'scheduled' || m.status === 'live');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  return (
    <Layout>
      <HeroSection
        title="Harmonogram meczów"
        subtitle="Śledź nadchodzące mecze i bądź na bieżąco z rozgrywkami Feather Cup"
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
              {/* Upcoming Matches */}
              {upcomingMatches.length > 0 && (
                <div className="mb-12">
                  <h2 className="section-title mb-6">Nadchodzące mecze</h2>
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
                  <h2 className="section-title mb-6">Zakończone mecze</h2>
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
                    Brak meczów do wyświetlenia. Harmonogram zostanie wkrótce uzupełniony!
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

export default Matches;
