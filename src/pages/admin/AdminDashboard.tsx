import { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalTeams: number;
  readyTeams: number;
  totalMatches: number;
  upcomingMatches: number;
  completedMatches: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalTeams: 0,
    readyTeams: 0,
    totalMatches: 0,
    upcomingMatches: 0,
    completedMatches: 0,
  });
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentMatches();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: teams } = await supabase.from('teams').select('status');
      const { data: matches } = await supabase.from('matches').select('status');

      setStats({
        totalTeams: teams?.length || 0,
        readyTeams: teams?.filter((t) => t.status === 'ready' || t.status === 'registered').length || 0,
        totalMatches: matches?.length || 0,
        upcomingMatches: matches?.filter((m) => m.status === 'scheduled').length || 0,
        completedMatches: matches?.filter((m) => m.status === 'finished').length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentMatches = async () => {
    try {
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id(name),
          team2:team2_id(name)
        `)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      setRecentMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const statCards = [
    { label: 'Drużyny', value: stats.totalTeams, icon: Users, color: 'text-blue-400' },
    { label: 'Gotowe drużyny', value: stats.readyTeams, icon: Trophy, color: 'text-green-400' },
    { label: 'Wszystkie mecze', value: stats.totalMatches, icon: Calendar, color: 'text-purple-400' },
    { label: 'Nadchodzące', value: stats.upcomingMatches, icon: Clock, color: 'text-yellow-400' },
    { label: 'Zakończone', value: stats.completedMatches, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Przegląd turnieju Feather Cup</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Matches */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Ostatnie mecze</h2>
        {recentMatches.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Brak meczów</p>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-foreground">
                    {match.team1?.name || 'TBD'}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-semibold text-foreground">
                    {match.team2?.name || 'TBD'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {match.status === 'finished' && (
                    <span className="font-bold text-primary">
                      {match.team1_score} : {match.team2_score}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {new Date(match.scheduled_at).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
