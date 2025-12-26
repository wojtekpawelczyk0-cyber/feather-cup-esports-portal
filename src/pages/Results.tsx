import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { allMatches } from '@/data/mockData';

const Results = () => {
  const finishedMatches = allMatches.filter((m) => m.status === 'finished');

  return (
    <Layout>
      <HeroSection
        title="Wyniki meczów"
        subtitle="Sprawdź wszystkie zakończone mecze i rezultaty rozgrywek"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid gap-4">
            {finishedMatches.map((match, index) => (
              <div
                key={match.id}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MatchCard {...match} />
              </div>
            ))}
          </div>

          {finishedMatches.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Brak zakończonych meczów. Turniej jeszcze się nie rozpoczął!
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Results;
