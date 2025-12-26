import { ArrowRight, Trophy, Users, Calendar, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { MatchCard } from '@/components/shared/MatchCard';
import { SectionTitle } from '@/components/shared/SectionTitle';
import { SponsorSlider } from '@/components/shared/SponsorSlider';
import { Button } from '@/components/ui/button';
import { upcomingMatches, recentMatches, sponsors } from '@/data/mockData';

const stats = [
  { icon: Trophy, value: '₿50K', label: 'Pula nagród' },
  { icon: Users, value: '32', label: 'Drużyny' },
  { icon: Calendar, value: '7', label: 'Dni turnieju' },
  { icon: Zap, value: '64', label: 'Mecze' },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <HeroSection
        title="Feather Cup 2024"
        subtitle="Dołącz do największego turnieju esportowego tego roku. Rywalizuj z najlepszymi, zdobywaj nagrody i stań się legendą."
        size="lg"
        showBg
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="xl" className="group">
            Zapisz swoją drużynę
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="glass" size="xl" asChild>
            <Link to="/mecze">Zobacz harmonogram</Link>
          </Button>
        </div>
      </HeroSection>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50">
        <div className="container max-w-6xl mx-auto px-4">
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
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <SectionTitle
              title="Nadchodzące mecze"
              subtitle="Nie przegap kolejnych emocji"
            />
            <Button variant="ghost" asChild className="group">
              <Link to="/mecze">
                Zobacz wszystkie
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {upcomingMatches.slice(0, 3).map((match, index) => (
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
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        
        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          <div className="glass-card p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient-hero">
              Gotowy na wyzwanie?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Zarejestruj swoją drużynę już dziś i weź udział w Feather Cup 2024. 
              Nagrody, sława i niezapomniane emocje czekają!
            </p>
            <Button variant="cta" size="xl" className="group">
              Zapisz swoją drużynę
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Matches */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <SectionTitle
              title="Ostatnie wyniki"
              subtitle="Zobacz jak zakończyły się poprzednie mecze"
            />
            <Button variant="ghost" asChild className="group">
              <Link to="/wyniki">
                Wszystkie wyniki
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {recentMatches.slice(0, 3).map((match, index) => (
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
      </section>

      {/* Sponsors */}
      <SponsorSlider sponsors={sponsors} />
    </Layout>
  );
};

export default Index;
