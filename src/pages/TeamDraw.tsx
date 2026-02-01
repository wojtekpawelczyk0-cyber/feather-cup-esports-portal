import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Trash2, RotateCcw, Sparkles, Notebook, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
}

const WHEEL_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
];

// Audio context for sound effects
const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const playTickSound = (audioContext: AudioContext, volume: number = 0.3) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800 + Math.random() * 400;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.05);
};

const playWinSound = (audioContext: AudioContext) => {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  notes.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    
    const startTime = audioContext.currentTime + index * 0.15;
    gainNode.gain.setValueAtTime(0.4, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  });
};

const TeamDraw = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [notes, setNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    checkAccess();
    fetchTeams();
    loadNotes();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [user]);

  // Glow animation during spin
  useEffect(() => {
    if (isSpinning) {
      const interval = setInterval(() => {
        setGlowIntensity(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setGlowIntensity(0);
    }
  }, [isSpinning]);

  const checkAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner');

    setIsOwner(roles && roles.length > 0);
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, logo_url, status')
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      return;
    }

    setTeams(data || []);
  };

  const loadNotes = () => {
    const savedNotes = localStorage.getItem('team-draw-notes');
    if (savedNotes) setNotes(savedNotes);
  };

  const saveNotes = (value: string) => {
    setNotes(value);
    localStorage.setItem('team-draw-notes', value);
  };

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Big burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']
    });

    frame();
  }, []);

  const spinWheel = useCallback(() => {
    if (teams.length === 0 || isSpinning) return;

    // Initialize audio context on user interaction
    if (!audioContextRef.current && soundEnabled) {
      audioContextRef.current = createAudioContext();
    }

    setIsSpinning(true);
    setSelectedTeam(null);

    // Random number of full rotations (5-10) plus random position
    const fullRotations = 5 + Math.random() * 5;
    const randomIndex = Math.floor(Math.random() * teams.length);
    const segmentAngle = 360 / teams.length;
    const targetAngle = 360 - (randomIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = rotation + fullRotations * 360 + targetAngle;

    // Tick sound effect during spin
    if (soundEnabled && audioContextRef.current) {
      const tickInterval = setInterval(() => {
        const currentRotation = wheelRef.current?.style.transform;
        if (currentRotation) {
          const match = currentRotation.match(/rotate\(([\d.]+)deg\)/);
          if (match) {
            const currentAngle = parseFloat(match[1]) % 360;
            const segmentsPassed = Math.floor(currentAngle / segmentAngle);
            if (segmentsPassed !== lastTickRef.current) {
              lastTickRef.current = segmentsPassed;
              playTickSound(audioContextRef.current!, 0.2);
            }
          }
        }
      }, 30);

      setTimeout(() => clearInterval(tickInterval), 5000);
    }

    setRotation(totalRotation);

    // After animation completes
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedTeam(teams[randomIndex]);
      
      if (soundEnabled && audioContextRef.current) {
        playWinSound(audioContextRef.current);
      }
      
      fireConfetti();
      toast.success(`Wylosowano: ${teams[randomIndex].name}!`);
    }, 5000);
  }, [teams, isSpinning, rotation, soundEnabled, fireConfetti]);

  const deleteTeam = async () => {
    if (!selectedTeam) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', selectedTeam.id);

    if (error) {
      toast.error('Błąd podczas usuwania drużyny');
      console.error(error);
      return;
    }

    toast.success(`Drużyna ${selectedTeam.name} została usunięta`);
    setTeams(teams.filter(t => t.id !== selectedTeam.id));
    setSelectedTeam(null);
    setDeleteDialogOpen(false);
  };

  const resetWheel = () => {
    setRotation(0);
    setSelectedTeam(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isOwner) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <Card className="p-8">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
              <p className="text-muted-foreground">
                Ta strona jest dostępna tylko dla właściciela turnieju.
              </p>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const segmentAngle = teams.length > 0 ? 360 / teams.length : 360;
  const glowColor = `rgba(99, 102, 241, ${0.3 + Math.sin(glowIntensity / 10) * 0.3})`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Losowanie Drużyn</h1>
          </div>
          <p className="text-muted-foreground">
            Koło fortuny z {teams.length} drużynami
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="mt-2 gap-2"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Dźwięk włączony' : 'Dźwięk wyłączony'}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Fortune Wheel Section */}
          <div className="flex flex-col items-center">
            {/* Wheel Container */}
            <div 
              className="relative w-full max-w-lg aspect-square"
              style={{
                filter: isSpinning ? `drop-shadow(0 0 ${20 + Math.sin(glowIntensity / 10) * 20}px ${glowColor})` : 'drop-shadow(0 0 10px rgba(0,0,0,0.3))',
                transition: 'filter 0.1s'
              }}
            >
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div 
                  className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-primary"
                  style={{
                    filter: isSpinning ? `drop-shadow(0 0 10px ${glowColor})` : 'none',
                  }}
                />
              </div>

              {/* Outer glow ring when spinning */}
              {isSpinning && (
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `radial-gradient(circle, transparent 45%, ${glowColor} 50%, transparent 55%)`,
                  }}
                />
              )}

              {/* Wheel */}
              <svg
                ref={wheelRef}
                viewBox="0 0 400 400"
                className="w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {/* Definitions for text paths */}
                <defs>
                  {teams.map((team, index) => {
                    const startAngle = index * segmentAngle - 90;
                    const midAngle = startAngle + segmentAngle / 2;
                    const midRad = (midAngle * Math.PI) / 180;
                    
                    // Create arc path for text
                    const innerRadius = 50;
                    const outerRadius = 170;
                    const textRadius = (innerRadius + outerRadius) / 2 + 20;
                    
                    const startX = 200 + textRadius * Math.cos((startAngle * Math.PI) / 180);
                    const startY = 200 + textRadius * Math.sin((startAngle * Math.PI) / 180);
                    const endX = 200 + textRadius * Math.cos(((startAngle + segmentAngle) * Math.PI) / 180);
                    const endY = 200 + textRadius * Math.sin(((startAngle + segmentAngle) * Math.PI) / 180);
                    
                    return (
                      <path
                        key={`path-${team.id}`}
                        id={`textPath-${index}`}
                        d={`M ${startX} ${startY} A ${textRadius} ${textRadius} 0 0 1 ${endX} ${endY}`}
                        fill="none"
                      />
                    );
                  })}
                </defs>

                {/* Background circle */}
                <circle 
                  cx="200" 
                  cy="200" 
                  r="198" 
                  fill="hsl(var(--card))" 
                  stroke="hsl(var(--border))" 
                  strokeWidth="4" 
                />
                
                {teams.length > 0 ? (
                  teams.map((team, index) => {
                    const startAngle = index * segmentAngle - 90;
                    const endAngle = startAngle + segmentAngle;
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    
                    const x1 = 200 + 190 * Math.cos(startRad);
                    const y1 = 200 + 190 * Math.sin(startRad);
                    const x2 = 200 + 190 * Math.cos(endRad);
                    const y2 = 200 + 190 * Math.sin(endRad);
                    
                    const largeArc = segmentAngle > 180 ? 1 : 0;
                    const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
                    
                    // Text position for radial text
                    const textAngle = startAngle + segmentAngle / 2;
                    const textRad = (textAngle * Math.PI) / 180;
                    const textRadius = 120;
                    const textX = 200 + textRadius * Math.cos(textRad);
                    const textY = 200 + textRadius * Math.sin(textRad);
                    
                    // Truncate name based on team count
                    const maxChars = teams.length > 20 ? 8 : teams.length > 12 ? 10 : 14;
                    const displayName = team.name.length > maxChars 
                      ? team.name.substring(0, maxChars) + '...' 
                      : team.name;

                    return (
                      <g key={team.id}>
                        {/* Segment */}
                        <path
                          d={`M 200 200 L ${x1} ${y1} A 190 190 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={color}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="2"
                          className="transition-opacity"
                        />
                        
                        {/* Radial text - oriented from center outward */}
                        <text
                          x={textX}
                          y={textY}
                          fill="white"
                          fontSize={teams.length > 20 ? "9" : teams.length > 12 ? "11" : "13"}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                          className="pointer-events-none select-none"
                          style={{ 
                            textShadow: '1px 1px 3px rgba(0,0,0,0.7), -1px -1px 3px rgba(0,0,0,0.7)',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {displayName}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <text x="200" y="200" fill="hsl(var(--muted-foreground))" fontSize="16" textAnchor="middle" dominantBaseline="middle">
                    Brak drużyn
                  </text>
                )}

                {/* Decorative rings */}
                <circle cx="200" cy="200" r="195" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <circle cx="200" cy="200" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

                {/* Center circle with gradient */}
                <defs>
                  <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                  </radialGradient>
                  <filter id="centerShadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5"/>
                  </filter>
                </defs>
                <circle cx="200" cy="200" r="40" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" filter="url(#centerShadow)" />
                <circle cx="200" cy="200" r="30" fill="url(#centerGradient)" />
                <text x="200" y="200" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                  {teams.length}
                </text>
              </svg>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mt-8">
              <Button
                size="lg"
                onClick={spinWheel}
                disabled={isSpinning || teams.length === 0}
                className="gap-2 px-8 relative overflow-hidden group"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Losowanie...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                    Losuj!
                  </>
                )}
                {!isSpinning && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={resetWheel}
                disabled={isSpinning}
                className="gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Reset
              </Button>
            </div>

            {/* Selected Team Result */}
            {selectedTeam && (
              <Card className="mt-8 p-6 w-full max-w-lg animate-scale-in border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
                <div className="text-center mb-4">
                  <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
                    🎉 Wylosowana drużyna
                  </Badge>
                  <div className="flex items-center justify-center gap-4">
                    {selectedTeam.logo_url ? (
                      <img
                        src={selectedTeam.logo_url}
                        alt={selectedTeam.name}
                        className="w-20 h-20 object-contain rounded-xl border border-border/50 bg-background/50 p-2"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                        {selectedTeam.name.charAt(0)}
                      </div>
                    )}
                    <h2 className="text-3xl font-bold">{selectedTeam.name}</h2>
                  </div>
                  <Badge variant="outline" className="mt-3">{selectedTeam.status}</Badge>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Usuń drużynę
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Notepad Section */}
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Notebook className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Notatnik rozgrywek</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Zapisuj tutaj parowania drużyn. Notatki są zapisywane lokalnie.
              </p>
              <Textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Np.:&#10;Runda 1:&#10;Drużyna A vs Drużyna B&#10;Drużyna C vs Drużyna D&#10;&#10;Runda 2:&#10;..."
                className="min-h-[400px] font-mono text-sm"
              />
            </Card>

            {/* Teams list */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Pozostałe drużyny ({teams.length})</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-muted-foreground w-6 text-right">{index + 1}.</span>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="" className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 truncate">{team.name}</span>
                    <Badge variant="outline" className="text-xs">{team.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę drużynę?</AlertDialogTitle>
            <AlertDialogDescription>
              Drużyna <strong>{selectedTeam?.name}</strong> zostanie trwale usunięta wraz ze wszystkimi członkami. 
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń drużynę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default TeamDraw;
