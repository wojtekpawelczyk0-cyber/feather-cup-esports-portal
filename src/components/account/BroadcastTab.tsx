import { useState, useRef, useCallback } from 'react';
import { Monitor, MonitorOff, Circle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const BroadcastTab = () => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: 30,
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture(mediaStream);
      };

      setStream(mediaStream);
      setIsCapturing(true);
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(language === 'pl' 
          ? 'Nie udało się przechwycić ekranu. Sprawdź uprawnienia przeglądarki.' 
          : 'Failed to capture screen. Check browser permissions.');
      }
    }
  }, [language]);

  const stopCapture = useCallback((streamToStop?: MediaStream) => {
    const s = streamToStop || stream;
    if (s) {
      s.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsCapturing(false);
  }, [stream]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          {language === 'pl' ? 'Transmisja na żywo' : 'Live Broadcast'}
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          {language === 'pl'
            ? 'Przechwytuj obraz z ekranu i prowadź transmisję na żywo bezpośrednio z przeglądarki.'
            : 'Capture your screen and broadcast live directly from the browser.'}
        </p>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
          {!isCapturing ? (
            <Button variant="hero" onClick={startCapture} className="gap-2">
              <Circle className="w-4 h-4 text-red-500 fill-red-500" />
              {language === 'pl' ? 'Rozpocznij przechwytywanie' : 'Start Capture'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => stopCapture()} className="gap-2">
              <Square className="w-4 h-4" />
              {language === 'pl' ? 'Zatrzymaj' : 'Stop'}
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Video Preview */}
        <div className="relative rounded-xl overflow-hidden bg-secondary/50 border border-border aspect-video">
          {isCapturing && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-semibold">
              <Circle className="w-2 h-2 fill-white animate-pulse" />
              LIVE
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {!isCapturing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <MonitorOff className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-sm">
                {language === 'pl' ? 'Brak aktywnej transmisji' : 'No active broadcast'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastTab;
