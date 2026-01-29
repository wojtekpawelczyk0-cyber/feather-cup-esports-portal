import { ArrowRight, Trophy, Users, Calendar, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { SectionTitle } from '@/components/shared/SectionTitle';
import { SponsorSlider } from '@/components/shared/SponsorSlider';
import { Button } from '@/components/ui/button';
import { useMatches } from '@/hooks/useMatches';
import { useTeams } from '@/hooks/useTeams';
import { useSponsors } from '@/hooks/useSponsors';
import { useTournamentSettings } from '@/hooks/useTournamentSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

const Index = () => {
  const { matches, loading: matchesLoading } = useMatches();
  const { teams } = useTeams();
  const { sponsors, loading: sponsorsLoading } = useSponsors();
  const { settings, loading: settingsLoading } = useTournamentSettings();
  const { t, language } = useLanguage();

  const dateLocale = language === 'pl' ? pl : enUS;

  const upcomingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'live').slice(0, 3);
  const recentMatches = matches.filter(m => m.status === 'finished').slice(0, 3);

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

  const stats = [
    { icon: Trophy, value: settings.prize_pool, label: t('home.prize_pool') },
    { icon: Users, value: teams.length > 0 ? String(teams.length) : settings.max_teams, label: t('home.teams') },
    { icon: Calendar, value: settings.tournament_days, label: t('home.tournament_days') },
    { icon: Zap, value: matches.length > 0 ? String(matches.length) : settings.total_matches, label: t('home.matches') },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <HeroSection
        title={settings.hero_title}
        subtitle={settings.hero_subtitle}
        size="lg"
        showBg
        backgroundImage={settings.hero_image_url || undefined}
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="xl" className="group" asChild>
            <Link to="/moja-druzyna">
              {t('home.register_team')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button variant="glass" size="xl" asChild>
            <Link to="/mecze">{t('home.view_schedule')}</Link>
          </Button>
        </div>
      </HeroSection>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50">
        <div className="container max-w-6xl mx-auto px-4">
          {settingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <SectionTitle
              title={t('home.upcoming_matches')}
              subtitle={t('home.upcoming_subtitle')}
            />
            <Button variant="ghost" asChild className="group">
              <Link to="/mecze">
                {t('home.view_all')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {matchesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : upcomingMatches.length > 0 ? (
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
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('home.no_upcoming')}
            </p>
          )}
        </div>
      </section>

      {/* Recent Matches */}
      <section className="py-16 md:py-24 bg-secondary/20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <SectionTitle
              title={t('home.recent_results')}
              subtitle={t('home.recent_subtitle')}
            />
            <Button variant="ghost" asChild className="group">
              <Link to="/wyniki">
                {t('home.all_results')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {matchesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="grid gap-4">
              {recentMatches.map((match, index) => (
                <div
                  key={match.id}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <MatchCard {...formatMatchForCard(match)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('home.no_finished')}
            </p>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        
        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          <div className="glass-card p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient-hero">
              {t('home.cta_title')}
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              {t('home.cta_desc')} {settings.tournament_name}. 
              {t('home.cta_suffix')}
            </p>
            <Button variant="cta" size="xl" className="group" asChild>
              <Link to="/moja-druzyna">
                {t('home.register_team')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      {!sponsorsLoading && sponsors.length > 0 && (
        <SponsorSlider sponsors={sponsors.map(s => ({
          id: s.id,
          name: s.name,
          logo: s.logo_url || 'https://placehold.co/100x100/1a1a2e/00d4ff?text=' + s.name.charAt(0),
        }))} />
      )}
    </Layout>
  );
};

export default Index;
