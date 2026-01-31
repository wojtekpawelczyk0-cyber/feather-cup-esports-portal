import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapData } from '@/hooks/useMapVetoRealtime';

interface RandomMapAnimationProps {
  maps: MapData[];
  onComplete: (selectedMapId: string) => void;
  isActive: boolean;
}

export const RandomMapAnimation = ({ maps, onComplete, isActive }: RandomMapAnimationProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  
  const availableMaps = maps.filter(m => m.status === 'available');

  const startSpin = useCallback(() => {
    if (availableMaps.length === 0) return;
    
    setIsSpinning(true);
    setSpeed(50);
    setSelectedMap(null);
    
    // Pick a random target
    const targetIndex = Math.floor(Math.random() * availableMaps.length);
    const targetMap = availableMaps[targetIndex];
    
    // Calculate total spins (2-3 full rotations + target position)
    const totalSteps = availableMaps.length * (2 + Math.random()) + targetIndex;
    let currentStep = 0;
    
    const spin = () => {
      currentStep++;
      const progress = currentStep / totalSteps;
      
      // Ease out - slow down as we approach the end
      const newSpeed = 50 + (progress * progress * 400);
      setSpeed(newSpeed);
      
      setCurrentIndex(prev => (prev + 1) % availableMaps.length);
      
      if (currentStep < totalSteps) {
        setTimeout(spin, newSpeed);
      } else {
        // Final selection
        setIsSpinning(false);
        setSelectedMap(targetMap);
        setTimeout(() => {
          onComplete(targetMap.id);
        }, 1000);
      }
    };
    
    spin();
  }, [availableMaps, onComplete]);

  useEffect(() => {
    if (isActive && !isSpinning && !selectedMap) {
      startSpin();
    }
  }, [isActive, isSpinning, selectedMap, startSpin]);

  if (!isActive && !isSpinning && !selectedMap) return null;
  if (availableMaps.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-6 animate-pulse">
          ⏱️ Czas minął! Losowanie mapy...
        </h2>
        
        {/* Spinning carousel */}
        <div className="relative h-64 w-80 mx-auto overflow-hidden">
          {/* Glow effect at center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-full h-32 border-y-4 border-primary bg-primary/10" />
          </div>
          
          {/* Maps carousel */}
          <div 
            className="absolute inset-0 flex flex-col items-center transition-transform"
            style={{
              transform: `translateY(${-currentIndex * 80 + 80}px)`,
              transitionDuration: isSpinning ? `${speed}ms` : '0ms',
              transitionTimingFunction: 'linear'
            }}
          >
            {/* Repeat maps for smooth infinite scroll effect */}
            {[...availableMaps, ...availableMaps, ...availableMaps].map((map, idx) => (
              <div
                key={`${map.id}-${idx}`}
                className={cn(
                  "flex-shrink-0 w-64 h-20 flex items-center justify-center gap-4 rounded-xl transition-all",
                  selectedMap?.id === map.id && idx === availableMaps.length + currentIndex
                    ? "bg-primary/30 border-2 border-primary scale-110"
                    : "bg-card/50"
                )}
              >
                <img 
                  src={map.image} 
                  alt={map.name} 
                  className="w-24 h-14 object-cover rounded-lg"
                />
                <span className="text-xl font-bold text-white">{map.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected map reveal */}
        {selectedMap && !isSpinning && (
          <div className="mt-8 animate-scale-in">
            <Card className="inline-block overflow-hidden border-2 border-red-500">
              <div className="relative">
                <img 
                  src={selectedMap.image} 
                  alt={selectedMap.name}
                  className="w-80 h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-4">
                  <span className="text-3xl font-bold text-red-400">
                    🚫 {selectedMap.name} BANNED
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
