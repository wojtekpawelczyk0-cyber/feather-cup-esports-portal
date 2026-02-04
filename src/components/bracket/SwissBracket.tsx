import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';
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

// Horizontal match card like RLCS style
const SwissMatchCard = ({ 
  match,
  className,
  dataId
}: { 
  match: SwissMatch;
  className?: string;
  dataId?: string;
}) => {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const team1Won = isFinished && match.winner_id === match.team1_id;
  const team2Won = isFinished && match.winner_id === match.team2_id;

  return (
    <div 
      data-match-id={dataId}
      className={cn(
        "flex items-center bg-[#1a2744] rounded-lg overflow-hidden border border-[#2a3a5a] shadow-lg",
        isLive && "border-orange-500 ring-2 ring-orange-500/30",
        className
      )}
    >
      {/* Team 1 */}
      <div className={cn(
        "flex items-center justify-center gap-1 px-2 py-2 min-w-[70px]",
        isFinished && team1Won && "bg-emerald-500/20",
        isFinished && !team1Won && "bg-red-500/20"
      )}>
        {match.team1?.logo_url ? (
          <img src={match.team1.logo_url} alt="" className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 rounded bg-[#2a3a5a] flex items-center justify-center text-xs font-bold text-white">
            {match.team1?.name?.substring(0, 2).toUpperCase() || '??'}
          </div>
        )}
      </div>

      {/* VS */}
      <div className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-[#0f1829]">
        VS
      </div>

      {/* Team 2 */}
      <div className={cn(
        "flex items-center justify-center gap-1 px-2 py-2 min-w-[70px]",
        isFinished && team2Won && "bg-emerald-500/20",
        isFinished && !team2Won && "bg-red-500/20"
      )}>
        {match.team2?.logo_url ? (
          <img src={match.team2.logo_url} alt="" className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 rounded bg-[#2a3a5a] flex items-center justify-center text-xs font-bold text-white">
            {match.team2?.name?.substring(0, 2).toUpperCase() || '??'}
          </div>
        )}
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="px-2 py-1 bg-orange-500 text-white text-[10px] font-bold">
          LIVE
        </div>
      )}
    </div>
  );
};

// Team slot for qualified/eliminated sections
const TeamSlot = ({ 
  team, 
  isQualified, 
  isEliminated 
}: { 
  team?: Team | null; 
  isQualified?: boolean; 
  isEliminated?: boolean;
}) => (
  <div className={cn(
    "w-10 h-10 rounded flex items-center justify-center",
    isQualified && "bg-emerald-600/30 border border-emerald-500",
    isEliminated && "bg-red-900/30 border border-red-700",
    !isQualified && !isEliminated && "bg-[#2a3a5a]"
  )}>
    {team?.logo_url ? (
      <img src={team.logo_url} alt="" className="w-7 h-7 object-contain" />
    ) : (
      <div className="text-xs font-bold text-white/50">
        {team?.name?.substring(0, 2).toUpperCase() || '?'}
      </div>
    )}
  </div>
);

// Section header
const SectionHeader = ({ 
  label, 
  type 
}: { 
  label: string; 
  type: 'normal' | 'qualified' | 'eliminated' | 'tiebreaker';
}) => (
  <div className={cn(
    "px-4 py-1.5 rounded-t-lg text-sm font-bold text-center",
    type === 'normal' && "bg-[#2a3a5a] text-white",
    type === 'qualified' && "bg-emerald-600 text-white",
    type === 'eliminated' && "bg-red-800 text-white",
    type === 'tiebreaker' && "bg-amber-500 text-black"
  )}>
    {label}
  </div>
);

// Column of matches with header
const MatchColumn = ({ 
  header, 
  headerType = 'normal',
  matches,
  teams,
  isResult = false,
  resultType,
  className
}: { 
  header: string;
  headerType?: 'normal' | 'qualified' | 'eliminated' | 'tiebreaker';
  matches?: SwissMatch[];
  teams?: (Team | null)[];
  isResult?: boolean;
  resultType?: 'qualified' | 'eliminated';
  className?: string;
}) => (
  <div className={cn("flex flex-col", className)}>
    <SectionHeader label={header} type={headerType} />
    <div className={cn(
      "flex flex-col gap-2 p-2 rounded-b-lg",
      headerType === 'normal' && "bg-[#1a2744]/80",
      headerType === 'qualified' && "bg-emerald-900/40",
      headerType === 'eliminated' && "bg-red-900/40",
      headerType === 'tiebreaker' && "bg-amber-900/40"
    )}>
      {isResult && teams ? (
        <div className="flex gap-1 justify-center flex-wrap">
          {teams.map((team, idx) => (
            <TeamSlot 
              key={team?.id || idx} 
              team={team} 
              isQualified={resultType === 'qualified'}
              isEliminated={resultType === 'eliminated'}
            />
          ))}
        </div>
      ) : matches && matches.length > 0 ? (
        matches.map((match, idx) => (
          <SwissMatchCard 
            key={match.id} 
            match={match} 
            dataId={`${header}-${idx}`}
          />
        ))
      ) : (
        <div className="text-xs text-muted-foreground text-center py-4">
          Oczekuje
        </div>
      )}
    </div>
  </div>
);

const SwissBracket = () => {
  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; }[]>([]);

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
      setTeams(teamsMap);

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
  const getMatchesByRound = useCallback((round: number) => 
    matches.filter(m => m.swiss_round === round), [matches]);

  // Calculate team records
  const getTeamRecords = useCallback(() => {
    const records: Record<string, { wins: number; losses: number; team: Team | null }> = {};
    
    matches.filter(m => m.status === 'finished').forEach(match => {
      if (match.team1_id) {
        if (!records[match.team1_id]) records[match.team1_id] = { wins: 0, losses: 0, team: match.team1 || null };
        if (match.winner_id === match.team1_id) records[match.team1_id].wins++;
        else records[match.team1_id].losses++;
      }
      if (match.team2_id) {
        if (!records[match.team2_id]) records[match.team2_id] = { wins: 0, losses: 0, team: match.team2 || null };
        if (match.winner_id === match.team2_id) records[match.team2_id].wins++;
        else records[match.team2_id].losses++;
      }
    });
    
    return records;
  }, [matches]);

  const records = getTeamRecords();
  
  // Get teams by record
  const getTeamsByRecord = (wins: number, losses: number) => 
    Object.entries(records)
      .filter(([_, r]) => r.wins === wins && r.losses === losses)
      .map(([_, r]) => r.team);

  // Get qualified and eliminated teams
  const qualifiedTeams = Object.entries(records).filter(([_, r]) => r.wins >= 3).map(([_, r]) => r.team);
  const eliminatedTeams = Object.entries(records).filter(([_, r]) => r.losses >= 3).map(([_, r]) => r.team);

  // Group matches by swiss round (for 32 teams)
  const round1 = getMatchesByRound(1); // 16 matches (0-0)
  const round2 = getMatchesByRound(2); // 16 matches total
  const round3 = getMatchesByRound(3); // 16 matches total
  const round4 = getMatchesByRound(4); // 8 matches total
  const round5 = getMatchesByRound(5); // 8 matches total

  // Split round 2 into 1-0 and 0-1 (8 each for 32 teams)
  const round2_10 = round2.slice(0, 8);
  const round2_01 = round2.slice(8, 16);
  
  // Split round 3 into 2-0, 1-1, 0-2 (4, 8, 4 for 32 teams)
  const round3_20 = round3.slice(0, 4);
  const round3_11 = round3.slice(4, 12);
  const round3_02 = round3.slice(12, 16);
  
  // Split round 4 into 2-1 and 1-2 (4 each for 32 teams)
  const round4_21 = round4.slice(0, 4);
  const round4_12 = round4.slice(4, 8);

  // Round 5 is 2-2 (8 matches for 32 teams)
  const round5_22 = round5;

  // Teams that went 3-0, 3-1, 3-2 (qualified) and 0-3, 1-3, 2-3 (eliminated)
  const teams30 = getTeamsByRecord(3, 0); // 4 teams
  const teams31 = getTeamsByRecord(3, 1); // 4 teams
  const teams32 = getTeamsByRecord(3, 2); // 8 teams
  const teams03 = getTeamsByRecord(0, 3); // 4 teams
  const teams13 = getTeamsByRecord(1, 3); // 4 teams
  const teams23 = getTeamsByRecord(2, 3); // 8 teams

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
    <div 
      className="w-full overflow-x-auto pb-6"
      style={{ 
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0f1829 100%)'
      }}
    >
      <div className="min-w-max p-8" ref={containerRef}>
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wider mb-1">
            SWISS BRACKET
          </h2>
          <p className="text-sm text-muted-foreground">System szwajcarski</p>
        </div>

        {/* Swiss bracket grid with connections */}
        <div className="relative">
          {/* SVG for connecting lines */}
          <svg 
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ minWidth: '100%', minHeight: '100%' }}
          >
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {/* Lines will be drawn here dynamically if needed */}
          </svg>

          {/* Bracket grid */}
          <div className="flex gap-4 items-start relative z-10">
            {/* Column 1: 0-0 */}
            <div className="flex flex-col">
              <MatchColumn header="0 - 0" matches={round1} />
            </div>

            {/* Connector lines visual placeholder */}
            <div className="flex flex-col justify-around self-stretch py-8">
              {[...Array(Math.max(Math.floor(round1.length / 2), 1))].map((_, i) => (
                <div key={i} className="w-8 flex flex-col items-center justify-center gap-1">
                  <div className="w-full h-px bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
                </div>
              ))}
            </div>

            {/* Column 2: 1-0 and 0-1 */}
            <div className="flex flex-col gap-6">
              <MatchColumn header="1 - 0" matches={round2_10} />
              <MatchColumn header="0 - 1" matches={round2_01} />
            </div>

            {/* Connector */}
            <div className="flex flex-col justify-around self-stretch py-8">
              <div className="h-px w-8 bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
            </div>

            {/* Column 3: 2-0, 1-1, 0-2 */}
            <div className="flex flex-col gap-4">
              <MatchColumn header="2 - 0" matches={round3_20} />
              <MatchColumn header="1 - 1" matches={round3_11} />
              <MatchColumn header="0 - 2" matches={round3_02} />
            </div>

            {/* Connector */}
            <div className="flex flex-col justify-around self-stretch py-8">
              <div className="h-px w-8 bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
            </div>

            {/* Column 4: 3-0 Qualified, 2-1, 1-2, 0-3 Eliminated */}
            <div className="flex flex-col gap-4">
              <MatchColumn 
                header="QUALIFIED" 
                headerType="qualified"
                isResult
                resultType="qualified"
                teams={teams30}
              />
              <MatchColumn header="2 - 1" matches={round4_21} />
              <MatchColumn header="1 - 2" matches={round4_12} />
              <MatchColumn 
                header="ELIMINATED" 
                headerType="eliminated"
                isResult
                resultType="eliminated"
                teams={teams03}
              />
            </div>

            {/* Connector */}
            <div className="flex flex-col justify-around self-stretch py-8">
              <div className="h-px w-8 bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
            </div>

            {/* Column 5: 3-1 Qualified, 2-2, 1-3 Eliminated */}
            <div className="flex flex-col gap-4">
              <MatchColumn 
                header="QUALIFIED" 
                headerType="qualified"
                isResult
                resultType="qualified"
                teams={teams31}
              />
              <MatchColumn header="2 - 2" matches={round5_22} />
              <MatchColumn 
                header="ELIMINATED" 
                headerType="eliminated"
                isResult
                resultType="eliminated"
                teams={teams13}
              />
            </div>

            {/* Connector */}
            <div className="flex flex-col justify-around self-stretch py-8">
              <div className="h-px w-8 bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
            </div>

            {/* Column 6: 3-2 Qualified, 2-3 Eliminated */}
            <div className="flex flex-col gap-4">
              <MatchColumn 
                header="QUALIFIED" 
                headerType="qualified"
                isResult
                resultType="qualified"
                teams={teams32}
              />
              <MatchColumn 
                header="ELIMINATED" 
                headerType="eliminated"
                isResult
                resultType="eliminated"
                teams={teams23}
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-10 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-600" />
            <span className="text-white/70">Awansuje do Playoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-800" />
            <span className="text-white/70">Odpada z turnieju</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-orange-500 bg-orange-500/20" />
            <span className="text-white/70">Mecz na żywo</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="bg-[#1a2744] px-6 py-3 rounded-lg flex items-center gap-3 border border-[#2a3a5a]">
            <Trophy className="w-6 h-6 text-emerald-500" />
            <div>
              <div className="text-xs text-muted-foreground">Awansowało</div>
              <div className="text-xl font-bold text-emerald-500">{qualifiedTeams.length}/16</div>
            </div>
          </div>
          <div className="bg-[#1a2744] px-6 py-3 rounded-lg flex items-center gap-3 border border-[#2a3a5a]">
            <div className="w-6 h-6 text-red-500 flex items-center justify-center font-bold">✕</div>
            <div>
              <div className="text-xs text-muted-foreground">Odpadło</div>
              <div className="text-xl font-bold text-red-500">{eliminatedTeams.length}/16</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissBracket;
