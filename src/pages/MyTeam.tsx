import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Plus, Users, Shield, GraduationCap, Trash2, Loader2, Check, AlertCircle, CreditCard, Link2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';


type MemberRole = 'player' | 'reserve' | 'coach';
type TeamStatus = 'preparing' | 'ready' | 'registered';

interface TeamMember {
  id: string;
  nickname: string;
  steam_id: string | null;
  role: MemberRole;
  position: string | null;
  avatar_url: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  status: TeamStatus;
  is_paid: boolean;
}

const MyTeam = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, isSteamLinked, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamsLimitReached, setTeamsLimitReached] = useState(false);
  const [teamsLimitInfo, setTeamsLimitInfo] = useState({ current: 0, max: 32 });
  const [newMember, setNewMember] = useState({
    nickname: '',
    steam_id: '',
    role: 'player' as MemberRole,
    position: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchTeam();
      checkTeamsLimit();
    }
  }, [user, authLoading, navigate]);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    const teamId = searchParams.get('team_id');
    
    if (payment === 'success' && sessionId) {
      verifyPayment(teamId, sessionId);
    } else if (payment === 'cancelled') {
      toast({
        title: 'Płatność anulowana',
        description: 'Możesz spróbować ponownie w dowolnym momencie.',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const verifyPayment = async (teamId: string | null, sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-tournament-payment', {
        body: { team_id: teamId, session_id: sessionId },
      });

      if (error) throw error;

      if (data?.paid) {
        toast({
          title: 'Płatność zakończona!',
          description: 'Twoja drużyna została utworzona i opłacona.',
        });
        // Clear URL params and refresh
        navigate('/moja-druzyna', { replace: true });
        fetchTeam();
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: 'Błąd weryfikacji',
        description: 'Nie udało się zweryfikować płatności. Spróbuj odświeżyć stronę.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!team) return;

    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-tournament-payment', {
        body: { team_id: team.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Błąd płatności',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkTeamsLimit = async () => {
    try {
      // Get max_teams setting
      const { data: settingsData } = await supabase
        .from('tournament_settings')
        .select('value')
        .eq('key', 'max_teams')
        .single();
      
      const maxTeams = parseInt(settingsData?.value || '32', 10);

      // Count current teams
      const { count } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });
      
      const currentTeams = count || 0;
      setTeamsLimitInfo({ current: currentTeams, max: maxTeams });
      setTeamsLimitReached(currentTeams >= maxTeams);
    } catch (error) {
      console.error('Error checking teams limit:', error);
    }
  };

  const fetchTeam = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (teamError) throw teamError;

      if (teamData) {
        setTeam(teamData as Team);
        
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .order('role', { ascending: true });

        if (membersError) throw membersError;
        setMembers((membersData || []) as TeamMember[]);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!user || !newTeamName.trim()) return;

    setSaving(true);
    try {
      // First check if team name is available
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('name', newTeamName.trim())
        .maybeSingle();

      if (existingTeam) {
        toast({
          title: 'Błąd',
          description: 'Drużyna o tej nazwie już istnieje',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Redirect to payment with team name - team will be created after successful payment
      const { data, error } = await supabase.functions.invoke('create-tournament-payment', {
        body: { team_name: newTeamName.trim() },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const validateSteamId = (steamId: string): boolean => {
    // Steam64 ID format: 17 digit number starting with 7656119
    const steam64Regex = /^7656119\d{10}$/;
    return steam64Regex.test(steamId);
  };

  const addMember = async () => {
    if (!team || !newMember.nickname.trim()) return;

    // Validate Steam ID is provided
    if (!newMember.steam_id.trim()) {
      toast({
        title: 'Wymagane Steam ID',
        description: 'Każdy członek drużyny musi mieć podane Steam ID.',
        variant: 'destructive',
      });
      return;
    }

    // Validate Steam ID format
    if (!validateSteamId(newMember.steam_id.trim())) {
      toast({
        title: 'Nieprawidłowe Steam ID',
        description: 'Steam ID musi być w formacie Steam64 (17 cyfr, zaczyna się od 7656119).',
        variant: 'destructive',
      });
      return;
    }

    // Check if Steam ID is already used
    const existingSteamMember = members.find(m => m.steam_id === newMember.steam_id.trim());
    if (existingSteamMember) {
      toast({
        title: 'Steam ID już w użyciu',
        description: 'Ten Steam ID jest już przypisany do innego członka drużyny.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          nickname: newMember.nickname.trim(),
          steam_id: newMember.steam_id.trim(),
          role: newMember.role,
          position: newMember.position.trim() || null,
        });

      if (error) throw error;

      toast({ title: 'Członek dodany!' });
      setNewMember({ nickname: '', steam_id: '', role: 'player', position: '' });
      fetchTeam();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Członek usunięty' });
      fetchTeam();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getMemberCounts = () => {
    const players = members.filter((m) => m.role === 'player').length;
    const reserves = members.filter((m) => m.role === 'reserve').length;
    const coaches = members.filter((m) => m.role === 'coach').length;
    return { players, reserves, coaches };
  };

  const counts = getMemberCounts();
  const isTeamReady = counts.players >= 5 && counts.reserves >= 2 && counts.coaches >= 1;

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <HeroSection
        title="Moja Drużyna"
        subtitle="Zarządzaj swoją drużyną i przygotuj się do turnieju"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Steam requirement check */}
          {!isSteamLinked ? (
            <div className="glass-card p-8 text-center border-2 border-yellow-500/30">
              <Link2 className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">Wymagane połączenie Steam</h2>
              <p className="text-muted-foreground mb-6">
                Aby utworzyć drużynę lub dołączyć jako członek, musisz najpierw połączyć swoje konto Steam.
              </p>
              <Button variant="hero" asChild>
                <Link to="/konto">
                  <Link2 className="w-4 h-4 mr-2" />
                  Połącz konto Steam
                </Link>
              </Button>
            </div>
          ) : teamsLimitReached ? (
            // Teams limit reached
            <div className="glass-card p-8 text-center border-2 border-destructive/30">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">Rejestracja zamknięta</h2>
              <p className="text-muted-foreground mb-4">
                Osiągnięto maksymalną liczbę drużyn w turnieju ({teamsLimitInfo.current}/{teamsLimitInfo.max}).
              </p>
              <p className="text-sm text-muted-foreground">
                Śledź nas, aby być na bieżąco z przyszłymi turniejami!
              </p>
            </div>
          ) : !team ? (
            // No team - show create form
            <div className="glass-card p-8 text-center">
              {!showCreateForm ? (
                <>
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">Nie masz jeszcze drużyny</h2>
                  <p className="text-muted-foreground mb-4">
                    Utwórz drużynę, aby wziąć udział w turnieju Feather Cup
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Zarejestrowanych drużyn: {teamsLimitInfo.current}/{teamsLimitInfo.max}
                  </p>
                  <Button variant="hero" onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Utwórz drużynę
                  </Button>
                </>
              ) : (
                <div className="max-w-md mx-auto">
                  <h2 className="text-2xl font-bold mb-2">Nowa drużyna</h2>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Po wpisaniu nazwy zostaniesz przekierowany do płatności wpisowego (50 PLN)
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="teamName">Nazwa drużyny</Label>
                      <Input
                        id="teamName"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="np. Phoenix Rising"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                        Anuluj
                      </Button>
                      <Button 
                        variant="hero" 
                        onClick={createTeam}
                        disabled={!newTeamName.trim() || saving}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        Utwórz i zapłać 50 PLN
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Has team - show management
            <>
              {/* Team Status Card */}
              <div className="glass-card p-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{team.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-semibold',
                          team.status === 'ready'
                            ? 'bg-primary/20 text-primary'
                            : team.status === 'registered'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        )}
                      >
                        {team.status === 'ready' 
                          ? 'Gotowa' 
                          : team.status === 'registered' 
                          ? 'Zarejestrowana' 
                          : 'W przygotowaniu'}
                      </span>
                      {team.is_paid && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">
                          Opłacona
                        </span>
                      )}
                    </div>
                  </div>
                  {isTeamReady && !team.is_paid && (
                    <Button variant="hero" onClick={handlePayment} disabled={paymentLoading}>
                      {paymentLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Zapłać wpisowe (50 PLN)
                    </Button>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Wymagania składu</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className={cn(
                    'p-4 rounded-xl text-center',
                    counts.players >= 5 ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Users className={cn('w-6 h-6 mx-auto mb-2', counts.players >= 5 ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="text-2xl font-bold">{counts.players}/5</div>
                    <div className="text-sm text-muted-foreground">Gracze</div>
                    {counts.players >= 5 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}
                  </div>
                  <div className={cn(
                    'p-4 rounded-xl text-center',
                    counts.reserves >= 2 ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Shield className={cn('w-6 h-6 mx-auto mb-2', counts.reserves >= 2 ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="text-2xl font-bold">{counts.reserves}/2</div>
                    <div className="text-sm text-muted-foreground">Rezerwowi</div>
                    {counts.reserves >= 2 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}
                  </div>
                  <div className={cn(
                    'p-4 rounded-xl text-center',
                    counts.coaches >= 1 ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <GraduationCap className={cn('w-6 h-6 mx-auto mb-2', counts.coaches >= 1 ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="text-2xl font-bold">{counts.coaches}/1</div>
                    <div className="text-sm text-muted-foreground">Trener</div>
                    {counts.coaches >= 1 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}
                  </div>
                </div>
                {!isTeamReady && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-500">
                      Uzupełnij skład drużyny, aby móc zapisać się do turnieju
                    </p>
                  </div>
                )}
              </div>

              {/* Add Member Form */}
              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Dodaj członka</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Nick</Label>
                    <Input
                      value={newMember.nickname}
                      onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                      placeholder="Nick gracza"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Steam ID <span className="text-destructive">*</span></Label>
                    <Input
                      value={newMember.steam_id}
                      onChange={(e) => setNewMember({ ...newMember, steam_id: e.target.value })}
                      placeholder="76561198..."
                      className="bg-secondary/50"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Format Steam64 (17 cyfr)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rola</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => setNewMember({ ...newMember, role: value as MemberRole })}
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Gracz</SelectItem>
                        <SelectItem value="reserve">Rezerwowy</SelectItem>
                        <SelectItem value="coach">Trener</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pozycja</Label>
                    <Input
                      value={newMember.position}
                      onChange={(e) => setNewMember({ ...newMember, position: e.target.value })}
                      placeholder="np. IGL, AWP"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={addMember}
                      disabled={!newMember.nickname.trim() || saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Skład drużyny</h3>
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Brak członków. Dodaj pierwszego członka drużyny.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                            {member.steam_id ? (
                              <img 
                                src={`https://avatars.akamai.steamstatic.com/${member.steam_id.slice(-16)}_medium.jpg`}
                                alt={member.nickname}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={cn(
                              "w-full h-full flex items-center justify-center",
                              member.steam_id && "hidden"
                            )}>
                              {member.role === 'player' && <Users className="w-5 h-5 text-primary" />}
                              {member.role === 'reserve' && <Shield className="w-5 h-5 text-yellow-500" />}
                              {member.role === 'coach' && <GraduationCap className="w-5 h-5 text-accent" />}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{member.nickname}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.role === 'player' ? 'Gracz' : member.role === 'reserve' ? 'Rezerwowy' : 'Trener'}
                              {member.position && ` • ${member.position}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.steam_id && (
                            <a 
                              href={`https://steamcommunity.com/profiles/${member.steam_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hover:bg-primary/20 hover:text-primary transition-colors"
                            >
                              Steam
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default MyTeam;
