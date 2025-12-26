import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { TeamCard } from '@/components/shared/TeamCard';
import { teams } from '@/data/mockData';

const Teams = () => {
  return (
    <Layout>
      <HeroSection
        title="Drużyny"
        subtitle="Poznaj wszystkie drużyny biorące udział w Feather Cup 2024"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <TeamCard {...team} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Teams;
