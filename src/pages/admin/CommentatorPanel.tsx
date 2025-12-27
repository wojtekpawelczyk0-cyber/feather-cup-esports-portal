import { useState, useEffect } from 'react';
import { Loader2, Mic, MicOff, Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  round: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  commentator1_id: string | null;
  commentator2_id: string | null;
  team1?: Team | null;
  team2?: Team | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const CommentatorPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [myLiveMatch, setMyLiveMatch] = useState<Match | null>(null);
  const [commentatorProfiles, setCommentatorProfiles] = useState<Map<string, Profile>>(new Map());
  const [scores, setScores] = useState({ team1: 0, team2: 0 });

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('commentator-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;

    try {
      // Get upcoming/live matches
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Get commentator profiles
      const commentatorIds = new Set<string>();
      (data || []).forEach((m: any) => {
        if (m.commentator1_id) commentatorIds.add(m.commentator1_id);
        if (m.commentator2_id) commentatorIds.add(m.commentator2_id);
      });

      if (commentatorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', Array.from(commentatorIds));

        const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setCommentatorProfiles(profilesMap);
      }

      setUpcomingMatches(data || []);

      // Check if user has an active live match
      const liveMatch = (data || []).find((m: any) =>
        m.status === 'live' && (m.commentator1_id === user.id || m.commentator2_id === user.id)
      );
      
      if (liveMatch) {
        setMyLiveMatch(liveMatch);
        setScores({
          team1: liveMatch.team1_score || 0,
          team2: liveMatch.team2_score || 0,
        });
      } else {
        setMyLiveMatch(null);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimMatch = async (matchId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match) return;

      // Check if already claimed
      if (match.commentator1_id === user.id || match.commentator2_id === user.id) {
        toast({ title: 'Już komentujesz ten mecz', variant: 'destructive' });
        return;
      }

      // Check if slots are full
      if (match.commentator1_id && match.commentator2_id) {
        toast({ title: 'Mecz ma już 2 komentatorów', variant: 'destructive' });
        return;
      }

      const updateData: any = {};
      if (!match.commentator1_id) {
        updateData.commentator1_id = user.id;
      } else {
        updateData.commentator2_id = user.id;
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({ title: 'Zapisano na mecz!' });
      fetchMatches();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const unclaimMatch = async (matchId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match) return;

      const updateData: any = {};
      if (match.commentator1_id === user.id) {
        updateData.commentator1_id = null;
      } else if (match.commentator2_id === user.id) {
        updateData.commentator2_id = null;
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({ title: 'Wypisano z meczu' });
      fetchMatches();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startMatch = async (matchId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', matchId);

      if (error) throw error;
      toast({ title: 'Mecz rozpoczęty!' });
      fetchMatches();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateScore = async () => {
    if (!myLiveMatch) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: scores.team1,
          team2_score: scores.team2,
        })
        .eq('id', myLiveMatch.id);

      if (error) throw error;
      toast({ title: 'Wynik zaktualizowany!' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const endMatch = async () => {
    if (!myLiveMatch) return;
    if (!confirm('Czy na pewno chcesz zakończyć mecz?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          team1_score: scores.team1,
          team2_score: scores.team2,
        })
        .eq('id', myLiveMatch.id);

      if (error) throw error;
      toast({ title: 'Mecz zakończony!' });
      fetchMatches();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCommentatorName = (id: string | null) => {
    if (!id) return null;
    const profile = commentatorProfiles.get(id);
    return profile?.display_name || 'Komentator';
  };

  const isMyMatch = (match: Match) => {
    return match.commentator1_id === user?.id || match.commentator2_id === user?.id;
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
        <h1 className="text-3xl font-bold text-foreground">Panel Komentatora</h1>
        <p className="text-muted-foreground">Zarządzaj swoimi meczami i wynikami</p>
      </div>

      {/* Active Live Match */}
      {myLiveMatch && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Aktualnie komentujesz
          </h2>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                {/* Team 1 */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-2 overflow-hidden">
                    {myLiveMatch.team1?.logo_url ? (
                      <img src={myLiveMatch.team1.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {myLiveMatch.team1?.name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground">{myLiveMatch.team1?.name || 'TBD'}</p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    value={scores.team1}
                    onChange={(e) => setScores({ ...scores, team1: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center text-2xl font-bold"
                  />
                  <span className="text-2xl text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min="0"
                    value={scores.team2}
                    onChange={(e) => setScores({ ...scores, team2: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center text-2xl font-bold"
                  />
                </div>

                {/* Team 2 */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-2 overflow-hidden">
                    {myLiveMatch.team2?.logo_url ? (
                      <img src={myLiveMatch.team2.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {myLiveMatch.team2?.name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground">{myLiveMatch.team2?.name || 'TBD'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="glass" onClick={updateScore} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Zapisz wynik
                </Button>
                <Button variant="destructive" onClick={endMatch} disabled={saving}>
                  Zakończ mecz
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Najbliższe mecze</h2>
        <div className="space-y-4">
          {upcomingMatches.filter(m => m.status !== 'live' || !isMyMatch(m)).map((match) => (
            <div key={match.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Teams */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                      {match.team1?.logo_url ? (
                        <img src={match.team1.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-muted-foreground">
                          {match.team1?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-foreground">{match.team1?.name || 'TBD'}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-semibold text-foreground">{match.team2?.name || 'TBD'}</span>
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                      {match.team2?.logo_url ? (
                        <img src={match.team2.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-muted-foreground">
                          {match.team2?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-muted-foreground text-sm">
                    {format(new Date(match.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                  </div>

                  {/* Status */}
                  {match.status === 'live' && (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                      LIVE
                    </span>
                  )}

                  {/* Commentators */}
                  <div className="flex items-center gap-2">
                    {match.commentator1_id && (
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        match.commentator1_id === user?.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-muted-foreground'
                      )}>
                        <Mic className="w-3 h-3 inline mr-1" />
                        {getCommentatorName(match.commentator1_id)}
                      </span>
                    )}
                    {match.commentator2_id && (
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        match.commentator2_id === user?.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-muted-foreground'
                      )}>
                        <Mic className="w-3 h-3 inline mr-1" />
                        {getCommentatorName(match.commentator2_id)}
                      </span>
                    )}
                    {!match.commentator1_id && !match.commentator2_id && (
                      <span className="text-xs text-muted-foreground">Brak komentatorów</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isMyMatch(match) ? (
                    <>
                      {match.status === 'scheduled' && (
                        <Button variant="hero" size="sm" onClick={() => startMatch(match.id)} disabled={saving}>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => unclaimMatch(match.id)} disabled={saving}>
                        <MicOff className="w-4 h-4 mr-1" />
                        Wypisz się
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => claimMatch(match.id)}
                      disabled={saving || (!!match.commentator1_id && !!match.commentator2_id)}
                    >
                      <Mic className="w-4 h-4 mr-1" />
                      Komentuję
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {upcomingMatches.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Brak nadchodzących meczy</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentatorPanel;
