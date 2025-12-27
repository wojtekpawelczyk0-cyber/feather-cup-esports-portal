import { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, TrendingUp, Clock, DollarSign, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface Stats {
  totalTeams: number;
  readyTeams: number;
  totalMatches: number;
  upcomingMatches: number;
  completedMatches: number;
}

interface TournamentEarnings {
  paidTeams: number;
  totalEarnings: number;
  entryFee: number;
}

interface DailyVisits {
  date: string;
  visits: number;
}

const AdminDashboard = () => {
  const { userRoles } = useAuth();
  const isOwner = userRoles.includes('owner');
  
  const [stats, setStats] = useState<Stats>({
    totalTeams: 0,
    readyTeams: 0,
    totalMatches: 0,
    upcomingMatches: 0,
    completedMatches: 0,
  });
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [tournamentEarnings, setTournamentEarnings] = useState<TournamentEarnings | null>(null);

  const [dailyVisits, setDailyVisits] = useState<DailyVisits[]>([]);

  // Entry fee in grosze (100 PLN = 10000 groszy)
  const ENTRY_FEE = 10000;

  useEffect(() => {
    fetchStats();
    fetchRecentMatches();
    if (isOwner) {
      fetchTournamentEarnings();
      fetchDailyVisits();
    }
  }, [isOwner]);

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

  const fetchTournamentEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .eq('is_paid', true);

      if (error) throw error;

      const paidTeams = data?.length || 0;
      setTournamentEarnings({
        paidTeams,
        totalEarnings: paidTeams * ENTRY_FEE,
        entryFee: ENTRY_FEE,
      });
    } catch (error) {
      console.error('Error fetching tournament earnings:', error);
    }
  };

  const fetchDailyVisits = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('page_visits')
        .select('visited_at')
        .gte('visited_at', sevenDaysAgo.toISOString());

      if (data) {
        // Group by day
        const visitsByDay: Record<string, number> = {};
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          visitsByDay[dateStr] = 0;
        }

        // Count visits
        data.forEach((visit) => {
          const dateStr = new Date(visit.visited_at).toISOString().split('T')[0];
          if (visitsByDay[dateStr] !== undefined) {
            visitsByDay[dateStr]++;
          }
        });

        const chartData = Object.entries(visitsByDay).map(([date, visits]) => ({
          date: new Date(date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }),
          visits,
        }));

        setDailyVisits(chartData);
      }
    } catch (error) {
      console.error('Error fetching daily visits:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const statCards = [
    { label: 'Drużyny', value: stats.totalTeams, icon: Users, color: 'text-blue-400' },
    { label: 'Gotowe drużyny', value: stats.readyTeams, icon: Trophy, color: 'text-green-400' },
    { label: 'Wszystkie mecze', value: stats.totalMatches, icon: Calendar, color: 'text-purple-400' },
    { label: 'Nadchodzące', value: stats.upcomingMatches, icon: Clock, color: 'text-yellow-400' },
    { label: 'Zakończone', value: stats.completedMatches, icon: TrendingUp, color: 'text-primary' },
  ];

  const chartConfig = {
    visits: {
      label: 'Odwiedziny',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Przegląd turnieju Feather Cup</p>
      </div>

      {/* Owner Stats - Stripe & Analytics */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Visits Chart */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Odwiedziny (7 dni)</h2>
            </div>
            {dailyVisits.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={dailyVisits}>
                  <defs>
                    <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="hsl(var(--primary))"
                    fill="url(#fillVisits)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Brak danych o odwiedzinach
              </div>
            )}
          </div>

          {/* Tournament Earnings */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-foreground">Wpływy z turnieju</h2>
            </div>
            {tournamentEarnings ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Łączne wpływy</p>
                  <p className="text-3xl font-bold text-green-400">
                    {formatCurrency(tournamentEarnings.totalEarnings, 'pln')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Opłacone drużyny</p>
                    <p className="text-2xl font-bold text-primary">
                      {tournamentEarnings.paidTeams}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">Wpisowe</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(tournamentEarnings.entryFee, 'pln')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Ładowanie...
              </div>
            )}
          </div>
        </div>
      )}

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
