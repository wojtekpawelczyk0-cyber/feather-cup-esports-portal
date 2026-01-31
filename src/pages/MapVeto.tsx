import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Swords, Lock, Loader2, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMapVetoRealtime, vetoOrder, MapData } from '@/hooks/useMapVetoRealtime';

type MapStatus = 'available' | 'banned_team1' | 'banned_team2' | 'picked_team1' | 'picked_team2' | 'decider';

const MapVeto = () => {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('code');
  const { user } = useAuth();
  
  const [team1Name, setTeam1Name] = useState('Drużyna 1');
  const [team2Name, setTeam2Name] = useState('Drużyna 2');
  
  // Session auth state
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userTeam, setUserTeam] = useState<1 | 2 | null>(null);

  // Realtime hook
  const {
    maps,
    currentStep,
    isComplete,
    currentVeto,
    isVetoComplete,
    canAct,
    handleMapClick,
    resetVeto
  } = useMapVetoRealtime({ sessionCode, userTeam, hasAccess });

  useEffect(() => {
    if (sessionCode) {
      verifySession();
    } else {
      // No code = public demo mode
      setLoading(false);
      setHasAccess(true);
    }
  }, [sessionCode, user]);

  const verifySession = async () => {
    if (!sessionCode) return;
    
    try {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!session) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if user has access
      if (user) {
        if (user.id === session.team1_user_id) {
          setUserTeam(1);
          setHasAccess(true);
        } else if (user.id === session.team2_user_id) {
          setUserTeam(2);
          setHasAccess(true);
        } else {
          // Check if user is owner
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'owner');
          
          if (roles && roles.length > 0) {
            setHasAccess(true);
          }
        }
      }

      // Fetch team names from profiles
      const [profile1, profile2] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', session.team1_user_id).maybeSingle(),
        supabase.from('profiles').select('display_name').eq('user_id', session.team2_user_id).maybeSingle()
      ]);

      if (profile1.data?.display_name) setTeam1Name(profile1.data.display_name);
      if (profile2.data?.display_name) setTeam2Name(profile2.data.display_name);

    } catch (error) {
      console.error('Error verifying session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: MapStatus) => {
    switch (status) {
      case 'banned_team1':
        return <Badge className="bg-red-500/80 text-white border-none">BAN - {team1Name}</Badge>;
      case 'banned_team2':
        return <Badge className="bg-red-500/80 text-white border-none">BAN - {team2Name}</Badge>;
      case 'picked_team1':
        return <Badge className="bg-emerald-500/80 text-white border-none">PICK - {team1Name}</Badge>;
      case 'picked_team2':
        return <Badge className="bg-emerald-500/80 text-white border-none">PICK - {team2Name}</Badge>;
      case 'decider':
        return <Badge className="bg-amber-500/80 text-white border-none">DECIDER</Badge>;
      default:
        return null;
    }
  };

  const getCurrentActionText = () => {
    if (isComplete) return 'Veto zakończone!';
    const teamName = currentVeto.team === 1 ? team1Name : team2Name;
    const action = currentVeto.action === 'ban' ? 'banuje' : 'wybiera';
    return `${teamName} ${action} mapę`;
  };

  const getPickedMaps = () => {
    const team1Pick = maps.find(m => m.status === 'picked_team1');
    const team2Pick = maps.find(m => m.status === 'picked_team2');
    const decider = maps.find(m => m.status === 'decider');
    return { team1Pick, team2Pick, decider };
  };

  const { team1Pick, team2Pick, decider } = getPickedMaps();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (sessionCode && !hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-card border border-border rounded-2xl p-8">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
              <p className="text-muted-foreground">
                {!user 
                  ? 'Musisz być zalogowany jako kapitan jednej z drużyn, aby uzyskać dostęp do tej sesji veto.'
                  : 'Nie masz uprawnień do tej sesji veto. Tylko kapitanowie drużyn mają dostęp.'}
              </p>
              {!user && (
                <Button className="mt-4" asChild>
                  <a href="/auth">Zaloguj się</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Swords className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Map Veto</h1>
          </div>
          <p className="text-muted-foreground">System wyboru map - Best of 3</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {userTeam && (
              <Badge variant="outline">
                Jesteś: {userTeam === 1 ? team1Name : team2Name}
              </Badge>
            )}
            {sessionCode && (
              <Badge variant="outline" className="gap-1">
                <Wifi className="w-3 h-3 text-emerald-500" />
                Na żywo
              </Badge>
            )}
          </div>
        </div>

        {/* Team Names Display (not editable in session mode) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded",
              userTeam === 1 ? "bg-blue-500 ring-2 ring-blue-300" : "bg-blue-500"
            )}></div>
            {sessionCode ? (
              <span className="text-lg font-semibold">{team1Name}</span>
            ) : (
              <input
                type="text"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nazwa drużyny 1"
              />
            )}
          </div>
          <span className="text-2xl font-bold text-muted-foreground self-center">VS</span>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded",
              userTeam === 2 ? "bg-orange-500 ring-2 ring-orange-300" : "bg-orange-500"
            )}></div>
            {sessionCode ? (
              <span className="text-lg font-semibold">{team2Name}</span>
            ) : (
              <input
                type="text"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nazwa drużyny 2"
              />
            )}
          </div>
        </div>

        {/* Current Action */}
        <div className="text-center mb-8">
          <div className={cn(
            "inline-flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-semibold",
            isComplete 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : currentVeto?.action === 'ban'
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          )}>
            {!isComplete && (
              <div className={cn(
                "w-3 h-3 rounded-full animate-pulse",
                currentVeto?.team === 1 ? "bg-blue-500" : "bg-orange-500"
              )} />
            )}
            {getCurrentActionText()}
            {!canAct && !isComplete && (
              <span className="text-xs opacity-70">(Czekaj na przeciwnika)</span>
            )}
          </div>
        </div>

        {/* Veto Progress */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {vetoOrder.map((step, index) => (
            <div
              key={index}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                index < currentStep
                  ? step.action === 'ban' ? "bg-red-500/30 text-red-400" : "bg-emerald-500/30 text-emerald-400"
                  : index === currentStep && !isComplete
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : "bg-secondary/50 text-muted-foreground"
              )}
            >
              {step.action === 'ban' ? 'B' : 'P'}
              <span className="text-[10px] ml-0.5">{step.team}</span>
            </div>
          ))}
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold",
              isComplete ? "bg-amber-500/30 text-amber-400" : "bg-secondary/50 text-muted-foreground"
            )}
          >
            D
          </div>
        </div>

        {/* Maps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
          {maps.map((map) => (
            <Card
              key={map.id}
              onClick={() => handleMapClick(map.id)}
              className={cn(
                "relative overflow-hidden transition-all duration-300 group",
                map.status === 'available' && !isComplete && canAct
                  ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-primary"
                  : map.status === 'available' && !canAct
                    ? "cursor-not-allowed opacity-50"
                    : "opacity-75",
                map.status === 'banned_team1' || map.status === 'banned_team2'
                  ? "grayscale"
                  : "",
                map.status === 'picked_team1' || map.status === 'picked_team2'
                  ? "ring-2 ring-emerald-500"
                  : "",
                map.status === 'decider'
                  ? "ring-2 ring-amber-500"
                  : ""
              )}
            >
              {/* Map Image */}
              <div className="aspect-[16/10] relative">
                <img
                  src={map.image}
                  alt={map.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback gradient if image fails
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Status Overlay */}
                {map.status !== 'available' && (
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    map.status.includes('banned') ? "bg-red-900/50" : "",
                    map.status.includes('picked') ? "bg-emerald-900/30" : "",
                    map.status === 'decider' ? "bg-amber-900/30" : ""
                  )}>
                    {map.status.includes('banned') && (
                      <span className="text-4xl font-bold text-red-500/80">✕</span>
                    )}
                  </div>
                )}

                {/* Map Name */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-lg font-bold text-white text-center">{map.name}</h3>
                </div>

                {/* Status Badge */}
                {map.status !== 'available' && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    {getStatusBadge(map.status)}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Final Result */}
        {isComplete && (
          <div className="bg-card/50 border border-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-center mb-6">Kolejność map</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Map 1 */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Mapa 1 (wybór {team1Name})</div>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                  <span className="text-2xl font-bold text-blue-400">{team1Pick?.name || '-'}</span>
                </div>
              </div>
              
              {/* Map 2 */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Mapa 2 (wybór {team2Name})</div>
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
                  <span className="text-2xl font-bold text-orange-400">{team2Pick?.name || '-'}</span>
                </div>
              </div>
              
              {/* Map 3 */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Mapa 3 (Decider)</div>
                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
                  <span className="text-2xl font-bold text-amber-400">{decider?.name || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Button (only in demo mode) */}
        {!sessionCode && (
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={resetVeto}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Veto
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/50"></div>
            <span className="text-muted-foreground">Ban</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/50"></div>
            <span className="text-muted-foreground">Pick</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/50"></div>
            <span className="text-muted-foreground">Decider</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MapVeto;
