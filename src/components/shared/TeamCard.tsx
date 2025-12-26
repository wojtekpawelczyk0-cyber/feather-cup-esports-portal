import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  id: string;
  name: string;
  logo?: string;
  memberCount: number;
  status: 'ready' | 'preparing';
  className?: string;
}

export const TeamCard = ({
  id,
  name,
  logo,
  memberCount,
  status,
  className,
}: TeamCardProps) => {
  const statusConfig = {
    ready: {
      label: 'Gotowa',
      color: 'bg-primary/20 text-primary',
    },
    preparing: {
      label: 'W przygotowaniu',
      color: 'bg-yellow-500/20 text-yellow-500',
    },
  };

  return (
    <Link to={`/druzyny/${id}`} className={cn('team-card block group', className)}>
      {/* Team Logo */}
      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
        {logo ? (
          <img src={logo} alt={name} className="w-14 h-14 object-contain" />
        ) : (
          <span className="text-3xl font-bold text-gradient">{name.charAt(0)}</span>
        )}
      </div>

      {/* Team Info */}
      <div className="text-center">
        <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>{memberCount} członków</span>
        </div>
        <span
          className={cn(
            'inline-block px-3 py-1 rounded-full text-xs font-semibold',
            statusConfig[status].color
          )}
        >
          {statusConfig[status].label}
        </span>
      </div>
    </Link>
  );
};
