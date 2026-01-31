import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Copy, ExternalLink, Users, Swords, Loader2, Trophy, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type AppRole = 'owner' | 'admin' | 'commentator' | 'support';

interface OutletContext {
  userRoles: AppRole[];
}

interface VetoSession {
  id: string;
  match_id: string | null;
  team1_user_id: string;
  team2_user_id: string;
  is_active: boolean;
  created_at: string;
  session_code: string;
  team1_data?: TeamData;
  team2_data?: TeamData;
}

interface TeamData {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  status: string;
  member_count: number;
}

const AdminMapVeto = () => {
  const { userRoles } = useOutletContext<OutletContext>();
  const [sessions, setSessions] = useState<VetoSession[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [selectedTeam1, setSelectedTeam1] = useState('');
  const [selectedTeam2, setSelectedTeam2] = useState('');

  const isOwner = userRoles.includes('owner');

  useEffect(() => {
    if (isOwner) {
      fetchSessions();
      fetchTeams();
    }
  }, [isOwner]);

  const fetchTeams = async () => {
    try {
      // Fetch all teams with their owners
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, owner_id, status')
        .not('owner_id', 'is', null)
        .order('name');

      if (error) throw error;

      // Fetch member counts and owner profiles
      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team) => {
          const [membersResult, profileResult] = await Promise.all([
            supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
            supabase.from('profiles').select('display_name, avatar_url').eq('user_id', team.owner_id!).maybeSingle()
          ]);

          return {
            id: team.id,
            name: team.name,
            logo_url: team.logo_url,
            owner_id: team.owner_id!,
            owner_name: profileResult.data?.display_name || null,
            owner_avatar: profileResult.data?.avatar_url || null,
            status: team.status,
            member_count: membersResult.count || 0
          };
        })
      );

      setTeams(teamsWithDetails);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch team data for sessions
      const sessionsWithTeams = await Promise.all(
        (data || []).map(async (session) => {
          // Find teams by owner_id
          const [team1Result, team2Result] = await Promise.all([
            supabase.from('teams').select('id, name, logo_url, owner_id, status').eq('owner_id', session.team1_user_id).maybeSingle(),
            supabase.from('teams').select('id, name, logo_url, owner_id, status').eq('owner_id', session.team2_user_id).maybeSingle()
          ]);

          const [profile1, profile2, members1, members2] = await Promise.all([
            supabase.from('profiles').select('display_name, avatar_url').eq('user_id', session.team1_user_id).maybeSingle(),
            supabase.from('profiles').select('display_name, avatar_url').eq('user_id', session.team2_user_id).maybeSingle(),
            team1Result.data ? supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team1Result.data.id) : { count: 0 },
            team2Result.data ? supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team2Result.data.id) : { count: 0 }
          ]);

          return {
            ...session,
            team1_data: team1Result.data ? {
              id: team1Result.data.id,
              name: team1Result.data.name,
              logo_url: team1Result.data.logo_url,
              owner_id: team1Result.data.owner_id!,
              owner_name: profile1.data?.display_name || null,
              owner_avatar: profile1.data?.avatar_url || null,
              status: team1Result.data.status,
              member_count: members1.count || 0
            } : undefined,
            team2_data: team2Result.data ? {
              id: team2Result.data.id,
              name: team2Result.data.name,
              logo_url: team2Result.data.logo_url,
              owner_id: team2Result.data.owner_id!,
              owner_name: profile2.data?.display_name || null,
              owner_avatar: profile2.data?.avatar_url || null,
              status: team2Result.data.status,
              member_count: members2.count || 0
            } : undefined
          };
        })
      );

      setSessions(sessionsWithTeams);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeam1Data = () => teams.find(t => t.id === selectedTeam1);
  const getSelectedTeam2Data = () => teams.find(t => t.id === selectedTeam2);

  const createSession = async () => {
    const team1 = getSelectedTeam1Data();
    const team2 = getSelectedTeam2Data();

    if (!team1 || !team2) {
      toast({
        title: 'Błąd',
        description: 'Wybierz obie drużyny',
        variant: 'destructive'
      });
      return;
    }

    if (team1.id === team2.id) {
      toast({
        title: 'Błąd',
        description: 'Wybierz dwie różne drużyny',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('map_veto_sessions')
        .insert({
          team1_user_id: team1.owner_id,
          team2_user_id: team2.owner_id,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: `Sesja veto dla ${team1.name} vs ${team2.name} została utworzona`
      });

      setSelectedTeam1('');
      setSelectedTeam2('');
      fetchSessions();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('map_veto_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Sesja została usunięta'
      });

      fetchSessions();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const copyLink = (sessionCode: string) => {
    const url = `${window.location.origin}/turniej/wybieranie_map?code=${sessionCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Skopiowano',
      description: 'Link do sesji został skopiowany'
    });
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchSessions();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (!isOwner) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
          <p className="text-destructive">Tylko właściciel ma dostęp do tej funkcji.</p>
        </div>
      </div>
    );
  }

  const team1Data = getSelectedTeam1Data();
  const team2Data = getSelectedTeam2Data();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Swords className="w-8 h-8 text-primary" />
          Zarządzanie Map Veto
        </h1>
        <p className="text-muted-foreground mt-2">
          Twórz sesje wyboru map dla meczów - kapitanowie (właściciele drużyn) otrzymają dostęp automatycznie
        </p>
      </div>

      {/* Create New Session */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nowa sesja veto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Team 1 Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                Drużyna 1
              </Label>
              <Select value={selectedTeam1} onValueChange={setSelectedTeam1}>
                <SelectTrigger className="h-auto py-3">
                  <SelectValue placeholder="Wybierz drużynę..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.id !== selectedTeam2).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-3 py-1">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.member_count} członków • {team.status === 'ready' ? 'Gotowa' : 'Przygotowuje się'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Team 1 Preview */}
              {team1Data && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    {team1Data.logo_url ? (
                      <img src={team1Data.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-lg">{team1Data.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <UserCircle className="w-4 h-4" />
                        <span>Kapitan: {team1Data.owner_name || 'Nieznany'}</span>
                      </div>
                    </div>
                    {team1Data.owner_avatar && (
                      <img src={team1Data.owner_avatar} alt="" className="w-10 h-10 rounded-full border-2 border-blue-500" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Team 2 Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                Drużyna 2
              </Label>
              <Select value={selectedTeam2} onValueChange={setSelectedTeam2}>
                <SelectTrigger className="h-auto py-3">
                  <SelectValue placeholder="Wybierz drużynę..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.id !== selectedTeam1).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-3 py-1">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.member_count} członków • {team.status === 'ready' ? 'Gotowa' : 'Przygotowuje się'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Team 2 Preview */}
              {team2Data && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    {team2Data.logo_url ? (
                      <img src={team2Data.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-lg">{team2Data.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <UserCircle className="w-4 h-4" />
                        <span>Kapitan: {team2Data.owner_name || 'Nieznany'}</span>
                      </div>
                    </div>
                    {team2Data.owner_avatar && (
                      <img src={team2Data.owner_avatar} alt="" className="w-10 h-10 rounded-full border-2 border-orange-500" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <Button 
            onClick={createSession} 
            disabled={creating || !selectedTeam1 || !selectedTeam2} 
            className="w-full"
            size="lg"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Utwórz sesję veto
          </Button>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sesje veto ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak sesji veto. Utwórz pierwszą sesję powyżej.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border gap-4"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Team 1 */}
                    <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/30">
                      {session.team1_data?.logo_url ? (
                        <img src={session.team1_data.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{session.team1_data?.name || 'Nieznana drużyna'}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.team1_data?.owner_name || 'Brak kapitana'}
                        </div>
                      </div>
                    </div>

                    <span className="text-xl font-bold text-muted-foreground">VS</span>

                    {/* Team 2 */}
                    <div className="flex items-center gap-3 bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/30">
                      {session.team2_data?.logo_url ? (
                        <img src={session.team2_data.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{session.team2_data?.name || 'Nieznana drużyna'}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.team2_data?.owner_name || 'Brak kapitana'}
                        </div>
                      </div>
                    </div>

                    <Badge variant={session.is_active ? 'default' : 'secondary'}>
                      {session.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>

                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.created_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(session.session_code)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Kopiuj link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/turniej/wybieranie_map?code=${session.session_code}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(session.id, session.is_active)}
                    >
                      {session.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMapVeto;
