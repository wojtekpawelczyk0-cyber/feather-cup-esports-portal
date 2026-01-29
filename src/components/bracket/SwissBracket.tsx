import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface SwissMatch {
  id: string;
  swiss_round: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  status: string;
  scheduled_at: string;
  team1?: Team | null;
  team2?: Team | null;
}

interface MatchCardProps {
  match: SwissMatch;
  showDate?: boolean;
  format?: string;
}

const MatchCard = ({ match, showDate = true, format = 'Bo1' }: MatchCardProps) => {
  const isFinished = match.status === 'finished';
  const team1Won = isFinished && match.winner_id === match.team1_id;
  const team2Won = isFinished && match.winner_id === match.team2_id;

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden min-w-[180px]">
      {/* Team 1 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b border-border/50',
        team1Won && 'bg-primary/10',
        isFinished && !team1Won && 'opacity-50'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.team1?.logo_url ? (
            <img src={match.team1.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
          ) : (
            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
              {match.team1?.name?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-sm font-medium truncate text-foreground">
            {match.team1?.name || 'TBD'}
          </span>
        </div>
        {isFinished && (
          <span className={cn('text-sm font-bold ml-2', team1Won ? 'text-primary' : 'text-muted-foreground')}>
            {match.team1_score ?? 0}
          </span>
        )}
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-center py-0.5 bg-secondary/30">
        <span className="text-xs text-muted-foreground font-medium">VS</span>
      </div>

      {/* Team 2 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        team2Won && 'bg-primary/10',
        isFinished && !team2Won && 'opacity-50'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.team2?.logo_url ? (
            <img src={match.team2.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
          ) : (
            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
              {match.team2?.name?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-sm font-medium truncate text-foreground">
            {match.team2?.name || 'TBD'}
          </span>
        </div>
        {isFinished && (
          <span className={cn('text-sm font-bold ml-2', team2Won ? 'text-primary' : 'text-muted-foreground')}>
            {match.team2_score ?? 0}
          </span>
        )}
      </div>

      {/* Footer */}
      {showDate && (
        <div className="px-3 py-1.5 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>{format}</span>
          <span>
            {match.status === 'live' ? (
              <span className="text-red-400 font-medium">● LIVE</span>
            ) : match.status === 'finished' ? (
              'Zakończony'
            ) : (
              new Date(match.scheduled_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
            )}
          </span>
        </div>
      )}
    </div>
  );
};

interface RecordColumnProps {
  title: string;
  wins: number;
  losses: number;
  matches: SwissMatch[];
  isAdvance?: boolean;
  isEliminated?: boolean;
  advanceLabel?: string;
  format?: string;
}

const RecordColumn = ({ 
  title, 
  matches, 
  isAdvance, 
  isEliminated, 
  advanceLabel,
  format = 'Bo1'
}: RecordColumnProps) => {
  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className={cn(
        'px-4 py-2 rounded-md mb-3 font-semibold text-sm',
        isAdvance && 'bg-primary text-primary-foreground',
        isEliminated && 'bg-destructive/20 text-destructive',
        !isAdvance && !isEliminated && 'bg-secondary text-foreground'
      )}>
        {title}
      </div>

      {/* Advance/Eliminate label */}
      {(isAdvance || isEliminated) && (
        <div className={cn(
          'px-3 py-1.5 rounded text-xs font-semibold mb-3',
          isAdvance && 'bg-primary/20 text-primary',
          isEliminated && 'bg-destructive/10 text-destructive'
        )}>
          {isAdvance ? advanceLabel || 'AWANSUJE' : 'ODPADA'}
        </div>
      )}

      {/* Matches */}
      <div className="flex flex-col gap-3">
        {matches.length > 0 ? (
          matches.map(match => (
            <MatchCard key={match.id} match={match} format={format} />
          ))
        ) : (
          <div className="min-w-[180px] h-20 border border-dashed border-border rounded-md flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Brak meczów</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SwissBracket = () => {
  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      // Fetch all Swiss matches with team data
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          swiss_round,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          winner_id,
          status,
          scheduled_at
        `)
        .not('swiss_round', 'is', null)
        .order('swiss_round')
        .order('scheduled_at');

      if (matchesError) throw matchesError;

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, logo_url');

      const teamsMap = new Map((teamsData || []).map(t => [t.id, t]));

      const matchesWithTeams = (matchesData || []).map(m => ({
        ...m,
        team1: m.team1_id ? teamsMap.get(m.team1_id) || null : null,
        team2: m.team2_id ? teamsMap.get(m.team2_id) || null : null,
      }));

      setMatches(matchesWithTeams);
    } catch (error) {
      console.error('Error fetching Swiss matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate team records based on completed matches
  const getTeamRecords = () => {
    const records: Record<string, { wins: number; losses: number }> = {};

    matches.filter(m => m.status === 'finished').forEach(match => {
      if (match.team1_id) {
        if (!records[match.team1_id]) records[match.team1_id] = { wins: 0, losses: 0 };
        if (match.winner_id === match.team1_id) {
          records[match.team1_id].wins++;
        } else {
          records[match.team1_id].losses++;
        }
      }
      if (match.team2_id) {
        if (!records[match.team2_id]) records[match.team2_id] = { wins: 0, losses: 0 };
        if (match.winner_id === match.team2_id) {
          records[match.team2_id].wins++;
        } else {
          records[match.team2_id].losses++;
        }
      }
    });

    return records;
  };

  // Group matches by round
  const getMatchesByRound = (round: number) => matches.filter(m => m.swiss_round === round);

  // Get format label based on round
  const getFormat = (round: number) => {
    if (round <= 2) return 'Bo1';
    return 'Bo3';
  };

  const records = getTeamRecords();
  const round1 = getMatchesByRound(1);
  const round2 = getMatchesByRound(2);
  const round3 = getMatchesByRound(3);
  const round4 = getMatchesByRound(4);
  const round5 = getMatchesByRound(5);

  // Get advancing and eliminated teams
  const advancedTeams = Object.entries(records).filter(([_, r]) => r.wins >= 3);
  const eliminatedTeams = Object.entries(records).filter(([_, r]) => r.losses >= 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Ładowanie drabinki szwajcarskiej...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Faza szwajcarska nie została jeszcze rozpoczęta.</p>
        <p className="text-sm text-muted-foreground/70">Administratorzy mogą wygenerować rundy w panelu admina.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="min-w-max p-4">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">SWISS STAGE</h2>
        </div>

        {/* Swiss bracket grid */}
        <div className="flex gap-6 justify-center">
          {/* Round 1: 0-0 */}
          <RecordColumn
            title="0 – 0"
            wins={0}
            losses={0}
            matches={round1}
            format={getFormat(1)}
          />

          {/* Round 2: 1-0 and 0-1 */}
          <div className="flex flex-col gap-8">
            <RecordColumn
              title="1 – 0"
              wins={1}
              losses={0}
              matches={round2.slice(0, Math.ceil(round2.length / 2))}
              format={getFormat(2)}
            />
            <RecordColumn
              title="0 – 1"
              wins={0}
              losses={1}
              matches={round2.slice(Math.ceil(round2.length / 2))}
              format={getFormat(2)}
            />
          </div>

          {/* Round 3: 2-0, 1-1, 0-2 */}
          <div className="flex flex-col gap-6">
            <RecordColumn
              title="2 – 0"
              wins={2}
              losses={0}
              matches={round3.slice(0, Math.ceil(round3.length / 4))}
              format={getFormat(3)}
            />
            <RecordColumn
              title="1 – 1"
              wins={1}
              losses={1}
              matches={round3.slice(Math.ceil(round3.length / 4), Math.ceil(round3.length * 3 / 4))}
              format={getFormat(3)}
            />
            <RecordColumn
              title="0 – 2"
              wins={0}
              losses={2}
              matches={round3.slice(Math.ceil(round3.length * 3 / 4))}
              format={getFormat(3)}
            />
          </div>

          {/* Round 4: 3-0 (Advance), 2-1, 1-2, 0-3 (Eliminated) */}
          <div className="flex flex-col gap-6">
            <RecordColumn
              title="3 – 0"
              wins={3}
              losses={0}
              matches={[]}
              isAdvance
              advanceLabel="1-2 miejsce"
              format={getFormat(4)}
            />
            <RecordColumn
              title="2 – 1"
              wins={2}
              losses={1}
              matches={round4.slice(0, Math.ceil(round4.length / 2))}
              format={getFormat(4)}
            />
            <RecordColumn
              title="1 – 2"
              wins={1}
              losses={2}
              matches={round4.slice(Math.ceil(round4.length / 2))}
              format={getFormat(4)}
            />
            <RecordColumn
              title="0 – 3"
              wins={0}
              losses={3}
              matches={[]}
              isEliminated
              format={getFormat(4)}
            />
          </div>

          {/* Round 5: 3-1 (Advance), 2-2, 1-3 (Eliminated) */}
          <div className="flex flex-col gap-6">
            <RecordColumn
              title="3 – 1"
              wins={3}
              losses={1}
              matches={[]}
              isAdvance
              advanceLabel="3-5 miejsce"
              format={getFormat(5)}
            />
            <RecordColumn
              title="2 – 2"
              wins={2}
              losses={2}
              matches={round5}
              format={getFormat(5)}
            />
            <RecordColumn
              title="1 – 3"
              wins={1}
              losses={3}
              matches={[]}
              isEliminated
              format={getFormat(5)}
            />
          </div>

          {/* Final outcomes: 3-2 (Advance), 2-3 (Eliminated) */}
          <div className="flex flex-col gap-6">
            <RecordColumn
              title="3 – 2"
              wins={3}
              losses={2}
              matches={[]}
              isAdvance
              advanceLabel="6-8 miejsce"
              format="Bo3"
            />
            <RecordColumn
              title="2 – 3"
              wins={2}
              losses={3}
              matches={[]}
              isEliminated
              format="Bo3"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span className="text-muted-foreground">Awansuje do playoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/30" />
            <span className="text-muted-foreground">Odpada z turnieju</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="glass-card px-6 py-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Awansowało</div>
              <div className="text-xl font-bold text-primary">{advancedTeams.length}/8</div>
            </div>
          </div>
          <div className="glass-card px-6 py-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-destructive" />
            <div>
              <div className="text-sm text-muted-foreground">Odpadło</div>
              <div className="text-xl font-bold text-destructive">{eliminatedTeams.length}/24</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissBracket;
