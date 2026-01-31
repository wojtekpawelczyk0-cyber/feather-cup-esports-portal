import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MapStatus = 'available' | 'banned_team1' | 'banned_team2' | 'picked_team1' | 'picked_team2' | 'decider';

export interface MapData {
  id: string;
  name: string;
  image: string;
  status: MapStatus;
}

// CS2 map images - using reliable CDN sources
export const initialMaps: MapData[] = [
  { id: 'mirage', name: 'Mirage', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_mirage.png', status: 'available' },
  { id: 'dust2', name: 'Dust II', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_dust2.png', status: 'available' },
  { id: 'anubis', name: 'Anubis', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_anubis.png', status: 'available' },
  { id: 'inferno', name: 'Inferno', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_inferno.png', status: 'available' },
  { id: 'vertigo', name: 'Vertigo', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_vertigo.png', status: 'available' },
  { id: 'nuke', name: 'Nuke', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_nuke.png', status: 'available' },
  { id: 'ancient', name: 'Ancient', image: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_ancient.png', status: 'available' },
];

type VetoStep = {
  team: 1 | 2;
  action: 'ban' | 'pick';
};

// BO3 veto order: Ban, Ban, Pick, Pick, Ban, Ban, Decider
export const vetoOrder: VetoStep[] = [
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'pick' },
  { team: 2, action: 'pick' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
];

interface UseMapVetoRealtimeProps {
  sessionCode: string | null;
  userTeam: 1 | 2 | null;
  hasAccess: boolean;
}

export const useMapVetoRealtime = ({ sessionCode, userTeam, hasAccess }: UseMapVetoRealtimeProps) => {
  const [maps, setMaps] = useState<MapData[]>(initialMaps);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const currentVeto = vetoOrder[currentStep];
  const isVetoComplete = currentStep >= vetoOrder.length;
  const canAct = !sessionCode || (userTeam === currentVeto?.team) || (!userTeam && hasAccess);

  // Load initial state from database
  useEffect(() => {
    if (!sessionCode) return;

    const loadSessionState = async () => {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('id, current_step, maps_state, is_complete')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading session state:', error);
        return;
      }

      if (session) {
        setSessionId(session.id);
        setCurrentStep(session.current_step || 0);
        setIsComplete(session.is_complete || false);
        
        if (session.maps_state && Array.isArray(session.maps_state) && session.maps_state.length > 0) {
          // Merge saved state with initial maps
          const savedState = session.maps_state as { id: string; status: MapStatus }[];
          const mergedMaps = initialMaps.map(map => {
            const saved = savedState.find(s => s.id === map.id);
            return saved ? { ...map, status: saved.status } : map;
          });
          setMaps(mergedMaps);
        }
      }
    };

    loadSessionState();
  }, [sessionCode]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!sessionCode || !sessionId) return;

    const channel = supabase
      .channel(`veto-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          const newData = payload.new as any;
          
          setCurrentStep(newData.current_step || 0);
          setIsComplete(newData.is_complete || false);
          
          if (newData.maps_state && Array.isArray(newData.maps_state) && newData.maps_state.length > 0) {
            const savedState = newData.maps_state as { id: string; status: MapStatus }[];
            const mergedMaps = initialMaps.map(map => {
              const saved = savedState.find(s => s.id === map.id);
              return saved ? { ...map, status: saved.status } : map;
            });
            setMaps(mergedMaps);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode, sessionId]);

  // Handle map click
  const handleMapClick = useCallback(async (mapId: string) => {
    if (isVetoComplete || isComplete) return;
    if (!canAct) return;

    const map = maps.find(m => m.id === mapId);
    if (!map || map.status !== 'available') return;

    const { team, action } = currentVeto;
    let newStatus: MapStatus;

    if (action === 'ban') {
      newStatus = team === 1 ? 'banned_team1' : 'banned_team2';
    } else {
      newStatus = team === 1 ? 'picked_team1' : 'picked_team2';
    }

    let newMaps = maps.map(m => 
      m.id === mapId ? { ...m, status: newStatus } : m
    );

    let newStep = currentStep + 1;
    let completed = false;

    // Check if this is the last step
    if (currentStep === vetoOrder.length - 1) {
      const remainingMap = newMaps.find(m => m.status === 'available');
      if (remainingMap) {
        newMaps = newMaps.map(m => 
          m.id === remainingMap.id ? { ...m, status: 'decider' as MapStatus } : m
        );
      }
      completed = true;
    }

    // Update local state immediately for responsive UI
    setMaps(newMaps);
    setCurrentStep(newStep);
    setIsComplete(completed);

    // If in session mode, sync to database
    if (sessionCode && sessionId) {
      const mapsState = newMaps.map(m => ({ id: m.id, status: m.status }));
      
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({
          current_step: newStep,
          maps_state: mapsState,
          is_complete: completed
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error syncing veto state:', error);
        toast({
          title: 'Błąd synchronizacji',
          description: 'Nie udało się zsynchronizować stanu veto',
          variant: 'destructive'
        });
      }
    }
  }, [maps, currentStep, isVetoComplete, isComplete, canAct, currentVeto, sessionCode, sessionId, toast]);

  // Reset veto (demo mode only)
  const resetVeto = useCallback(() => {
    setMaps(initialMaps);
    setCurrentStep(0);
    setIsComplete(false);
  }, []);

  return {
    maps,
    currentStep,
    isComplete,
    currentVeto,
    isVetoComplete,
    canAct,
    handleMapClick,
    resetVeto
  };
};
