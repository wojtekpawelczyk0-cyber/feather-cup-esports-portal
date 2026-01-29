import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trophy, Calendar, Shuffle, Trash2, Save } from 'lucide-react';
import TournamentBracket from '@/components/bracket/TournamentBracket';

interface Team {
  id: string;
  name: string;
  status: string;
  is_paid: boolean;
}

interface BracketMatch {
  id: string;
  round_number: number;
  bracket_position: number;
  team1_id: string | null;
  team2_id: string | null;
  scheduled_at: string;
  status: string;
}

const AdminBracket = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [bracketSize, setBracketSize] = useState<16 | 32 | 64>(32);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [defaultDate, setDefaultDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('id, name, status, is_paid').in('status', ['registered', 'ready']),
        supabase.from('matches').select('*').not('round_number', 'is', null).order('round_number').order('bracket_position'),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const generateBracket = async () => {
    if (teams.length < bracketSize) {
      toast.error(`Potrzebujesz co najmniej ${bracketSize} zarejestrowanych drużyn`);
      return;
    }

    if (!defaultDate) {
      toast.error('Wybierz domyślną datę rozpoczęcia');
      return;
    }

    setGenerating(true);
    try {
      // Delete existing bracket matches
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .not('round_number', 'is', null);

      if (deleteError) throw deleteError;

      // Shuffle teams
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5).slice(0, bracketSize);

      // Calculate rounds
      const totalRounds = bracketSize === 64 ? 6 : bracketSize === 32 ? 5 : 4;
      const matchesPerRound: Record<number, number> = {};
      let matchCount = bracketSize / 2;
      for (let r = 1; r <= totalRounds; r++) {
        matchesPerRound[r] = matchCount;
        matchCount = matchCount / 2;
      }

      // Create all matches with proper linking
      const createdMatches: { id: string; round: number; position: number }[] = [];
      const baseDate = new Date(defaultDate);

      // Create matches from final backwards to ensure next_match_id linking
      for (let round = totalRounds; round >= 1; round--) {
        const matchesInRound = matchesPerRound[round];
        
        for (let pos = 1; pos <= matchesInRound; pos++) {
          const scheduledAt = new Date(baseDate);
          scheduledAt.setDate(scheduledAt.getDate() + (round - 1) * 2); // 2 days between rounds
          
          // Find next match for this position
          let nextMatchId = null;
          if (round < totalRounds) {
            const nextPos = Math.ceil(pos / 2);
            const nextMatch = createdMatches.find(m => m.round === round + 1 && m.position === nextPos);
            nextMatchId = nextMatch?.id || null;
          }

          // Only first round has teams assigned
          const team1Id = round === 1 ? shuffledTeams[(pos - 1) * 2]?.id : null;
          const team2Id = round === 1 ? shuffledTeams[(pos - 1) * 2 + 1]?.id : null;

          const roundNames: Record<number, string> = bracketSize === 64 ? {
            1: '1/32 Finału',
            2: '1/16 Finału',
            3: '1/8 Finału',
            4: 'Ćwierćfinały',
            5: 'Półfinały',
            6: 'Finał',
          } : bracketSize === 32 ? {
            1: '1/16 Finału',
            2: '1/8 Finału',
            3: 'Ćwierćfinały',
            4: 'Półfinały',
            5: 'Finał',
          } : {
            1: '1/8 Finału',
            2: 'Ćwierćfinały',
            3: 'Półfinały',
            4: 'Finał',
          };

          const { data: newMatch, error: insertError } = await supabase
            .from('matches')
            .insert({
              round_number: round,
              bracket_position: pos,
              round: roundNames[round],
              team1_id: team1Id,
              team2_id: team2Id,
              next_match_id: nextMatchId,
              scheduled_at: scheduledAt.toISOString(),
              status: 'scheduled',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          createdMatches.push({ id: newMatch.id, round, position: pos });
        }
      }

      toast.success('Drabinka została wygenerowana!');
      fetchData();
    } catch (error) {
      console.error('Error generating bracket:', error);
      toast.error('Błąd podczas generowania drabinki');
    } finally {
      setGenerating(false);
    }
  };

  const clearBracket = async () => {
    if (!confirm('Czy na pewno chcesz usunąć całą drabinkę?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .not('round_number', 'is', null);

      if (error) throw error;

      toast.success('Drabinka została usunięta');
      setMatches([]);
    } catch (error) {
      console.error('Error clearing bracket:', error);
      toast.error('Błąd podczas usuwania drabinki');
    }
  };

  const updateMatchSchedule = async (matchId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_at: newDate })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, scheduled_at: newDate } : m
      ));
      toast.success('Harmonogram zaktualizowany');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Błąd podczas aktualizacji');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drabinka turniejowa</h1>
          <p className="text-muted-foreground">Zarządzaj drabinką i harmonogramem meczów</p>
        </div>
      </div>

      {/* Generation controls */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Generowanie drabinki
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Rozmiar drabinki</label>
            <Select value={String(bracketSize)} onValueChange={(v) => setBracketSize(Number(v) as 16 | 32 | 64)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16">16 drużyn</SelectItem>
                <SelectItem value="32">32 drużyny</SelectItem>
                <SelectItem value="64">64 drużyny</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Data rozpoczęcia</label>
            <Input
              type="datetime-local"
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
            />
          </div>
          
          <div className="flex items-end gap-2">
            <Button 
              onClick={generateBracket} 
              disabled={generating || teams.length < bracketSize}
              className="flex-1"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {generating ? 'Generowanie...' : 'Generuj drabinkę'}
            </Button>
            {matches.length > 0 && (
              <Button variant="destructive" onClick={clearBracket}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Zarejestrowane drużyny: <span className="font-medium text-foreground">{teams.length}</span> / {bracketSize}
        </p>
      </div>

      {/* Schedule editor */}
      {matches.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Harmonogram meczów
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
            {matches.map(match => (
              <div key={match.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="text-sm font-medium text-foreground mb-2">
                  Runda {match.round_number}, Mecz {match.bracket_position}
                </div>
                <Input
                  type="datetime-local"
                  value={match.scheduled_at ? new Date(match.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateMatchSchedule(match.id, new Date(e.target.value).toISOString())}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket preview */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Podgląd drabinki</h2>
        <TournamentBracket teamCount={bracketSize} />
      </div>
    </div>
  );
};

export default AdminBracket;
