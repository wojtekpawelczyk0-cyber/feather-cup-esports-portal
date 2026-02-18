import { useState, useEffect } from 'react';
import { Loader2, Mic, MicOff, Play, Save, Trophy, BarChart3, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAP_NAMES, getMapThumbnail, getMapDisplayName } from '@/lib/mapThumbnails';

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

interface CommentatorStats {
  userId: string;
  displayName: string;
  finishedCount: number;
  upcomingCount: number;
  liveCount: number;
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
  const [commentatorStats, setCommentatorStats] = useState<CommentatorStats[]>([]);
  const [myStats, setMyStats] = useState<CommentatorStats | null>(null);
  const [bo3DialogOpen, setBo3DialogOpen] = useState(false);
  const [bo3MatchId, setBo3MatchId] = useState<string | null>(null);
  const [bo3Maps, setBo3Maps] = useState({ pick1: '', pick2: '', decider: '' });

  useEffect(() => {
    fetchMatches();
    fetchStats();

    const channel = supabase
      .channel('commentator-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get all matches to calculate stats
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('id, status, commentator1_id, commentator2_id');

      if (error) throw error;

      // Collect all commentator IDs
      const commentatorMap = new Map<string, { finished: number; upcoming: number; live: number }>();
      
      for (const match of allMatches || []) {
        const commentators = [match.commentator1_id, match.commentator2_id].filter(Boolean);
        for (const cId of commentators) {
          if (!commentatorMap.has(cId)) {
            commentatorMap.set(cId, { finished: 0, upcoming: 0, live: 0 });
          }
          const stats = commentatorMap.get(cId)!;
          if (match.status === 'finished') stats.finished++;
          else if (match.status === 'scheduled') stats.upcoming++;
          else if (match.status === 'live') stats.live++;
        }
      }

      // Get profiles for all commentators
      const commentatorIds = Array.from(commentatorMap.keys());
      if (commentatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', commentatorIds);

        const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        
        const statsArray: CommentatorStats[] = [];
        for (const [userId, counts] of commentatorMap.entries()) {
          statsArray.push({
            userId,
            displayName: profilesMap.get(userId) || 'Nieznany',
            finishedCount: counts.finished,
            upcomingCount: counts.upcoming,
            liveCount: counts.live,
          });
        }

        // Sort by finished matches
        statsArray.sort((a, b) => b.finishedCount - a.finishedCount);
        setCommentatorStats(statsArray);

        // Find my stats
        const myStatsData = statsArray.find(s => s.userId === user.id);
        setMyStats(myStatsData || null);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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
    const match = upcomingMatches.find(m => m.id === matchId);
    if (match && (match as any).bo_format === 'bo3') {
      setBo3MatchId(matchId);
      setBo3Maps({ pick1: '', pick2: '', decider: '' });
      setBo3DialogOpen(true);
      return;
    }
    await doStartMatch(matchId);
  };

  const doStartMatch = async (matchId: string) => {
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

  const confirmBo3Start = async () => {
    if (!bo3MatchId || !bo3Maps.pick1 || !bo3Maps.pick2 || !bo3Maps.decider) {
      toast({ title: 'Wybierz wszystkie 3 mapy', variant: 'destructive' });
      return;
    }
    if (new Set([bo3Maps.pick1, bo3Maps.pick2, bo3Maps.decider]).size < 3) {
      toast({ title: 'Mapy muszą być różne', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const maps = [
        { match_id: bo3MatchId, map_name: bo3Maps.pick1, map_number: 1, status: 'pending' },
        { match_id: bo3MatchId, map_name: bo3Maps.pick2, map_number: 2, status: 'pending' },
        { match_id: bo3MatchId, map_name: bo3Maps.decider, map_number: 3, status: 'pending' },
      ];

      const { error: mapsError } = await supabase.from('match_maps').insert(maps);
      if (mapsError) throw mapsError;

      await doStartMatch(bo3MatchId);
      setBo3DialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
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

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: 'ID skopiowane', description: id });
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

      {/* My Stats */}
      {myStats && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{myStats.finishedCount}</p>
              <p className="text-sm text-muted-foreground">Skomentowanych meczy</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Mic className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{myStats.upcomingCount}</p>
              <p className="text-sm text-muted-foreground">Zaplanowanych</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{myStats.liveCount}</p>
              <p className="text-sm text-muted-foreground">Na żywo</p>
            </div>
          </div>
        </div>
      )}

      {/* All Commentators Stats */}
      {commentatorStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ranking komentatorów
          </h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">#</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Komentator</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Skomentowane</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Zaplanowane</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Na żywo</th>
                </tr>
              </thead>
              <tbody>
                {commentatorStats.slice(0, 10).map((stat, index) => (
                  <tr key={stat.userId} className={cn(
                    "border-b border-border/50",
                    stat.userId === user?.id && "bg-primary/10"
                  )}>
                    <td className="p-4 font-bold text-muted-foreground">{index + 1}</td>
                    <td className="p-4 font-semibold text-foreground">
                      {stat.displayName}
                      {stat.userId === user?.id && <span className="ml-2 text-xs text-primary">(Ty)</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded-full text-sm font-semibold bg-green-500/20 text-green-400">
                        {stat.finishedCount}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-400">
                        {stat.upcomingCount}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded-full text-sm font-semibold bg-red-500/20 text-red-400">
                        {stat.liveCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  {/* Match ID */}
                  <button
                    onClick={() => copyId(match.id)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono opacity-60 hover:opacity-100 transition-opacity"
                    title="Kopiuj ID meczu"
                  >
                    <Copy className="w-3 h-3" />
                    {match.id.slice(0, 8)}
                  </button>
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

      {/* BO3 Map Selection Dialog */}
      <Dialog open={bo3DialogOpen} onOpenChange={setBo3DialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Wybierz mapy dla BO3</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(['pick1', 'pick2', 'decider'] as const).map((key, i) => {
              const label = i < 2 ? `Pick ${i + 1}` : 'Decider';
              const selectedMap = bo3Maps[key];
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <Select value={selectedMap} onValueChange={(v) => setBo3Maps({ ...bo3Maps, [key]: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz mapę..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MAP_NAMES.map((map) => (
                        <SelectItem key={map} value={map} disabled={Object.values(bo3Maps).includes(map) && bo3Maps[key] !== map}>
                          <div className="flex items-center gap-2">
                            <img src={getMapThumbnail(map)} alt="" className="w-8 h-5 rounded object-cover" />
                            <span>{getMapDisplayName(map)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBo3DialogOpen(false)}>Anuluj</Button>
            <Button onClick={confirmBo3Start} disabled={saving || !bo3Maps.pick1 || !bo3Maps.pick2 || !bo3Maps.decider}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Rozpocznij mecz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentatorPanel;
