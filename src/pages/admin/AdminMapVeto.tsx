import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Copy, ExternalLink, Users, Swords, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

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
  team1_profile?: { display_name: string | null; avatar_url: string | null };
  team2_profile?: { display_name: string | null; avatar_url: string | null };
}

interface TeamOwner {
  user_id: string;
  team_name: string;
  display_name: string | null;
  avatar_url: string | null;
}

const AdminMapVeto = () => {
  const { userRoles } = useOutletContext<OutletContext>();
  const [sessions, setSessions] = useState<VetoSession[]>([]);
  const [teamOwners, setTeamOwners] = useState<TeamOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [selectedTeam1, setSelectedTeam1] = useState('');
  const [selectedTeam2, setSelectedTeam2] = useState('');

  const isOwner = userRoles.includes('owner');

  useEffect(() => {
    if (isOwner) {
      fetchSessions();
      fetchTeamOwners();
    }
  }, [isOwner]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for team users
      const sessionsWithProfiles = await Promise.all(
        (data || []).map(async (session) => {
          const [profile1, profile2] = await Promise.all([
            supabase.from('profiles').select('display_name, avatar_url').eq('user_id', session.team1_user_id).maybeSingle(),
            supabase.from('profiles').select('display_name, avatar_url').eq('user_id', session.team2_user_id).maybeSingle()
          ]);
          
          return {
            ...session,
            team1_profile: profile1.data,
            team2_profile: profile2.data
          };
        })
      );

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamOwners = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('name, owner_id')
        .not('owner_id', 'is', null);

      if (error) throw error;

      const ownersWithProfiles = await Promise.all(
        (teams || []).map(async (team) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', team.owner_id!)
            .maybeSingle();

          return {
            user_id: team.owner_id!,
            team_name: team.name,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url
          };
        })
      );

      setTeamOwners(ownersWithProfiles);
    } catch (error) {
      console.error('Error fetching team owners:', error);
    }
  };

  const createSession = async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      toast({
        title: 'Błąd',
        description: 'Wybierz obie drużyny',
        variant: 'destructive'
      });
      return;
    }

    if (selectedTeam1 === selectedTeam2) {
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
          team1_user_id: selectedTeam1,
          team2_user_id: selectedTeam2,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Sesja veto została utworzona'
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Swords className="w-8 h-8 text-primary" />
          Zarządzanie Map Veto
        </h1>
        <p className="text-muted-foreground mt-2">
          Twórz sesje wyboru map dla meczów i nadawaj dostęp kapitanom drużyn
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Drużyna 1 (Kapitan)</Label>
              <Select value={selectedTeam1} onValueChange={setSelectedTeam1}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kapitana drużyny 1" />
                </SelectTrigger>
                <SelectContent>
                  {teamOwners.map((owner) => (
                    <SelectItem key={owner.user_id} value={owner.user_id}>
                      <div className="flex items-center gap-2">
                        {owner.avatar_url && (
                          <img src={owner.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        )}
                        <span>{owner.display_name || 'Brak nazwy'}</span>
                        <span className="text-muted-foreground">({owner.team_name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Drużyna 2 (Kapitan)</Label>
              <Select value={selectedTeam2} onValueChange={setSelectedTeam2}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kapitana drużyny 2" />
                </SelectTrigger>
                <SelectContent>
                  {teamOwners.map((owner) => (
                    <SelectItem key={owner.user_id} value={owner.user_id}>
                      <div className="flex items-center gap-2">
                        {owner.avatar_url && (
                          <img src={owner.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        )}
                        <span>{owner.display_name || 'Brak nazwy'}</span>
                        <span className="text-muted-foreground">({owner.team_name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={createSession} disabled={creating} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Utwórz sesję
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Aktywne sesje ({sessions.length})
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
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-6">
                    {/* Team 1 */}
                    <div className="flex items-center gap-2">
                      {session.team1_profile?.avatar_url && (
                        <img 
                          src={session.team1_profile.avatar_url} 
                          alt="" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {session.team1_profile?.display_name || 'Nieznany'}
                      </span>
                    </div>

                    <span className="text-muted-foreground font-bold">VS</span>

                    {/* Team 2 */}
                    <div className="flex items-center gap-2">
                      {session.team2_profile?.avatar_url && (
                        <img 
                          src={session.team2_profile.avatar_url} 
                          alt="" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {session.team2_profile?.display_name || 'Nieznany'}
                      </span>
                    </div>

                    <Badge variant={session.is_active ? 'default' : 'secondary'}>
                      {session.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>

                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.created_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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
