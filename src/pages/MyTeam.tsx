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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { user, loading: authLoading, isSteamLinked } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
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

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    const teamId = searchParams.get('team_id');
    
    if (payment === 'success' && sessionId) {
      verifyPayment(teamId, sessionId);
    } else if (payment === 'cancelled') {
      toast({
        title: t('myteam.payment_cancelled'),
        description: t('myteam.payment_cancelled_desc'),
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
          title: t('myteam.payment_success'),
          description: t('myteam.payment_success_desc'),
        });
        navigate('/moja-druzyna', { replace: true });
        fetchTeam();
      }
    } catch (error: any) {
      toast({
        title: t('myteam.payment_error'),
        description: t('myteam.payment_error_desc'),
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
      if (data?.url) window.open(data.url, '_blank');
    } catch (error: any) {
      toast({ title: t('myteam.payment_error_2'), description: error.message, variant: 'destructive' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkTeamsLimit = async () => {
    try {
      const { data: settingsData } = await supabase.from('tournament_settings').select('value').eq('key', 'max_teams').single();
      const maxTeams = parseInt(settingsData?.value || '32', 10);
      const { count } = await supabase.from('teams').select('*', { count: 'exact', head: true });
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
      const { data: teamData, error: teamError } = await supabase.from('teams').select('*').eq('owner_id', user.id).maybeSingle();
      if (teamError) throw teamError;
      if (teamData) {
        setTeam(teamData as Team);
        const { data: membersData, error: membersError } = await supabase.from('team_members').select('*').eq('team_id', teamData.id).order('role', { ascending: true });
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
      const { data: existingTeam } = await supabase.from('teams').select('id').eq('name', newTeamName.trim()).maybeSingle();
      if (existingTeam) {
        toast({ title: t('myteam.error'), description: t('myteam.team_exists'), variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-tournament-payment', { body: { team_name: newTeamName.trim() } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast({ title: t('myteam.error'), description: error.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  const validateSteamId = (steamId: string): boolean => /^7656119\d{10}$/.test(steamId);

  const addMember = async () => {
    if (!team || !newMember.nickname.trim()) return;
    if (!newMember.steam_id.trim()) {
      toast({ title: t('myteam.steam_id_required'), description: t('myteam.steam_id_required_desc'), variant: 'destructive' });
      return;
    }
    if (!validateSteamId(newMember.steam_id.trim())) {
      toast({ title: t('myteam.steam_id_invalid'), description: t('myteam.steam_id_invalid_desc'), variant: 'destructive' });
      return;
    }
    if (members.find(m => m.steam_id === newMember.steam_id.trim())) {
      toast({ title: t('myteam.steam_id_used'), description: t('myteam.steam_id_used_desc'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('team_members').insert({ team_id: team.id, nickname: newMember.nickname.trim(), steam_id: newMember.steam_id.trim(), role: newMember.role, position: newMember.position.trim() || null });
      if (error) throw error;
      toast({ title: t('myteam.member_added') });
      setNewMember({ nickname: '', steam_id: '', role: 'player', position: '' });
      fetchTeam();
    } catch (error: any) {
      toast({ title: t('myteam.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      toast({ title: t('myteam.member_removed') });
      fetchTeam();
    } catch (error: any) {
      toast({ title: t('myteam.error'), description: error.message, variant: 'destructive' });
    }
  };

  const counts = { players: members.filter(m => m.role === 'player').length, reserves: members.filter(m => m.role === 'reserve').length, coaches: members.filter(m => m.role === 'coach').length };
  const isTeamReady = counts.players >= 5 && counts.reserves >= 2 && counts.coaches >= 1;

  if (authLoading || loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <HeroSection title={t('myteam.title')} subtitle={t('myteam.subtitle')} size="sm" />
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          {!isSteamLinked ? (
            <div className="glass-card p-8 text-center border-2 border-yellow-500/30">
              <Link2 className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">{t('myteam.steam_required')}</h2>
              <p className="text-muted-foreground mb-6">{t('myteam.steam_required_desc')}</p>
              <Button variant="hero" asChild><Link to="/konto"><Link2 className="w-4 h-4 mr-2" />{t('myteam.connect_steam')}</Link></Button>
            </div>
          ) : team ? (
            <>
              <div className="glass-card p-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{team.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', team.status === 'ready' ? 'bg-primary/20 text-primary' : team.status === 'registered' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500')}>
                        {team.status === 'ready' ? t('myteam.status.ready') : team.status === 'registered' ? t('myteam.status.registered') : t('myteam.status.preparing')}
                      </span>
                      {team.is_paid && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">{t('myteam.paid')}</span>}
                    </div>
                  </div>
                  {isTeamReady && !team.is_paid && <Button variant="hero" onClick={handlePayment} disabled={paymentLoading}>{paymentLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}{t('myteam.pay_fee')}</Button>}
                </div>
              </div>

              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4">{t('myteam.requirements')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className={cn('p-4 rounded-xl text-center', counts.players >= 5 ? 'bg-primary/10' : 'bg-muted')}><Users className={cn('w-6 h-6 mx-auto mb-2', counts.players >= 5 ? 'text-primary' : 'text-muted-foreground')} /><div className="text-2xl font-bold">{counts.players}/5</div><div className="text-sm text-muted-foreground">{t('myteam.players')}</div>{counts.players >= 5 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}</div>
                  <div className={cn('p-4 rounded-xl text-center', counts.reserves >= 2 ? 'bg-primary/10' : 'bg-muted')}><Shield className={cn('w-6 h-6 mx-auto mb-2', counts.reserves >= 2 ? 'text-primary' : 'text-muted-foreground')} /><div className="text-2xl font-bold">{counts.reserves}/2</div><div className="text-sm text-muted-foreground">{t('myteam.reserves')}</div>{counts.reserves >= 2 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}</div>
                  <div className={cn('p-4 rounded-xl text-center', counts.coaches >= 1 ? 'bg-primary/10' : 'bg-muted')}><GraduationCap className={cn('w-6 h-6 mx-auto mb-2', counts.coaches >= 1 ? 'text-primary' : 'text-muted-foreground')} /><div className="text-2xl font-bold">{counts.coaches}/1</div><div className="text-sm text-muted-foreground">{t('myteam.coach')}</div>{counts.coaches >= 1 && <Check className="w-4 h-4 mx-auto mt-1 text-primary" />}</div>
                </div>
              </div>

              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4">{t('myteam.add_member')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2"><Label>{t('myteam.nickname')}</Label><Input value={newMember.nickname} onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })} placeholder={t('myteam.nickname_placeholder')} className="bg-secondary/50" /></div>
                  <div className="space-y-2"><Label>{t('myteam.steam_id')} <span className="text-destructive">*</span></Label><Input value={newMember.steam_id} onChange={(e) => setNewMember({ ...newMember, steam_id: e.target.value })} placeholder={t('myteam.steam_id_placeholder')} className="bg-secondary/50" /></div>
                  <div className="space-y-2"><Label>{t('myteam.role')}</Label><Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v as MemberRole })}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="player">{t('myteam.role_player')}</SelectItem><SelectItem value="reserve">{t('myteam.role_reserve')}</SelectItem><SelectItem value="coach">{t('myteam.role_coach')}</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>{t('myteam.position')}</Label><Input value={newMember.position} onChange={(e) => setNewMember({ ...newMember, position: e.target.value })} placeholder={t('myteam.position_placeholder')} className="bg-secondary/50" /></div>
                  <div className="flex items-end"><Button variant="hero" className="w-full" onClick={addMember} disabled={!newMember.nickname.trim() || saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button></div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4">{t('myteam.team_members')}</h3>
                {members.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('myteam.add_member')}</p> : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">{member.role === 'player' && <Users className="w-5 h-5 text-primary" />}{member.role === 'reserve' && <Shield className="w-5 h-5 text-yellow-500" />}{member.role === 'coach' && <GraduationCap className="w-5 h-5 text-accent" />}</div>
                          <div><div className="font-semibold text-foreground">{member.nickname}</div><div className="text-sm text-muted-foreground">{member.role === 'player' ? t('myteam.role_player') : member.role === 'reserve' ? t('myteam.role_reserve') : t('myteam.role_coach')}{member.position && ` • ${member.position}`}</div></div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : teamsLimitReached ? (
            <div className="glass-card p-8 text-center border-2 border-destructive/30">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">{t('myteam.registration_closed')}</h2>
              <p className="text-muted-foreground mb-4">{t('myteam.max_teams_reached')} ({teamsLimitInfo.current}/{teamsLimitInfo.max}).</p>
              <p className="text-sm text-muted-foreground">{t('myteam.follow_us')}</p>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              {!showCreateForm ? (
                <>
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">{t('myteam.no_team')}</h2>
                  <p className="text-muted-foreground mb-4">{t('myteam.create_team_desc')}</p>
                  <p className="text-sm text-muted-foreground mb-6">{t('myteam.registered_teams')}: {teamsLimitInfo.current}/{teamsLimitInfo.max}</p>
                  <Button variant="hero" onClick={() => setShowCreateForm(true)}><Plus className="w-4 h-4 mr-2" />{t('myteam.create_team')}</Button>
                </>
              ) : (
                <div className="max-w-md mx-auto">
                  <h2 className="text-2xl font-bold mb-2">{t('myteam.new_team')}</h2>
                  <p className="text-muted-foreground mb-6 text-sm">{t('myteam.payment_redirect')}</p>
                  <div className="space-y-4">
                    <div className="space-y-2 text-left"><Label>{t('myteam.team_name')}</Label><Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder={t('myteam.team_name_placeholder')} className="bg-secondary/50" /></div>
                    <div className="flex gap-3 justify-center">
                      <Button variant="ghost" onClick={() => setShowCreateForm(false)}>{t('myteam.cancel')}</Button>
                      <Button variant="hero" onClick={createTeam} disabled={!newTeamName.trim() || saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}{t('myteam.create_and_pay')}</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default MyTeam;
