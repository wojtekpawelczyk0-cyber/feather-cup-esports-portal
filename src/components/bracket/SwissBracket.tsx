import { useEffect, useState, useRef } from 'react';
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

// Match card for Swiss bracket
const SwissMatchCard = ({ 
  match, 
  matchRef 
}: { 
  match: SwissMatch; 
  matchRef?: React.RefObject<HTMLDivElement>;
}) => {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const team1Won = isFinished && match.winner_id === match.team1_id;
  const team2Won = isFinished && match.winner_id === match.team2_id;

  return (
    <div 
      ref={matchRef}
      className={cn(
        "bg-card/80 backdrop-blur border rounded-lg overflow-hidden w-[200px] shadow-lg transition-all duration-200",
        isLive && "border-orange-500 ring-1 ring-orange-500/50",
        isFinished && "border-border/50",
        !isFinished && !isLive && "border-border"
      )}
    >
      {/* Team 1 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        team1Won && 'bg-primary/15',
        isFinished && !team1Won && 'opacity-60'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.team1?.logo_url ? (
            <img src={match.team1.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
          ) : (
            <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
              {match.team1?.name?.charAt(0) || '?'}
            </div>
          )}
          <span className={cn(
            "text-sm font-medium truncate",
            team1Won ? "text-primary" : "text-foreground"
          )}>
            {match.team1?.name || 'TBD'}
          </span>
          {team1Won && <Trophy className="w-3 h-3 text-primary flex-shrink-0" />}
        </div>
        <span className={cn(
          'text-sm font-bold ml-2 min-w-[20px] text-right',
          team1Won ? 'text-primary' : 'text-muted-foreground'
        )}>
          {isFinished || isLive ? (match.team1_score ?? 0) : '-'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/30" />

      {/* Team 2 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        team2Won && 'bg-primary/15',
        isFinished && !team2Won && 'opacity-60'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.team2?.logo_url ? (
            <img src={match.team2.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
          ) : (
            <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
              {match.team2?.name?.charAt(0) || '?'}
            </div>
          )}
          <span className={cn(
            "text-sm font-medium truncate",
            team2Won ? "text-primary" : "text-foreground"
          )}>
            {match.team2?.name || 'TBD'}
          </span>
          {team2Won && <Trophy className="w-3 h-3 text-primary flex-shrink-0" />}
        </div>
        <span className={cn(
          'text-sm font-bold ml-2 min-w-[20px] text-right',
          team2Won ? 'text-primary' : 'text-muted-foreground'
        )}>
          {isFinished || isLive ? (match.team2_score ?? 0) : '-'}
        </span>
      </div>

      {/* Status footer */}
      {isLive && (
        <div className="px-3 py-1 bg-orange-500/20 text-center">
          <span className="text-xs font-bold text-orange-400">● LIVE</span>
        </div>
      )}
    </div>
  );
};

// Column header showing W-L record
const RecordHeader = ({ 
  wins, 
  losses, 
  isAdvance, 
  isEliminated,
  label 
}: { 
  wins: number; 
  losses: number; 
  isAdvance?: boolean; 
  isEliminated?: boolean;
  label?: string;
}) => (
  <div className="flex flex-col items-center mb-4">
    <div className={cn(
      "px-6 py-2 rounded-lg font-bold text-lg",
      isAdvance && "bg-primary text-primary-foreground",
      isEliminated && "bg-destructive/30 text-destructive",
      !isAdvance && !isEliminated && "bg-secondary/80 text-foreground"
    )}>
      {wins} – {losses}
    </div>
    {label && (
      <div className={cn(
        "mt-2 px-3 py-1 rounded text-xs font-semibold",
        isAdvance && "bg-primary/20 text-primary",
        isEliminated && "bg-destructive/20 text-destructive"
      )}>
        {label}
      </div>
    )}
  </div>
);

// Swiss bracket visualization like LoL Worlds
const SwissBracket = () => {
  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .not('swiss_round', 'is', null)
        .order('swiss_round')
        .order('scheduled_at');

      if (matchesError) throw matchesError;

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

  // Group matches by swiss round
  const getMatchesByRound = (round: number) => matches.filter(m => m.swiss_round === round);

  // Calculate team records from finished matches
  const getTeamRecords = () => {
    const records: Record<string, { wins: number; losses: number }> = {};
    
    matches.filter(m => m.status === 'finished').forEach(match => {
      if (match.team1_id) {
        if (!records[match.team1_id]) records[match.team1_id] = { wins: 0, losses: 0 };
        if (match.winner_id === match.team1_id) records[match.team1_id].wins++;
        else records[match.team1_id].losses++;
      }
      if (match.team2_id) {
        if (!records[match.team2_id]) records[match.team2_id] = { wins: 0, losses: 0 };
        if (match.winner_id === match.team2_id) records[match.team2_id].wins++;
        else records[match.team2_id].losses++;
      }
    });
    
    return records;
  };

  const records = getTeamRecords();
  const advancedTeams = Object.entries(records).filter(([_, r]) => r.wins >= 3);
  const eliminatedTeams = Object.entries(records).filter(([_, r]) => r.losses >= 3);

  // Group matches by their W-L stage
  const round1 = getMatchesByRound(1); // 0-0 matches
  const round2 = getMatchesByRound(2); // 1-0 and 0-1 matches
  const round3 = getMatchesByRound(3); // 2-0, 1-1, 0-2 matches
  const round4 = getMatchesByRound(4); // 2-1, 1-2 matches
  const round5 = getMatchesByRound(5); // 2-2 matches

  // Split round 2 into winners (1-0) and losers (0-1)
  const round2Upper = round2.slice(0, Math.ceil(round2.length / 2));
  const round2Lower = round2.slice(Math.ceil(round2.length / 2));

  // Split round 3
  const round3_20 = round3.slice(0, Math.ceil(round3.length / 4)); // 2-0
  const round3_11 = round3.slice(Math.ceil(round3.length / 4), Math.ceil(round3.length * 3 / 4)); // 1-1
  const round3_02 = round3.slice(Math.ceil(round3.length * 3 / 4)); // 0-2

  // Split round 4
  const round4_21 = round4.slice(0, Math.ceil(round4.length / 2)); // 2-1
  const round4_12 = round4.slice(Math.ceil(round4.length / 2)); // 1-2

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
        <p className="text-sm text-muted-foreground/70 mt-2">Administratorzy mogą wygenerować rundy w panelu admina.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-6" ref={containerRef}>
      <div className="min-w-max p-6">
        {/* Title */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">SWISS STAGE</h2>
        </div>

        {/* Swiss bracket - horizontal layout with connecting visual flow */}
        <div className="relative">
          {/* SVG for connecting lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '800px' }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Grid layout for Swiss stages */}
          <div className="grid grid-cols-7 gap-8 relative z-10">
            {/* Column 1: 0-0 (Round 1) */}
            <div className="flex flex-col items-center">
              <RecordHeader wins={0} losses={0} />
              <div className="flex flex-col gap-3">
                {round1.map(match => (
                  <SwissMatchCard key={match.id} match={match} />
                ))}
                {round1.length === 0 && (
                  <div className="w-[200px] h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Oczekuje</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: 1-0 (Upper) and 0-1 (Lower) */}
            <div className="flex flex-col items-center gap-12">
              <div className="flex flex-col items-center">
                <RecordHeader wins={1} losses={0} />
                <div className="flex flex-col gap-3">
                  {round2Upper.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={0} losses={1} />
                <div className="flex flex-col gap-3">
                  {round2Lower.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3: 2-0, 1-1, 0-2 */}
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col items-center">
                <RecordHeader wins={2} losses={0} />
                <div className="flex flex-col gap-3">
                  {round3_20.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={1} losses={1} />
                <div className="flex flex-col gap-3">
                  {round3_11.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={0} losses={2} />
                <div className="flex flex-col gap-3">
                  {round3_02.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            </div>

            {/* Column 4: 3-0 (Advance), 2-1, 1-2, 0-3 (Eliminated) */}
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col items-center">
                <RecordHeader wins={3} losses={0} isAdvance label="AWANSUJE" />
                <div className="w-[200px] min-h-[60px] border-2 border-primary/50 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-primary font-semibold">Miejsce 1-2</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={2} losses={1} />
                <div className="flex flex-col gap-3">
                  {round4_21.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={1} losses={2} />
                <div className="flex flex-col gap-3">
                  {round4_12.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={0} losses={3} isEliminated label="ODPADA" />
                <div className="w-[200px] min-h-[60px] border-2 border-destructive/50 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-destructive font-semibold">Eliminacja</span>
                </div>
              </div>
            </div>

            {/* Column 5: 3-1 (Advance), 2-2, 1-3 (Eliminated) */}
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col items-center">
                <RecordHeader wins={3} losses={1} isAdvance label="AWANSUJE" />
                <div className="w-[200px] min-h-[60px] border-2 border-primary/50 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-primary font-semibold">Miejsce 3-4</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={2} losses={2} />
                <div className="flex flex-col gap-3">
                  {round5.map(match => (
                    <SwissMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RecordHeader wins={1} losses={3} isEliminated label="ODPADA" />
                <div className="w-[200px] min-h-[60px] border-2 border-destructive/50 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-destructive font-semibold">Eliminacja</span>
                </div>
              </div>
            </div>

            {/* Column 6: 3-2 (Advance), 2-3 (Eliminated) */}
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col items-center">
                <RecordHeader wins={3} losses={2} isAdvance label="AWANSUJE" />
                <div className="w-[200px] min-h-[60px] border-2 border-primary/50 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-primary font-semibold">Miejsce 5-8</span>
                </div>
              </div>
              <div className="flex flex-col items-center mt-auto">
                <RecordHeader wins={2} losses={3} isEliminated label="ODPADA" />
                <div className="w-[200px] min-h-[60px] border-2 border-destructive/50 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-destructive font-semibold">Eliminacja</span>
                </div>
              </div>
            </div>

            {/* Column 7: Summary */}
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">{advancedTeams.length}</div>
                <div className="text-sm text-muted-foreground">Awansowało do playoff</div>
                <div className="text-xs text-muted-foreground/70 mt-1">z 8 miejsc</div>
              </div>
              <div className="glass-card p-6 rounded-xl text-center">
                <Users className="w-10 h-10 text-destructive mx-auto mb-3" />
                <div className="text-3xl font-bold text-destructive mb-1">{eliminatedTeams.length}</div>
                <div className="text-sm text-muted-foreground">Odpadło</div>
                <div className="text-xs text-muted-foreground/70 mt-1">z {matches.length > 0 ? 16 : 0} drużyn</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-10 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span className="text-muted-foreground">Awansuje do Playoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/50" />
            <span className="text-muted-foreground">Odpada z turnieju</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-orange-500" />
            <span className="text-muted-foreground">Mecz na żywo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissBracket;
