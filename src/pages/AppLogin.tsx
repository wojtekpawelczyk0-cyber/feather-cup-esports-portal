import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const BACKEND_URL = 'https://auth.feathercup.pl';

const AppLogin = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasSteamParams = urlParams.has('openid.claimed_id');

    if (!hasSteamParams) {
      setStatus('error');
      setErrorMessage('Brak danych logowania Steam');
      setTimeout(() => {
        window.location.href = 'https://feathercup.pl';
      }, 5000);
      return;
    }

    const handleAuth = async () => {
      try {
        console.log('[Auth] Verifying Steam login...');
        const response = await fetch(`${BACKEND_URL}/api/auth/steam/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: window.location.href }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Weryfikacja Steam nie powiodła się');
        }

        const { steamId } = await response.json();

        if (!steamId) {
          throw new Error('Nie udało się pobrać Steam ID');
        }

        console.log('[Auth] Steam ID verified:', steamId);

        localStorage.setItem(
          'feathercup_steam_auth',
          JSON.stringify({
            steamId,
            timestamp: Date.now(),
          })
        );

        setStatus('success');

        setTimeout(() => {
          window.close();
        }, 3000);
      } catch (error: any) {
        console.error('[Auth] Error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Błąd podczas logowania');
        setTimeout(() => {
          window.location.href = 'https://feathercup.pl';
        }, 5000);
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md w-full">
        {/* Logo */}
        <h1 className="text-4xl font-black tracking-widest text-primary">
          FEATHERCUP
        </h1>

        {/* Spinner */}
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-lg">
              Weryfikacja logowania Steam...
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-accent" />
            <p className="text-foreground text-xl font-semibold">
              Zalogowano pomyślnie!
            </p>
            <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground text-sm space-y-1">
              <p className="font-semibold text-foreground">
                Wróć do aplikacji FeatherCup
              </p>
              <p>Logowanie zostanie dokończone automatycznie.</p>
              <p>Możesz zamknąć tę kartę.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-foreground text-xl font-semibold">
              Wystąpił błąd
            </p>
            <p className="text-destructive text-sm">{errorMessage}</p>
            <p className="text-muted-foreground text-xs">
              Przekierowanie za 5 sekund...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppLogin;
