import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Calendar, Clock, UserMinus, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  scheduled_at: string;
  status: MatchStatus;
  round: string | null;
  swiss_round: number | null;
  swiss_order: number | null;
  swiss_group: string | null;
  commentator1_id: string | null;
  commentator2_id: string | null;
  team1?: { name: string } | null;
  team2?: { name: string } | null;
}

const AdminMatches = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [finishedOpen, setFinishedOpen] = useState(false);
  const [commentatorNames, setCommentatorNames] = useState<Map<string, string>>(new Map());
  const [formData, setFormData] = useState({
    team1_id: '',
    team2_id: '',
    scheduled_at: '',
    round: '',
    swiss_round: '',
    swiss_order: 0,
    swiss_group: '' as string,
    status: 'scheduled' as MatchStatus,
    team1_score: 0,
    team2_score: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        supabase
          .from('matches')
          .select(`*`)
          .order('scheduled_at', { ascending: true }),
        supabase.from('teams').select('id, name').order('name'),
      ]);

      const teamsMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t.name]));
      const matchesWithTeams = (matchesRes.data || []).map((m: any) => ({
        ...m,
        team1: m.team1_id ? { name: teamsMap.get(m.team1_id) || 'TBD' } : null,
        team2: m.team2_id ? { name: teamsMap.get(m.team2_id) || 'TBD' } : null,
      }));

      setMatches(matchesWithTeams as Match[]);
      setTeams((teamsRes.data || []) as Team[]);

      // Fetch commentator profiles
      const commentatorIds = new Set<string>();
      (matchesRes.data || []).forEach((m: any) => {
        if (m.commentator1_id) commentatorIds.add(m.commentator1_id);
        if (m.commentator2_id) commentatorIds.add(m.commentator2_id);
      });
      if (commentatorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', Array.from(commentatorIds));
        const namesMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || 'Komentator']));
        setCommentatorNames(namesMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (match?: Match) => {
    if (match) {
      setEditingMatch(match);
      setFormData({
        team1_id: match.team1_id || '',
        team2_id: match.team2_id || '',
        scheduled_at: match.scheduled_at ? match.scheduled_at.slice(0, 16) : '',
        round: match.round || '',
        swiss_round: match.swiss_round?.toString() || '',
        swiss_order: match.swiss_order || 0,
        swiss_group: match.swiss_group || '',
        status: match.status,
        team1_score: match.team1_score,
        team2_score: match.team2_score,
      });
    } else {
      setEditingMatch(null);
      setFormData({
        team1_id: '',
        team2_id: '',
        scheduled_at: '',
        round: '',
        swiss_round: '',
        swiss_order: 0,
        swiss_group: '',
        status: 'scheduled',
        team1_score: 0,
        team2_score: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const saveMatch = async () => {
    if (!formData.team1_id || !formData.team2_id) {
      toast({ title: 'Wypełnij wszystkie wymagane pola', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const winnerId = (() => {
        if (formData.status !== 'finished') return null;
        if (!formData.team1_id || !formData.team2_id) return null;
        if (formData.team1_score > formData.team2_score) return formData.team1_id;
        if (formData.team2_score > formData.team1_score) return formData.team2_id;
        return null;
      })();

      const matchData = {
        team1_id: formData.team1_id,
        team2_id: formData.team2_id,
        scheduled_at: formData.scheduled_at || null,
        round: formData.round || null,
        swiss_round: formData.swiss_round ? parseInt(formData.swiss_round) : null,
        swiss_order: formData.swiss_order,
        swiss_group: formData.swiss_group || null,
        status: formData.status,
        team1_score: formData.team1_score,
        team2_score: formData.team2_score,
        winner_id: winnerId,
      };

      if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', editingMatch.id);
        if (error) throw error;
        toast({ title: 'Mecz zaktualizowany!' });
      } else {
        const { error } = await supabase.from('matches').insert(matchData);
        if (error) throw error;
        toast({ title: 'Mecz dodany!' });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten mecz?')) return;

    try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Mecz usunięty' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const removeCommentator = async (matchId: string, slot: 1 | 2) => {
    const field = slot === 1 ? 'commentator1_id' : 'commentator2_id';
    try {
      const { error } = await supabase
        .from('matches')
        .update({ [field]: null })
        .eq('id', matchId);
      if (error) throw error;
      toast({ title: `Komentator ${slot} wypisany z meczu` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: 'ID skopiowane', description: id });
  };

  const statusLabels: Record<MatchStatus, string> = {
    scheduled: 'Zaplanowany',
    live: 'Na żywo',
    finished: 'Zakończony',
    cancelled: 'Anulowany',
  };

  const activeMatches = matches.filter(m => m.status !== 'finished');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  const renderMatchRow = (match: Match) => (
    <tr key={match.id} className="border-b border-border/50 hover:bg-secondary/20">
      <td className="p-4">
        <div>
          <span className="font-semibold text-foreground">
            {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
          </span>
          <button
            onClick={() => copyId(match.id)}
            className="ml-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono opacity-60 hover:opacity-100 transition-opacity"
            title="Kopiuj ID meczu"
          >
            <Copy className="w-3 h-3" />
            {match.id.slice(0, 8)}…
          </button>
        </div>
      </td>
      <td className="p-4">
        {match.scheduled_at ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {new Date(match.scheduled_at).toLocaleDateString('pl-PL')}
            <Clock className="w-4 h-4 ml-2" />
            {new Date(match.scheduled_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm italic">Brak terminu</span>
        )}
      </td>
      <td className="p-4 text-muted-foreground">{match.round || '-'}</td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          match.status === 'live' ? 'bg-red-500/20 text-red-400' :
          match.status === 'finished' ? 'bg-green-500/20 text-green-400' :
          match.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          {statusLabels[match.status]}
        </span>
      </td>
      <td className="p-4 font-bold text-foreground">
        {match.status === 'finished' ? `${match.team1_score} : ${match.team2_score}` : '-'}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 flex-wrap">
          {match.commentator1_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCommentator(match.id, 1)}
              className="text-destructive text-xs gap-1 h-7"
              title="Wypisz komentatora 1"
            >
              <UserMinus className="w-3 h-3" />
              {commentatorNames.get(match.commentator1_id) || 'K1'}
            </Button>
          )}
          {match.commentator2_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCommentator(match.id, 2)}
              className="text-destructive text-xs gap-1 h-7"
              title="Wypisz komentatora 2"
            >
              <UserMinus className="w-3 h-3" />
              {commentatorNames.get(match.commentator2_id) || 'K2'}
            </Button>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openDialog(match)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteMatch(match.id)} className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mecze</h1>
          <p className="text-muted-foreground">Zarządzaj harmonogramem meczów</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj mecz
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingMatch ? 'Edytuj mecz' : 'Nowy mecz'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Drużyna 1</Label>
                  <Select
                    value={formData.team1_id}
                    onValueChange={(v) => setFormData({ ...formData, team1_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Drużyna 2</Label>
                  <Select
                    value={formData.team2_id}
                    onValueChange={(v) => setFormData({ ...formData, team2_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data i godzina</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Grupa Swiss</Label>
                  <Select
                    value={formData.swiss_group || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, swiss_group: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Wybierz grupę..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Brak (nie Swiss)</SelectItem>
                      <SelectItem value="A">Grupa A</SelectItem>
                      <SelectItem value="B">Grupa B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kolejka Swiss</Label>
                  <Select
                    value={formData.swiss_round || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, swiss_round: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Wybierz kolejkę..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Brak (nie Swiss)</SelectItem>
                      <SelectItem value="1">Kolejka 1</SelectItem>
                      <SelectItem value="2">Kolejka 2</SelectItem>
                      <SelectItem value="3">Kolejka 3</SelectItem>
                      <SelectItem value="4">Kolejka 4</SelectItem>
                      <SelectItem value="5">Kolejka 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kolejność meczu</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.swiss_order}
                    onChange={(e) => setFormData({ ...formData, swiss_order: parseInt(e.target.value) || 0 })}
                    placeholder="0 = domyślnie"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Runda (opis)</Label>
                  <Input
                    value={formData.round}
                    onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                    placeholder="np. Ćwierćfinał"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as MatchStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Zaplanowany</SelectItem>
                      <SelectItem value="live">Na żywo</SelectItem>
                      <SelectItem value="finished">Zakończony</SelectItem>
                      <SelectItem value="cancelled">Anulowany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.status === 'finished' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wynik drużyny 1</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.team1_score}
                      onChange={(e) => setFormData({ ...formData, team1_score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wynik drużyny 2</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.team2_score}
                      onChange={(e) => setFormData({ ...formData, team2_score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
                <Button variant="hero" onClick={saveMatch} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingMatch ? 'Zapisz' : 'Dodaj'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Matches */}
      <div className="glass-card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-muted-foreground font-medium">Drużyny</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Data</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Runda</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Wynik</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Komentatorzy</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {activeMatches.map(renderMatchRow)}
          </tbody>
        </table>
        {activeMatches.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Brak aktywnych meczów</p>
        )}
      </div>

      {/* Finished Matches - Collapsible */}
      {finishedMatches.length > 0 && (
        <Collapsible open={finishedOpen} onOpenChange={setFinishedOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3 w-full text-left">
              {finishedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold">Zakończone mecze ({finishedMatches.length})</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Drużyny</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Data</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Runda</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Wynik</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Komentatorzy</th>
                    <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {finishedMatches.map(renderMatchRow)}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default AdminMatches;
