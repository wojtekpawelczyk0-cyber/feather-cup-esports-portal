import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const VETO_TIME_LIMIT = 90; // seconds

type MapStatus = 'available' | 'banned_team1' | 'banned_team2' | 'picked_team1' | 'picked_team2' | 'decider';
export type VetoFormat = 'bo1' | 'bo3';

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
export const vetoOrderBO3: VetoStep[] = [
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'pick' },
  { team: 2, action: 'pick' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
];

// BO1 veto order: 2x Ban T1, 2x Ban T2, Ban T1, Ban T2, Decider
export const vetoOrderBO1: VetoStep[] = [
  { team: 1, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
];

export const getVetoOrder = (format: VetoFormat): VetoStep[] => {
  return format === 'bo1' ? vetoOrderBO1 : vetoOrderBO3;
};

interface UseMapVetoRealtimeProps {
  sessionCode: string | null;
  userTeam: 1 | 2 | null;
  hasAccess: boolean;
  format?: VetoFormat;
}

export interface VetoHistoryEntry {
  step: number;
  team: 1 | 2 | null;
  action: 'ban' | 'pick' | 'decider';
  mapId: string;
  mapName: string;
  timestamp: string;
}

export const useMapVetoRealtime = ({ sessionCode, userTeam, hasAccess, format: initialFormat = 'bo3' }: UseMapVetoRealtimeProps) => {
  const [maps, setMaps] = useState<MapData[]>(initialMaps);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [format, setFormat] = useState<VetoFormat>(initialFormat);
  const [timeLeft, setTimeLeft] = useState(VETO_TIME_LIMIT);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [vetoHistory, setVetoHistory] = useState<VetoHistoryEntry[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const vetoOrder = getVetoOrder(format);
  const currentVeto = vetoOrder[currentStep];
  const isVetoComplete = currentStep >= vetoOrder.length;
  // Only team captains (userTeam 1 or 2) can act - admins/owners can only spectate
  const canAct = !sessionCode ? true : (userTeam === currentVeto?.team);

  // Timer logic
  useEffect(() => {
    // Reset timer when step changes
    setTimeLeft(VETO_TIME_LIMIT);
    
    if (isComplete || isVetoComplete || isRandomizing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - trigger random selection
          setIsRandomizing(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentStep, isComplete, isVetoComplete, isRandomizing]);

  // Handle random map selection after timeout
  const handleRandomMapSelect = useCallback((mapId: string) => {
    setIsRandomizing(false);
    // Directly call the map click logic
    handleMapClickInternal(mapId, true);
  }, []);

  // Load initial state from database
  useEffect(() => {
    if (!sessionCode) return;

    const loadSessionState = async () => {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('id, current_step, maps_state, is_complete, format')
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
        setFormat((session.format as VetoFormat) || 'bo3');
        
        if (session.maps_state && Array.isArray(session.maps_state) && session.maps_state.length > 0) {
          // Merge saved state with initial maps
          const savedState = session.maps_state as { id: string; status: MapStatus }[];
          const mergedMaps = initialMaps.map(map => {
            const saved = savedState.find(s => s.id === map.id);
            return saved ? { ...map, status: saved.status } : map;
          });
          setMaps(mergedMaps);
          
          // Build history from saved state
          rebuildHistoryFromState(mergedMaps, session.current_step || 0, getVetoOrder((session.format as VetoFormat) || 'bo3'));
        }
      }
    };

    loadSessionState();
  }, [sessionCode]);

  // Helper to rebuild history from current state
  const rebuildHistoryFromState = (currentMaps: MapData[], step: number, order: VetoStep[]) => {
    const history: VetoHistoryEntry[] = [];
    
    // Build history based on map statuses
    currentMaps.forEach(map => {
      if (map.status === 'banned_team1') {
        history.push({
          step: history.length,
          team: 1,
          action: 'ban',
          mapId: map.id,
          mapName: map.name,
          timestamp: new Date().toISOString()
        });
      } else if (map.status === 'banned_team2') {
        history.push({
          step: history.length,
          team: 2,
          action: 'ban',
          mapId: map.id,
          mapName: map.name,
          timestamp: new Date().toISOString()
        });
      } else if (map.status === 'picked_team1') {
        history.push({
          step: history.length,
          team: 1,
          action: 'pick',
          mapId: map.id,
          mapName: map.name,
          timestamp: new Date().toISOString()
        });
      } else if (map.status === 'picked_team2') {
        history.push({
          step: history.length,
          team: 2,
          action: 'pick',
          mapId: map.id,
          mapName: map.name,
          timestamp: new Date().toISOString()
        });
      } else if (map.status === 'decider') {
        history.push({
          step: history.length,
          team: null,
          action: 'decider',
          mapId: map.id,
          mapName: map.name,
          timestamp: new Date().toISOString()
        });
      }
    });

    setVetoHistory(history);
  };

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
          if (newData.format) setFormat(newData.format as VetoFormat);
          
          if (newData.maps_state && Array.isArray(newData.maps_state) && newData.maps_state.length > 0) {
            const savedState = newData.maps_state as { id: string; status: MapStatus }[];
            const mergedMaps = initialMaps.map(map => {
              const saved = savedState.find(s => s.id === map.id);
              return saved ? { ...map, status: saved.status } : map;
            });
            setMaps(mergedMaps);
            
            // Rebuild history on realtime update
            rebuildHistoryFromState(mergedMaps, newData.current_step || 0, getVetoOrder(newData.format as VetoFormat || 'bo3'));
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

  // Internal map click handler (used by both manual click and random selection)
  const handleMapClickInternal = useCallback(async (mapId: string, isAutoSelect: boolean = false) => {
    if (isVetoComplete || isComplete) return;
    if (!isAutoSelect && !canAct) return;

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
    setTimeLeft(VETO_TIME_LIMIT); // Reset timer for next step
    
    // Add to history
    const historyEntry: VetoHistoryEntry = {
      step: currentStep,
      team: team,
      action: action,
      mapId: mapId,
      mapName: map.name,
      timestamp: new Date().toISOString()
    };
    setVetoHistory(prev => [...prev, historyEntry]);
    
    // Add decider to history if complete
    if (completed) {
      const deciderMap = newMaps.find(m => m.status === 'decider');
      if (deciderMap) {
        setVetoHistory(prev => [...prev, {
          step: newStep,
          team: null,
          action: 'decider',
          mapId: deciderMap.id,
          mapName: deciderMap.name,
          timestamp: new Date().toISOString()
        }]);
      }
    }

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
  }, [maps, currentStep, isVetoComplete, isComplete, canAct, currentVeto, sessionCode, sessionId, vetoOrder.length, toast]);

  // Handle map click (wrapper for external use)
  const handleMapClick = useCallback(async (mapId: string) => {
    handleMapClickInternal(mapId, false);
  }, [handleMapClickInternal]);

  // Reset veto (demo mode only)
  const resetVeto = useCallback((newFormat?: VetoFormat) => {
    setMaps(initialMaps);
    setCurrentStep(0);
    setIsComplete(false);
    setTimeLeft(VETO_TIME_LIMIT);
    setIsRandomizing(false);
    setVetoHistory([]);
    if (newFormat) setFormat(newFormat);
  }, []);

  return {
    maps,
    currentStep,
    isComplete,
    currentVeto,
    isVetoComplete,
    canAct,
    format,
    vetoOrder,
    timeLeft,
    isRandomizing,
    vetoHistory,
    handleMapClick,
    handleRandomMapSelect,
    resetVeto,
    setFormat
  };
};
