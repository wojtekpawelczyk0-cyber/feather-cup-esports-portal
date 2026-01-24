import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Shield, GraduationCap, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { useTeamDetails } from '@/hooks/useTeams';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const TeamDetails = () => {
  const { id } = useParams();
  const { team, members, loading } = useTeamDetails(id);
  const { t } = useLanguage();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">{t('team.not_found')}</h1>
          <Button asChild variant="ghost">
            <Link to="/druzyny">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('team.back_to_list')}
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const statusConfig = {
    ready: {
      label: t('team.status.ready_tournament'),
      color: 'bg-primary/20 text-primary',
    },
    preparing: {
      label: t('teams.status.preparing'),
      color: 'bg-yellow-500/20 text-yellow-500',
    },
    registered: {
      label: t('teams.status.registered'),
      color: 'bg-green-500/20 text-green-500',
    },
  };

  const players = members.filter(m => m.role === 'player');
  const reserves = members.filter(m => m.role === 'reserve');
  const coaches = members.filter(m => m.role === 'coach');

  const MemberCard = ({
    nickname,
    position,
    type,
    index,
  }: {
    nickname: string;
    position: string | null;
    type: 'player' | 'reserve' | 'coach';
    index: number;
  }) => {
    const typeConfig = {
      player: { icon: User, badge: t('team.role.player'), color: 'border-primary/30' },
      reserve: { icon: Shield, badge: t('team.role.reserve'), color: 'border-yellow-500/30' },
      coach: { icon: GraduationCap, badge: t('team.role.coach'), color: 'border-accent/30' },
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
            <h4 className="font-semibold text-foreground">{nickname}</h4>
            <p className="text-sm text-muted-foreground">{position || '-'}</p>
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
          <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mb-2 overflow-hidden">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-16 h-16 object-contain" />
            ) : (
              <span className="text-4xl font-bold text-gradient">{team.name.charAt(0)}</span>
            )}
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
              {t('team.all_teams')}
            </Link>
          </Button>

          {/* Players */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t('team.players')} ({players.length}/5)
            </h3>
            {players.length > 0 ? (
              <div className="grid gap-3">
                {players.map((player, index) => (
                  <MemberCard
                    key={player.id}
                    nickname={player.nickname}
                    position={player.position}
                    type="player"
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('team.no_players')}</p>
            )}
          </div>

          {/* Reserves */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              {t('team.reserves')} ({reserves.length}/2)
            </h3>
            {reserves.length > 0 ? (
              <div className="grid gap-3">
                {reserves.map((reserve, index) => (
                  <MemberCard
                    key={reserve.id}
                    nickname={reserve.nickname}
                    position={reserve.position}
                    type="reserve"
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('team.no_reserves')}</p>
            )}
          </div>

          {/* Coach */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              {t('team.coach')} ({coaches.length}/1)
            </h3>
            {coaches.length > 0 ? (
              <div className="grid gap-3">
                {coaches.map((coach, index) => (
                  <MemberCard
                    key={coach.id}
                    nickname={coach.nickname}
                    position={coach.position}
                    type="coach"
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('team.no_coach')}</p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TeamDetails;
