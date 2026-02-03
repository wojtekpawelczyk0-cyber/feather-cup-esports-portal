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

interface SessionState {
  id: string;
  current_step: number;
  maps_state: { id: string; status: MapStatus }[] | null;
  is_complete: boolean;
  format: VetoFormat;
  step_started_at: string | null;
  updated_at: string;
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [stepStartedAt, setStepStartedAt] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string | null>(null);
  const { toast } = useToast();

  const vetoOrder = getVetoOrder(format);
  const currentVeto = vetoOrder[currentStep];
  const isVetoComplete = currentStep >= vetoOrder.length;
  // Only team captains (userTeam 1 or 2) can act - admins/owners can only spectate
  const canAct = !sessionCode ? true : (userTeam === currentVeto?.team);

  // Helper to rebuild history from current state
  const rebuildHistoryFromState = useCallback((currentMaps: MapData[], vetoOrderForFormat: VetoStep[]) => {
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

    return history;
  }, []);

  // Apply session state to local state
  const applySessionState = useCallback((session: SessionState) => {
    console.log('Applying session state:', session);
    
    // Skip if this update is older than the last one we processed
    if (lastUpdateRef.current && session.updated_at <= lastUpdateRef.current) {
      console.log('Skipping older update');
      return;
    }
    lastUpdateRef.current = session.updated_at;
    
    setSessionId(session.id);
    setCurrentStep(session.current_step || 0);
    setIsComplete(session.is_complete || false);
    setFormat(session.format || 'bo3');
    setStepStartedAt(session.step_started_at);
    
    if (session.maps_state && Array.isArray(session.maps_state) && session.maps_state.length > 0) {
      const savedState = session.maps_state;
      const mergedMaps = initialMaps.map(map => {
        const saved = savedState.find(s => s.id === map.id);
        return saved ? { ...map, status: saved.status } : map;
      });
      setMaps(mergedMaps);
      
      // Build history from saved state
      const history = rebuildHistoryFromState(mergedMaps, getVetoOrder(session.format || 'bo3'));
      setVetoHistory(history);
    }
  }, [rebuildHistoryFromState]);

  // Fetch current session state
  const fetchSessionState = useCallback(async () => {
    if (!sessionCode) return null;
    
    try {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('id, current_step, maps_state, is_complete, format, step_started_at, updated_at')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }

      return session as SessionState | null;
    } catch (err) {
      console.error('Error in fetchSessionState:', err);
      return null;
    }
  }, [sessionCode]);

  // Sync timer from server timestamp
  useEffect(() => {
    if (!sessionCode) {
      // Demo mode - local timer
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
    }

    // Session mode - calculate time from server timestamp
    if (isComplete || isVetoComplete || isRandomizing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const calculateTimeLeft = () => {
      if (!stepStartedAt) {
        return VETO_TIME_LIMIT;
      }
      
      const startTime = new Date(stepStartedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, VETO_TIME_LIMIT - elapsed);
      
      return remaining;
    };

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    if (initialTimeLeft <= 0) {
      // Time already expired - trigger random selection only if it's our turn
      if (canAct) {
        setIsRandomizing(true);
      }
      return;
    }

    // Update every second based on server time
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Trigger random selection only if it's our turn
        if (canAct) {
          setIsRandomizing(true);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionCode, stepStartedAt, isComplete, isVetoComplete, isRandomizing, canAct, currentStep]);

  // Load initial state and setup realtime + polling
  useEffect(() => {
    if (!sessionCode) return;

    setConnectionStatus('connecting');
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const loadInitialState = async () => {
      const session = await fetchSessionState();
      if (session && isMounted) {
        applySessionState(session);
      }
    };

    loadInitialState();

    // Setup realtime subscription
    const channel = supabase
      .channel(`map-veto-live-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `session_code=eq.${sessionCode}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          if (payload.new && isMounted) {
            const newData = payload.new as any;
            applySessionState({
              id: newData.id,
              current_step: newData.current_step,
              maps_state: newData.maps_state,
              is_complete: newData.is_complete,
              format: newData.format,
              step_started_at: newData.step_started_at,
              updated_at: newData.updated_at || new Date().toISOString()
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          // Auto-retry subscription
          retryTimeoutId = setTimeout(() => {
            if (isMounted) channel.subscribe();
          }, 3000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    // Fallback polling - every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      const session = await fetchSessionState();
      if (session && isMounted) {
        applySessionState(session);
      }
    }, 2000);

    return () => {
      isMounted = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [sessionCode, fetchSessionState, applySessionState]);

  // Handle random map selection after timeout
  const handleRandomMapSelect = useCallback((mapId: string) => {
    setIsRandomizing(false);
    // Directly call the map click logic
    handleMapClickInternal(mapId, true);
  }, []);

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

    // If in session mode, sync to database FIRST for real-time sync
    if (sessionCode && sessionId) {
      const mapsState = newMaps.map(m => ({ id: m.id, status: m.status }));
      const newStepStartedAt = completed ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({
          current_step: newStep,
          maps_state: mapsState,
          is_complete: completed,
          step_started_at: newStepStartedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error syncing veto state:', error);
        toast({
          title: 'Błąd synchronizacji',
          description: 'Nie udało się zsynchronizować stanu veto',
          variant: 'destructive'
        });
        return; // Don't update local state if sync failed
      }
    }

    // Update local state after successful sync (or in demo mode)
    setMaps(newMaps);
    setCurrentStep(newStep);
    setIsComplete(completed);
    setStepStartedAt(completed ? null : new Date().toISOString());
    
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
    setStepStartedAt(new Date().toISOString());
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
    connectionStatus,
    handleMapClick,
    handleRandomMapSelect,
    resetVeto,
    setFormat
  };
};
