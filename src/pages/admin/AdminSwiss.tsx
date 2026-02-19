import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trophy, Calendar, Shuffle, Trash2, Play, Users, Medal, Settings, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
}

interface SwissMatch {
  id: string;
  swiss_round: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  scheduled_at: string;
  status: string;
  winner_id: string | null;
  team1?: Team;
  team2?: Team;
}

interface Standing {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  points: number;
  round_difference: number;
}

const AdminSwiss = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [defaultDate, setDefaultDate] = useState('');
  const [playoffTeams, setPlayoffTeams] = useState<8 | 16>(8);
  const [winsToAdvance, setWinsToAdvance] = useState(3);
  const [lossesToEliminate, setLossesToEliminate] = useState(3);

  useEffect(() => {
    fetchData();
    fetchSwissConfig();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('id, name, logo_url, status').in('status', ['registered', 'ready']),
        supabase.from('matches').select('*').not('swiss_round', 'is', null).order('swiss_round').order('scheduled_at'),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      const teamsData = teamsRes.data || [];
      setTeams(teamsData);

      // Map team data to matches
      const teamsMap = new Map(teamsData.map(t => [t.id, t]));
      const matchesWithTeams = (matchesRes.data || []).map((m: any) => ({
        ...m,
        team1: m.team1_id ? teamsMap.get(m.team1_id) : null,
        team2: m.team2_id ? teamsMap.get(m.team2_id) : null,
      }));
      setMatches(matchesWithTeams);

      // Calculate current round
      const maxRound = Math.max(0, ...matchesWithTeams.map((m: SwissMatch) => m.swiss_round || 0));
      setCurrentRound(maxRound > 0 ? maxRound : 1);

      // Calculate standings
      await fetchStandings();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const fetchSwissConfig = async () => {
    try {
      const { data } = await supabase
        .from('tournament_settings')
        .select('key, value')
        .in('key', ['swiss_wins_to_advance', 'swiss_losses_to_eliminate']);
      if (data) {
        data.forEach(s => {
          if (s.key === 'swiss_wins_to_advance' && s.value) setWinsToAdvance(Number(s.value));
          if (s.key === 'swiss_losses_to_eliminate' && s.value) setLossesToEliminate(Number(s.value));
        });
      }
    } catch (e) { console.error(e); }
  };

  const saveSwissConfig = async () => {
    try {
      for (const [key, value] of [['swiss_wins_to_advance', String(winsToAdvance)], ['swiss_losses_to_eliminate', String(lossesToEliminate)]]) {
        const { data: existing } = await supabase.from('tournament_settings').select('id').eq('key', key).single();
        if (existing) {
          await supabase.from('tournament_settings').update({ value }).eq('key', key);
        } else {
          await supabase.from('tournament_settings').insert({ key, value });
        }
      }
      toast.success('Konfiguracja zapisana');
    } catch (e) {
      console.error(e);
      toast.error('Błąd zapisu konfiguracji');
    }
  };

  const fetchStandings = async () => {
    try {
      const { data, error } = await supabase
        .from('swiss_standings')
        .select('*');

      if (error) throw error;
      setStandings((data || []) as Standing[]);
    } catch (error) {
      console.error('Error fetching standings:', error);
    }
  };

  const generateRound = async (roundNumber: number) => {
    if (!defaultDate) {
      toast.error('Wybierz datę rundy');
      return;
    }

    setGenerating(true);
    try {
      // Delete existing matches for this round
      await supabase.from('matches').delete().eq('swiss_round', roundNumber);

      let pairings: { team1: Team; team2: Team }[] = [];

      if (roundNumber === 1) {
        // First round: random pairing
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
          pairings.push({ team1: shuffledTeams[i], team2: shuffledTeams[i + 1] });
        }
      } else {
        // Subsequent rounds: pair by points (Swiss system)
        const sortedTeams = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.round_difference - a.round_difference;
        });

        // Get already played matchups
        const playedMatchups = new Set<string>();
        matches.filter(m => m.swiss_round && m.swiss_round < roundNumber).forEach(m => {
          if (m.team1_id && m.team2_id) {
            playedMatchups.add(`${m.team1_id}-${m.team2_id}`);
            playedMatchups.add(`${m.team2_id}-${m.team1_id}`);
          }
        });

        // Pair teams with similar points avoiding rematches
        const paired = new Set<string>();
        for (const standing of sortedTeams) {
          if (paired.has(standing.team_id)) continue;

          // Find opponent with similar points who hasn't been paired or played before
          for (const opponent of sortedTeams) {
            if (opponent.team_id === standing.team_id) continue;
            if (paired.has(opponent.team_id)) continue;
            if (playedMatchups.has(`${standing.team_id}-${opponent.team_id}`)) continue;

            const team1 = teams.find(t => t.id === standing.team_id);
            const team2 = teams.find(t => t.id === opponent.team_id);
            if (team1 && team2) {
              pairings.push({ team1, team2 });
              paired.add(standing.team_id);
              paired.add(opponent.team_id);
            }
            break;
          }
        }
      }

      // Create matches
      const baseDate = new Date(defaultDate);
      for (let i = 0; i < pairings.length; i++) {
        const scheduledAt = new Date(baseDate);
        scheduledAt.setMinutes(scheduledAt.getMinutes() + i * 30); // 30 min intervals

        await supabase.from('matches').insert({
          swiss_round: roundNumber,
          team1_id: pairings[i].team1.id,
          team2_id: pairings[i].team2.id,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
          round: `Runda ${roundNumber}`,
          is_playoff: false,
        });
      }

      toast.success(`Runda ${roundNumber} wygenerowana! (${pairings.length} meczów)`);
      fetchData();
    } catch (error) {
      console.error('Error generating round:', error);
      toast.error('Błąd podczas generowania rundy');
    } finally {
      setGenerating(false);
    }
  };

  const updateMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const winnerId = team1Score > team2Score ? match.team1_id : 
                       team2Score > team1Score ? match.team2_id : null;

      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          winner_id: winnerId,
          status: 'finished',
        })
        .eq('id', matchId);

      if (error) throw error;

      toast.success('Wynik zapisany');
      fetchData();
    } catch (error) {
      console.error('Error updating score:', error);
      toast.error('Błąd podczas zapisywania wyniku');
    }
  };

  const generatePlayoff = async () => {
    if (!defaultDate) {
      toast.error('Wybierz datę rozpoczęcia playoff');
      return;
    }

    setGenerating(true);
    try {
      // Get top teams from standings
      const topTeams = standings.slice(0, playoffTeams);
      if (topTeams.length < playoffTeams) {
        toast.error(`Potrzebujesz ${playoffTeams} drużyn w rankingu`);
        return;
      }

      // Delete existing playoff matches
      await supabase.from('matches').delete().eq('is_playoff', true);

      const totalRounds = playoffTeams === 16 ? 4 : 3;
      const matchesPerRound: Record<number, number> = {};
      let matchCount = playoffTeams / 2;
      for (let r = 1; r <= totalRounds; r++) {
        matchesPerRound[r] = matchCount;
        matchCount = matchCount / 2;
      }

      const createdMatches: { id: string; round: number; position: number }[] = [];
      const baseDate = new Date(defaultDate);

      // Create matches from final backwards
      for (let round = totalRounds; round >= 1; round--) {
        const matchesInRound = matchesPerRound[round];

        for (let pos = 1; pos <= matchesInRound; pos++) {
          const scheduledAt = new Date(baseDate);
          scheduledAt.setDate(scheduledAt.getDate() + (round - 1) * 2);

          let nextMatchId = null;
          if (round < totalRounds) {
            const nextPos = Math.ceil(pos / 2);
            const nextMatch = createdMatches.find(m => m.round === round + 1 && m.position === nextPos);
            nextMatchId = nextMatch?.id || null;
          }

          // First round has seeded teams
          let team1Id = null;
          let team2Id = null;
          if (round === 1) {
            // Seeding: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
            const seedPairs = playoffTeams === 16 
              ? [[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]]
              : [[1,8],[4,5],[2,7],[3,6]];
            const [seed1, seed2] = seedPairs[pos - 1] || [pos * 2 - 1, pos * 2];
            team1Id = topTeams[seed1 - 1]?.team_id || null;
            team2Id = topTeams[seed2 - 1]?.team_id || null;
          }

          const roundNames: Record<number, string> = playoffTeams === 16 ? {
            1: '1/8 Finału',
            2: 'Ćwierćfinały',
            3: 'Półfinały',
            4: 'Finał',
          } : {
            1: 'Ćwierćfinały',
            2: 'Półfinały',
            3: 'Finał',
          };

          const { data: newMatch, error } = await supabase
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
              is_playoff: true,
            })
            .select('id')
            .single();

          if (error) throw error;
          createdMatches.push({ id: newMatch.id, round, position: pos });
        }
      }

      toast.success('Drabinka playoff wygenerowana!');
      fetchData();
    } catch (error) {
      console.error('Error generating playoff:', error);
      toast.error('Błąd podczas generowania playoff');
    } finally {
      setGenerating(false);
    }
  };

  const clearSwiss = async () => {
    if (!confirm('Usunąć wszystkie mecze fazy szwajcarskiej?')) return;
    await supabase.from('matches').delete().not('swiss_round', 'is', null);
    toast.success('Faza szwajcarska usunięta');
    fetchData();
  };

  const getMatchesByRound = (round: number) => matches.filter(m => m.swiss_round === round);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Szwajcarski</h1>
          <p className="text-muted-foreground">Zarządzaj fazą szwajcarską i playoff</p>
        </div>
      </div>

      <Tabs defaultValue="swiss" className="space-y-6">
        <TabsList>
          <TabsTrigger value="swiss">Faza Szwajcarska</TabsTrigger>
          <TabsTrigger value="standings">Ranking</TabsTrigger>
          <TabsTrigger value="playoff">Playoff</TabsTrigger>
          <TabsTrigger value="config">Konfiguracja</TabsTrigger>
        </TabsList>

        <TabsContent value="swiss" className="space-y-6">
          {/* Generation controls */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              Generowanie rundy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Runda</label>
                <Select value={String(currentRound)} onValueChange={(v) => setCurrentRound(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].slice(0, totalRounds).map(r => (
                      <SelectItem key={r} value={String(r)}>Runda {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Data rundy</label>
                <Input
                  type="datetime-local"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={() => generateRound(currentRound)}
                  disabled={generating || teams.length < 2}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {generating ? 'Generowanie...' : `Generuj rundę ${currentRound}`}
                </Button>
              </div>

              <div className="flex items-end">
                {matches.filter(m => m.swiss_round).length > 0 && (
                  <Button variant="destructive" onClick={clearSwiss}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Usuń fazę
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Zarejestrowane drużyny: <span className="font-medium text-foreground">{teams.length}</span>
            </p>
          </div>

          {/* Matches by round */}
          {[1, 2, 3, 4, 5].map(round => {
            const roundMatches = getMatchesByRound(round);
            if (roundMatches.length === 0) return null;

            return (
              <div key={round} className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Runda {round} ({roundMatches.length} meczów)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roundMatches.map(match => (
                    <div key={match.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {match.team1?.logo_url && <img src={match.team1.logo_url} className="w-6 h-6 rounded" />}
                          <span className="font-medium text-foreground">{match.team1?.name || 'TBD'}</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          className="w-16 text-center"
                          defaultValue={match.team1_score ?? ''}
                          onBlur={(e) => {
                            const score1 = parseInt(e.target.value) || 0;
                            const score2Input = e.target.parentElement?.nextElementSibling?.querySelector('input');
                            const score2 = parseInt((score2Input as HTMLInputElement)?.value) || 0;
                            if (e.target.value) updateMatchScore(match.id, score1, score2);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {match.team2?.logo_url && <img src={match.team2.logo_url} className="w-6 h-6 rounded" />}
                          <span className="font-medium text-foreground">{match.team2?.name || 'TBD'}</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          className="w-16 text-center"
                          defaultValue={match.team2_score ?? ''}
                          onBlur={(e) => {
                            const score2 = parseInt(e.target.value) || 0;
                            const score1Input = e.target.parentElement?.previousElementSibling?.querySelector('input');
                            const score1 = parseInt((score1Input as HTMLInputElement)?.value) || 0;
                            if (e.target.value) updateMatchScore(match.id, score1, score2);
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {match.status === 'finished' ? (
                          <span className="text-green-400">Zakończony</span>
                        ) : (
                          new Date(match.scheduled_at).toLocaleString('pl-PL')
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="standings" className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Medal className="w-5 h-5 text-primary" />
              Ranking po fazie szwajcarskiej
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground">#</th>
                  <th className="text-left p-3 text-muted-foreground">Drużyna</th>
                  <th className="text-center p-3 text-muted-foreground">W</th>
                  <th className="text-center p-3 text-muted-foreground">L</th>
                  <th className="text-center p-3 text-muted-foreground">PKT</th>
                  <th className="text-center p-3 text-muted-foreground">+/-</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const advanced = s.wins >= winsToAdvance;
                  const eliminated = s.losses >= lossesToEliminate;
                  const rowClass = advanced ? 'bg-green-500/10' : eliminated ? 'bg-red-500/10' : '';
                  return (
                    <tr key={s.team_id} className={`border-b border-border/50 ${rowClass}`}>
                      <td className="p-3 font-bold text-foreground">{i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {s.logo_url && <img src={s.logo_url} className="w-6 h-6 rounded" />}
                          <span className="font-medium text-foreground">{s.team_name}</span>
                          {advanced && <span className="text-xs font-semibold text-green-400">AWANS</span>}
                          {eliminated && <span className="text-xs font-semibold text-red-400">ODPADA</span>}
                        </div>
                      </td>
                      <td className="p-3 text-center text-green-400 font-medium">{s.wins}</td>
                      <td className="p-3 text-center text-red-400 font-medium">{s.losses}</td>
                      <td className="p-3 text-center font-bold text-primary">{s.points}</td>
                      <td className="p-3 text-center text-muted-foreground">{s.round_difference > 0 ? '+' : ''}{s.round_difference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="playoff" className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Generowanie playoff
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Liczba drużyn</label>
                <Select value={String(playoffTeams)} onValueChange={(v) => setPlayoffTeams(Number(v) as 8 | 16)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">Top 8</SelectItem>
                    <SelectItem value="16">Top 16</SelectItem>
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

              <div className="flex items-end">
                <Button
                  onClick={generatePlayoff}
                  disabled={generating || standings.length < playoffTeams}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Generuj playoff
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Top {playoffTeams} drużyn z rankingu awansuje do fazy playoff (drabinka eliminacyjna).
            </p>
          </div>

          {/* Playoff bracket preview */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Drabinka playoff</h3>
            <p className="text-muted-foreground text-sm">
              Drabinka playoff będzie widoczna po wygenerowaniu. 
              Użyj zakładki "Drabinka" w menu głównym, aby zobaczyć pełny widok.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Konfiguracja Swiss
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Wygrane do awansu</label>
                <Select value={String(winsToAdvance)} onValueChange={(v) => setWinsToAdvance(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'wygrana' : n < 5 ? 'wygrane' : 'wygranych'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Drużyna z tyloma wygranymi otrzymuje status AWANS</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Przegrane do odpadnięcia</label>
                <Select value={String(lossesToEliminate)} onValueChange={(v) => setLossesToEliminate(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'przegrana' : n < 5 ? 'przegrane' : 'przegranych'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Drużyna z tyloma przegranymi otrzymuje status ODPADA</p>
              </div>
            </div>

            <Button onClick={saveSwissConfig}>
              <Save className="w-4 h-4 mr-2" />
              Zapisz konfigurację
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSwiss;
