import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Team {
  name: string;
  logo?: string;
  score?: number;
}

interface MatchCardProps {
  team1: Team;
  team2: Team;
  date: string;
  time: string;
  status: 'upcoming' | 'live' | 'finished';
  className?: string;
}

export const MatchCard = ({
  team1,
  team2,
  date,
  time,
  status,
  className,
}: MatchCardProps) => {
  const { t } = useLanguage();

  const statusColors = {
    upcoming: 'bg-primary/20 text-primary',
    live: 'bg-destructive/20 text-destructive animate-pulse',
    finished: 'bg-muted text-muted-foreground',
  };

  const statusLabels = {
    upcoming: t('matches.status.upcoming'),
    live: t('matches.status.live'),
    finished: t('matches.status.finished'),
  };

  return (
    <div className={cn('match-card p-5', className)}>
      {/* Status Badge */}
      <div className="flex justify-between items-center mb-4">
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold',
            statusColors[status]
          )}
        >
          {statusLabels[status]}
        </span>
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {time}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4">
        {/* Team 1 */}
        <div className="flex-1 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
            {team1.logo ? (
              <img src={team1.logo} alt={team1.name} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {team1.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="font-semibold text-foreground truncate">{team1.name}</span>
        </div>

        {/* Score or VS */}
        <div className="flex items-center gap-3 px-4">
          {status === 'finished' ? (
            <>
              <span
                className={cn(
                  'text-2xl font-bold',
                  team1.score! > team2.score! ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {team1.score}
              </span>
              <span className="text-muted-foreground">:</span>
              <span
                className={cn(
                  'text-2xl font-bold',
                  team2.score! > team1.score! ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {team2.score}
              </span>
            </>
          ) : (
            <span className="text-xl font-bold text-muted-foreground">{t('common.vs')}</span>
          )}
        </div>

        {/* Team 2 */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <span className="font-semibold text-foreground truncate text-right">{team2.name}</span>
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
            {team2.logo ? (
              <img src={team2.logo} alt={team2.name} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {team2.name.charAt(0)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
