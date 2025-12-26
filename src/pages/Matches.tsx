import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { allMatches } from '@/data/mockData';

const Matches = () => {
  // Sort matches: upcoming first (by date), then finished
  const sortedMatches = [...allMatches].sort((a, b) => {
    if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
    if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
    return 0;
  });

  const upcomingMatches = sortedMatches.filter((m) => m.status === 'upcoming');
  const finishedMatches = sortedMatches.filter((m) => m.status === 'finished');

  return (
    <Layout>
      <HeroSection
        title="Harmonogram meczów"
        subtitle="Śledź nadchodzące mecze i bądź na bieżąco z rozgrywkami Feather Cup"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
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
                    <MatchCard {...match} />
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
                    <MatchCard {...match} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Matches;
