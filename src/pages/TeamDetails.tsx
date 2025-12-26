import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Shield, GraduationCap } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { teams } from '@/data/mockData';
import { cn } from '@/lib/utils';

const TeamDetails = () => {
  const { id } = useParams();
  const team = teams.find((t) => t.id === id);

  if (!team) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Drużyna nie znaleziona</h1>
          <Button asChild variant="ghost">
            <Link to="/druzyny">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Wróć do listy drużyn
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const statusConfig = {
    ready: {
      label: 'Gotowa do turnieju',
      color: 'bg-primary/20 text-primary',
    },
    preparing: {
      label: 'W przygotowaniu',
      color: 'bg-yellow-500/20 text-yellow-500',
    },
  };

  const MemberCard = ({
    nick,
    role,
    type,
    index,
  }: {
    nick: string;
    role: string;
    type: 'player' | 'reserve' | 'coach';
    index: number;
  }) => {
    const typeConfig = {
      player: { icon: User, badge: 'Gracz', color: 'border-primary/30' },
      reserve: { icon: Shield, badge: 'Rezerwowy', color: 'border-yellow-500/30' },
      coach: { icon: GraduationCap, badge: 'Trener', color: 'border-accent/30' },
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
      <div
        className={cn(
          'glass-card p-4 border-l-4 opacity-0 animate-fade-in',
          config.color
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{nick}</h4>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {config.badge}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <HeroSection title={team.name} size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mb-2">
            <span className="text-4xl font-bold text-gradient">{team.name.charAt(0)}</span>
          </div>
          <span
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold',
              statusConfig[team.status].color
            )}
          >
            {statusConfig[team.status].label}
          </span>
        </div>
      </HeroSection>

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Button asChild variant="ghost" className="mb-8">
            <Link to="/druzyny">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Wszystkie drużyny
            </Link>
          </Button>

          {/* Players */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Gracze ({team.members.players.length}/5)
            </h3>
            <div className="grid gap-3">
              {team.members.players.map((player, index) => (
                <MemberCard
                  key={player.nick}
                  nick={player.nick}
                  role={player.role}
                  type="player"
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Reserves */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              Rezerwowi ({team.members.reserves.length}/2)
            </h3>
            {team.members.reserves.length > 0 ? (
              <div className="grid gap-3">
                {team.members.reserves.map((reserve, index) => (
                  <MemberCard
                    key={reserve.nick}
                    nick={reserve.nick}
                    role={reserve.role}
                    type="reserve"
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Brak rezerwowych</p>
            )}
          </div>

          {/* Coach */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              Trener
            </h3>
            <MemberCard
              nick={team.members.coach.nick}
              role={team.members.coach.role}
              type="coach"
              index={0}
            />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TeamDetails;
