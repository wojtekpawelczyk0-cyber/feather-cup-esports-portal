import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface BracketMatch {
  id: string;
  round_number: number;
  bracket_position: number;
  team1: Team | null;
  team2: Team | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  status: string;
  scheduled_at: string;
}

interface TournamentBracketProps {
  teamCount?: 16 | 32;
}

const getRoundName = (roundNumber: number, totalRounds: number): string => {
  const roundsFromEnd = totalRounds - roundNumber + 1;
  switch (roundsFromEnd) {
    case 1: return 'Finał';
    case 2: return 'Półfinały';
    case 3: return 'Ćwierćfinały';
    case 4: return '1/8 Finału';
    case 5: return '1/16 Finału';
    default: return `Runda ${roundNumber}`;
  }
};

const TournamentBracket = ({ teamCount = 16 }: TournamentBracketProps) => {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const totalRounds = teamCount === 32 ? 5 : 4;

  useEffect(() => {
    fetchBracketMatches();
  }, []);

  const fetchBracketMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          round_number,
          bracket_position,
          team1_score,
          team2_score,
          winner_id,
          status,
          scheduled_at,
          team1:team1_id(id, name, logo_url),
          team2:team2_id(id, name, logo_url)
        `)
        .not('round_number', 'is', null)
        .order('round_number', { ascending: true })
        .order('bracket_position', { ascending: true });

      if (error) throw error;

      const formattedMatches = (data || []).map((m: any) => ({
        id: m.id,
        round_number: m.round_number,
        bracket_position: m.bracket_position,
        team1: m.team1,
        team2: m.team2,
        team1_score: m.team1_score,
        team2_score: m.team2_score,
        winner_id: m.winner_id,
        status: m.status,
        scheduled_at: m.scheduled_at,
      }));

      setMatches(formattedMatches);
    } catch (error) {
      console.error('Error fetching bracket matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchesByRound = (roundNumber: number) => {
    return matches.filter(m => m.round_number === roundNumber)
      .sort((a, b) => a.bracket_position - b.bracket_position);
  };

  const MatchCard = ({ match }: { match: BracketMatch }) => {
    const isFinished = match.status === 'finished';
    const team1Won = isFinished && match.winner_id === match.team1?.id;
    const team2Won = isFinished && match.winner_id === match.team2?.id;

    return (
      <div className="bg-card/50 border border-border rounded-lg overflow-hidden min-w-[200px]">
        {/* Team 1 */}
        <div className={`flex items-center justify-between p-2 border-b border-border/50 ${team1Won ? 'bg-green-500/10' : ''} ${isFinished && !team1Won ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.team1?.logo_url ? (
              <img src={match.team1.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                {match.team1?.name?.charAt(0) || '?'}
              </div>
            )}
            <span className="text-sm font-medium truncate text-foreground">
              {match.team1?.name || 'TBD'}
            </span>
            {team1Won && <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
          </div>
          <span className={`text-sm font-bold ml-2 ${team1Won ? 'text-green-400' : 'text-muted-foreground'}`}>
            {match.team1_score ?? '-'}
          </span>
        </div>
        
        {/* Team 2 */}
        <div className={`flex items-center justify-between p-2 ${team2Won ? 'bg-green-500/10' : ''} ${isFinished && !team2Won ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.team2?.logo_url ? (
              <img src={match.team2.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                {match.team2?.name?.charAt(0) || '?'}
              </div>
            )}
            <span className="text-sm font-medium truncate text-foreground">
              {match.team2?.name || 'TBD'}
            </span>
            {team2Won && <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
          </div>
          <span className={`text-sm font-bold ml-2 ${team2Won ? 'text-green-400' : 'text-muted-foreground'}`}>
            {match.team2_score ?? '-'}
          </span>
        </div>

        {/* Match info */}
        <div className="px-2 py-1 bg-muted/30 text-center">
          <span className="text-xs text-muted-foreground">
            {match.status === 'live' && <span className="text-red-400 font-medium">● LIVE</span>}
            {match.status === 'scheduled' && new Date(match.scheduled_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {match.status === 'finished' && 'Zakończony'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Ładowanie drabinki...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Drabinka turniejowa nie została jeszcze utworzona.</p>
        <p className="text-sm text-muted-foreground/70">Administratorzy mogą wygenerować drabinkę w panelu admina.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max p-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNumber => {
          const roundMatches = getMatchesByRound(roundNumber);
          if (roundMatches.length === 0) return null;

          return (
            <div key={roundNumber} className="flex flex-col">
              <h3 className="text-sm font-semibold text-primary mb-4 text-center">
                {getRoundName(roundNumber, totalRounds)}
              </h3>
              <div 
                className="flex flex-col justify-around flex-1 gap-4"
                style={{ 
                  paddingTop: `${Math.pow(2, roundNumber - 1) * 20}px`,
                  gap: `${Math.pow(2, roundNumber) * 20}px` 
                }}
              >
                {roundMatches.map(match => (
                  <div key={match.id} className="relative">
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TournamentBracket;
