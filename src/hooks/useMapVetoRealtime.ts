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
  action: 'ban' | 'pick' | 'decider' | 'random';
  mapId: string;
  mapName: string;
  timestamp: string;
  isAuto: boolean;
}

interface SessionState {
  id: string;
  current_step: number;
  maps_state: { id: string; status: MapStatus }[] | null;
  is_complete: boolean;
  format: VetoFormat;
  step_started_at: string | null;
  updated_at: string;
  team1_user_id: string;
  team2_user_id: string;
}

interface ActionRow {
  id: string;
  session_id: string;
  session_code: string;
  step: number;
  action: 'ban' | 'pick' | 'decider' | 'random';
  map_id: string;
  performed_by: string;
  performed_by_team: string;
  is_auto: boolean;
  created_at: string;
}

const mapNameById: Record<string, string> = {
  mirage: 'Mirage',
  dust2: 'Dust II',
  anubis: 'Anubis',
  inferno: 'Inferno',
  vertigo: 'Vertigo',
  nuke: 'Nuke',
  ancient: 'Ancient',
};

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
  const [team1UserId, setTeam1UserId] = useState<string | null>(null);
  const [team2UserId, setTeam2UserId] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionUpdateRef = useRef<string | null>(null);
  const lastActionsCountRef = useRef<number>(0);
  const { toast } = useToast();

  const vetoOrder = getVetoOrder(format);
  const currentVeto = vetoOrder[currentStep];
  const isVetoComplete = currentStep >= vetoOrder.length;
  // Only team captains (userTeam 1 or 2) can act - admins/owners can only spectate
  const canAct = !sessionCode ? true : (userTeam === currentVeto?.team);

  // Apply session state to local state
  const applySessionState = useCallback((session: SessionState) => {
    // Skip if this update is older than the last one we processed
    if (lastSessionUpdateRef.current && session.updated_at <= lastSessionUpdateRef.current) {
      return;
    }
    lastSessionUpdateRef.current = session.updated_at;
    
    setSessionId(session.id);
    setCurrentStep(session.current_step || 0);
    setIsComplete(session.is_complete || false);
    setFormat(session.format || 'bo3');
    setStepStartedAt(session.step_started_at);
    setTeam1UserId(session.team1_user_id);
    setTeam2UserId(session.team2_user_id);
    
    if (session.maps_state && Array.isArray(session.maps_state) && session.maps_state.length > 0) {
      const savedState = session.maps_state;
      const mergedMaps = initialMaps.map(map => {
        const saved = savedState.find(s => s.id === map.id);
        return saved ? { ...map, status: saved.status } : map;
      });
      setMaps(mergedMaps);
    }
  }, []);

  // Apply actions to history
  const applyActionsToHistory = useCallback((actions: ActionRow[]) => {
    if (actions.length === lastActionsCountRef.current) {
      return; // No new actions
    }
    lastActionsCountRef.current = actions.length;
    
    const history: VetoHistoryEntry[] = actions.map(a => ({
      step: a.step,
      team: a.performed_by_team === 'team1' ? 1 : a.performed_by_team === 'team2' ? 2 : null,
      action: a.action as 'ban' | 'pick' | 'decider' | 'random',
      mapId: a.map_id,
      mapName: mapNameById[a.map_id] || a.map_id,
      timestamp: a.created_at,
      isAuto: a.is_auto,
    }));
    setVetoHistory(history);
  }, []);

  // Fetch current session state
  const fetchSessionState = useCallback(async (): Promise<SessionState | null> => {
    if (!sessionCode) return null;
    
    try {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }

      if (!session) return null;
      
      return {
        id: session.id,
        current_step: session.current_step || 0,
        maps_state: session.maps_state as { id: string; status: MapStatus }[] | null,
        is_complete: session.is_complete || false,
        format: (session.format as VetoFormat) || 'bo3',
        step_started_at: session.step_started_at || null,
        updated_at: session.updated_at || new Date().toISOString(),
        team1_user_id: session.team1_user_id,
        team2_user_id: session.team2_user_id,
      };
    } catch (err) {
      console.error('Error in fetchSessionState:', err);
      return null;
    }
  }, [sessionCode]);

  // Fetch actions from DB
  const fetchActions = useCallback(async (): Promise<ActionRow[]> => {
    if (!sessionCode) return [];
    
    try {
      const { data, error } = await supabase
        .from('map_veto_actions')
        .select('*')
        .eq('session_code', sessionCode)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
      return (data || []) as ActionRow[];
    } catch (err) {
      console.error('Error in fetchActions:', err);
      return [];
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

    const loadAll = async () => {
      const [session, actions] = await Promise.all([
        fetchSessionState(),
        fetchActions()
      ]);
      if (session && isMounted) {
        applySessionState(session);
      }
      if (isMounted) {
        applyActionsToHistory(actions);
      }
    };

    loadAll();

    // Setup realtime subscription for session
    const sessionChannel = supabase
      .channel(`map-veto-session-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `session_code=eq.${sessionCode}`
        },
        (payload) => {
          console.log('Session update received:', payload);
          if (payload.new && isMounted) {
            const newData = payload.new as any;
            applySessionState({
              id: newData.id,
              current_step: newData.current_step,
              maps_state: newData.maps_state,
              is_complete: newData.is_complete,
              format: newData.format,
              step_started_at: newData.step_started_at,
              updated_at: newData.updated_at || new Date().toISOString(),
              team1_user_id: newData.team1_user_id,
              team2_user_id: newData.team2_user_id,
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Session subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          retryTimeoutId = setTimeout(() => {
            if (isMounted) sessionChannel.subscribe();
          }, 3000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    // Setup realtime subscription for actions
    const actionsChannel = supabase
      .channel(`map-veto-actions-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `session_code=eq.${sessionCode}`
        },
        async () => {
          console.log('New action received, refetching actions');
          if (isMounted) {
            const actions = await fetchActions();
            applyActionsToHistory(actions);
          }
        }
      )
      .subscribe();

    // Fallback polling - every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      await loadAll();
    }, 2000);

    return () => {
      isMounted = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, [sessionCode, fetchSessionState, fetchActions, applySessionState, applyActionsToHistory]);

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
      
      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Błąd',
          description: 'Musisz być zalogowany',
          variant: 'destructive'
        });
        return;
      }

      // Determine performed_by_team
      let performedByTeam = 'system';
      if (user.id === team1UserId) performedByTeam = 'team1';
      else if (user.id === team2UserId) performedByTeam = 'team2';

      // Insert action to action log FIRST
      const actionType = isAutoSelect ? 'random' : action;

      const { error: actionError } = await supabase
        .from('map_veto_actions')
        .insert({
          session_id: sessionId,
          session_code: sessionCode,
          step: currentStep,
          action: actionType as 'ban' | 'pick' | 'decider' | 'random',
          map_id: mapId,
          performed_by: user.id,
          performed_by_team: performedByTeam,
          is_auto: isAutoSelect,
        });

      if (actionError) {
        console.error('Error inserting action:', actionError);
        toast({
          title: 'Błąd',
          description: 'Nie udało się zapisać akcji',
          variant: 'destructive'
        });
        return;
      }

      // If completed and there's a decider, insert decider action too
      if (completed) {
        const deciderMap = newMaps.find(m => m.status === 'decider');
        if (deciderMap) {
          await supabase
            .from('map_veto_actions')
            .insert({
              session_id: sessionId,
              session_code: sessionCode,
              step: newStep,
              action: 'decider' as const,
              map_id: deciderMap.id,
              performed_by: user.id,
              performed_by_team: 'system',
              is_auto: true,
            });
        }
      }

      // Update session state
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({
          current_step: newStep,
          maps_state: mapsState,
          is_complete: completed,
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
    
    // In demo mode, add to history locally
    if (!sessionCode) {
      const historyEntry: VetoHistoryEntry = {
        step: currentStep,
        team: team,
        action: isAutoSelect ? 'random' : action,
        mapId: mapId,
        mapName: map.name,
        timestamp: new Date().toISOString(),
        isAuto: isAutoSelect,
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
            timestamp: new Date().toISOString(),
            isAuto: true,
          }]);
        }
      }
    }
  }, [maps, currentStep, isVetoComplete, isComplete, canAct, currentVeto, sessionCode, sessionId, vetoOrder.length, toast, team1UserId, team2UserId]);

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
