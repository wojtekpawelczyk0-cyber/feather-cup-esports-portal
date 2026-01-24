import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

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
  winner_id: string | null;
  team1?: Team | null;
  team2?: Team | null;
}

// Notification sound as base64 (short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVoYCVeV1OKtZSURDlKLzuCqZCYXEU+GyNymZCgaE0yBxNejZCseFUl8wNSgZCweF0Z3vdGdZC4gGEN0utGeZDAiGkFxuM6bYzIjG0BwuMybYzQlHT9utsqZYzYmHj5ttsqZYzYmHj5ttsqZYzYmHz5utsqaYzYmHj5utsqaYzYm';

const playNotificationSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

const triggerConfetti = (isFinal = false) => {
  if (isFinal) {
    // Epic finale confetti - multiple bursts
    const duration = 6000;
    const end = Date.now() + duration;

    // Initial big explosion
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#ffffff', '#ff6b35']
    });

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#ffffff']
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#ffffff']
      });
    }, 300);

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#ffffff', '#ff6b35']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#ffffff', '#ff6b35']
      });
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 120,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#FFD700', '#FFA500']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  } else {
    // Regular match confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff6b35', '#f7c948', '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff6b35', '#f7c948', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }
};

const isFinalMatch = (round: string | null) => {
  if (!round) return false;
  const lower = round.toLowerCase();
  return lower.includes('finał') || lower.includes('final') || lower === 'grand final';
};

const Results = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const previousMatchesRef = useRef<Match[]>([]);

  const dateLocale = language === 'pl' ? pl : enUS;

  const handleMatchUpdates = useCallback((newMatches: Match[]) => {
    const prevMatches = previousMatchesRef.current;
    
    // Check for newly finished matches (confetti)
    newMatches.forEach(match => {
      const prevMatch = prevMatches.find(m => m.id === match.id);
      if (prevMatch && prevMatch.status === 'live' && match.status === 'finished') {
        triggerConfetti(isFinalMatch(match.round));
      }
    });

    // Check for score changes in live matches (sound)
    newMatches.forEach(match => {
      if (match.status === 'live') {
        const prevMatch = prevMatches.find(m => m.id === match.id);
        if (prevMatch && prevMatch.status === 'live') {
          if (prevMatch.team1_score !== match.team1_score || 
              prevMatch.team2_score !== match.team2_score) {
            playNotificationSound();
          }
        }
      }
    });

    previousMatchesRef.current = newMatches;
    setMatches(newMatches);
  }, []);

  const fetchMatches = useCallback(async (withCallback = false) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .in('status', ['live', 'finished'])
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      
      if (withCallback) {
        handleMatchUpdates(data || []);
      } else {
        previousMatchesRef.current = data || [];
        setMatches(data || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [handleMatchUpdates]);

  useEffect(() => {
    fetchMatches(false);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('results-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          fetchMatches(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.status === 'live');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  const MatchResultCard = ({ match }: { match: Match }) => {
    const isLive = match.status === 'live';
    const team1Won = match.status === 'finished' && match.winner_id === match.team1?.id;
    const team2Won = match.status === 'finished' && match.winner_id === match.team2?.id;
    
    // Fallback to score comparison if winner_id is not set
    const team1WonByScore = !match.winner_id && match.status === 'finished' && 
      (match.team1_score ?? 0) > (match.team2_score ?? 0);
    const team2WonByScore = !match.winner_id && match.status === 'finished' && 
      (match.team2_score ?? 0) > (match.team1_score ?? 0);

    const isTeam1Winner = team1Won || team1WonByScore;
    const isTeam2Winner = team2Won || team2WonByScore;

    return (
      <div className={`glass-card p-6 transition-all ${isLive ? 'ring-2 ring-red-500/50 animate-pulse-slow' : ''}`}>
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">{t('results.live')}</span>
          </div>
        )}

        {/* Round info */}
        {match.round && (
          <div className="text-center mb-4">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">{match.round}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className={`flex-1 flex items-center gap-4 ${isTeam1Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {match.team1?.logo_url ? (
                <img src={match.team1.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {match.team1?.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground truncate">{match.team1?.name || t('common.tbd')}</p>
              {isTeam1Winner && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-medium">{t('results.winner')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="px-8 text-center">
            <div className={`text-4xl font-black ${isLive ? 'text-red-400' : 'text-foreground'}`}>
              <span className={isTeam1Winner ? 'text-green-400' : ''}>{match.team1_score ?? 0}</span>
              <span className="text-muted-foreground mx-2">:</span>
              <span className={isTeam2Winner ? 'text-green-400' : ''}>{match.team2_score ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(match.scheduled_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })}
            </p>
          </div>

          {/* Team 2 */}
          <div className={`flex-1 flex items-center gap-4 justify-end ${isTeam2Winner ? '' : (match.status === 'finished' ? 'opacity-50' : '')}`}>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-bold text-lg text-foreground truncate">{match.team2?.name || t('common.tbd')}</p>
              {isTeam2Winner && (
                <div className="flex items-center gap-1 text-yellow-400 justify-end">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-medium">{t('results.winner')}</span>
                </div>
              )}
            </div>
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {match.team2?.logo_url ? (
                <img src={match.team2.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {match.team2?.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <HeroSection
        title={t('results.title')}
        subtitle={t('results.subtitle')}
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Live Matches */}
              {liveMatches.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    {t('results.live_matches')}
                  </h2>
                  <div className="grid gap-4">
                    {liveMatches.map((match) => (
                      <MatchResultCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              )}

              {/* Finished Matches */}
              {finishedMatches.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">{t('results.finished_matches')}</h2>
                  <div className="grid gap-4">
                    {finishedMatches.map((match, index) => (
                      <div
                        key={match.id}
                        className="opacity-0 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <MatchResultCard match={match} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 && (
                <div className="text-center py-16">
                  <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg">
                    {t('results.no_matches')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Results;
