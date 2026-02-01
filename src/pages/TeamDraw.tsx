import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Trash2, RotateCcw, Sparkles, Notebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(160, 70%, 50%)',
  'hsl(40, 70%, 50%)',
  'hsl(200, 70%, 50%)',
];

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
  const wheelRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    checkAccess();
    fetchTeams();
    loadNotes();
  }, [user]);

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

  const spinWheel = () => {
    if (teams.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedTeam(null);

    // Random number of full rotations (5-10) plus random position
    const fullRotations = 5 + Math.random() * 5;
    const randomIndex = Math.floor(Math.random() * teams.length);
    const segmentAngle = 360 / teams.length;
    const targetAngle = 360 - (randomIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = rotation + fullRotations * 360 + targetAngle;

    setRotation(totalRotation);

    // After animation completes
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedTeam(teams[randomIndex]);
      toast.success(`Wylosowano: ${teams[randomIndex].name}!`);
    }, 5000);
  };

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
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Fortune Wheel Section */}
          <div className="flex flex-col items-center">
            {/* Wheel Container */}
            <div className="relative w-full max-w-lg aspect-square">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-primary drop-shadow-lg" />
              </div>

              {/* Wheel */}
              <svg
                ref={wheelRef}
                viewBox="0 0 400 400"
                className="w-full h-full drop-shadow-2xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {/* Background circle */}
                <circle cx="200" cy="200" r="198" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="4" />
                
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
                    
                    // Text position (middle of segment)
                    const textAngle = startAngle + segmentAngle / 2;
                    const textRad = (textAngle * Math.PI) / 180;
                    const textRadius = 120;
                    const textX = 200 + textRadius * Math.cos(textRad);
                    const textY = 200 + textRadius * Math.sin(textRad);

                    return (
                      <g key={team.id}>
                        <path
                          d={`M 200 200 L ${x1} ${y1} A 190 190 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={color}
                          stroke="hsl(var(--background))"
                          strokeWidth="2"
                          className="transition-opacity hover:opacity-80"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="white"
                          fontSize={teams.length > 16 ? "8" : teams.length > 8 ? "10" : "12"}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                          className="pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {team.name.length > 12 ? team.name.substring(0, 12) + '...' : team.name}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <text x="200" y="200" fill="hsl(var(--muted-foreground))" fontSize="16" textAnchor="middle" dominantBaseline="middle">
                    Brak drużyn
                  </text>
                )}

                {/* Center circle */}
                <circle cx="200" cy="200" r="30" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
                <circle cx="200" cy="200" r="20" fill="hsl(var(--primary))" />
              </svg>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mt-8">
              <Button
                size="lg"
                onClick={spinWheel}
                disabled={isSpinning || teams.length === 0}
                className="gap-2 px-8"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Losowanie...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Losuj!
                  </>
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
              <Card className="mt-8 p-6 w-full max-w-lg animate-scale-in border-primary/50">
                <div className="text-center mb-4">
                  <Badge variant="secondary" className="mb-2">Wylosowana drużyna</Badge>
                  <div className="flex items-center justify-center gap-4">
                    {selectedTeam.logo_url && (
                      <img
                        src={selectedTeam.logo_url}
                        alt={selectedTeam.name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    )}
                    <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                  </div>
                  <Badge variant="outline" className="mt-2">{selectedTeam.status}</Badge>
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
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
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
