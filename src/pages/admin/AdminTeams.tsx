import { useState, useEffect } from 'react';
import { Loader2, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type TeamStatus = 'preparing' | 'ready' | 'registered';
type SwissStatus = 'advanced' | 'eliminated' | null;

interface Team {
  id: string;
  name: string;
  status: TeamStatus;
  swiss_status: SwissStatus;
  is_paid: boolean;
  created_at: string;
  owner?: { display_name: string | null; email: string } | null;
  member_count?: number;
}

const AdminTeams = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);
          return { ...team, member_count: count || 0 };
        })
      );

      setTeams(teamsWithCounts as Team[]);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć drużynę "${name}"?`)) return;

    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Drużyna usunięta' });
      fetchTeams();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const togglePaid = async (team: Team) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_paid: !team.is_paid })
        .eq('id', team.id);
      if (error) throw error;
      fetchTeams();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const setSwissStatus = async (teamId: string, swissStatus: SwissStatus) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ swiss_status: swissStatus } as any)
        .eq('id', teamId);
      if (error) throw error;
      fetchTeams();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const statusLabels: Record<TeamStatus, string> = {
    preparing: 'W przygotowaniu',
    ready: 'Gotowa',
    registered: 'Zarejestrowana',
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Drużyny</h1>
        <p className="text-muted-foreground">Zarządzaj drużynami w turnieju</p>
      </div>

      {/* Teams Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-muted-foreground font-medium">Nazwa</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Członkowie</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Swiss</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Opłacona</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Data utworzenia</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-border/50 hover:bg-secondary/20">
                <td className="p-4">
                  <span className="font-semibold text-foreground">{team.name}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {team.member_count}
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-semibold',
                    team.status === 'ready' ? 'bg-primary/20 text-primary' :
                    team.status === 'registered' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {statusLabels[team.status]}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button
                      variant={team.swiss_status === 'advanced' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSwissStatus(team.id, team.swiss_status === 'advanced' ? null : 'advanced')}
                      className={cn('text-xs px-2', team.swiss_status === 'advanced' && 'bg-green-600 hover:bg-green-700')}
                    >
                      AWANS
                    </Button>
                    <Button
                      variant={team.swiss_status === 'eliminated' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSwissStatus(team.id, team.swiss_status === 'eliminated' ? null : 'eliminated')}
                      className={cn('text-xs px-2', team.swiss_status === 'eliminated' && 'bg-red-600 hover:bg-red-700')}
                    >
                      ODPADA
                    </Button>
                  </div>
                </td>
                <td className="p-4">
                  <Button
                    variant={team.is_paid ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePaid(team)}
                    className={team.is_paid ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {team.is_paid ? 'Tak' : 'Nie'}
                  </Button>
                </td>
                <td className="p-4 text-muted-foreground">
                  {new Date(team.created_at).toLocaleDateString('pl-PL')}
                </td>
                <td className="p-4">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTeam(team.id, team.name)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teams.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Brak drużyn</p>
        )}
      </div>
    </div>
  );
};

export default AdminTeams;
