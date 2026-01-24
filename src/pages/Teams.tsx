import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { TeamCard } from '@/components/shared/TeamCard';
import { useTeams } from '@/hooks/useTeams';
import { useLanguage } from '@/contexts/LanguageContext';

const Teams = () => {
  const { teams, loading } = useTeams();
  const { t } = useLanguage();

  return (
    <Layout>
      <HeroSection
        title={t('teams.title')}
        subtitle={t('teams.subtitle')}
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : teams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <TeamCard
                    id={team.id}
                    name={team.name}
                    logo={team.logo_url || undefined}
                    memberCount={0}
                    status={team.status === 'registered' ? 'ready' : team.status}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                {t('teams.no_teams')}
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Teams;
