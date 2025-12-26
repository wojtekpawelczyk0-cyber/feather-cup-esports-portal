import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SteamCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState('Weryfikacja logowania Steam...');

  useEffect(() => {
    const verifySteamLogin = async () => {
      try {
        // Build verification URL with all OpenID params
        const params = new URLSearchParams(searchParams);
        params.set('action', 'verify');
        
        const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-auth?${params.toString()}`;
        
        console.log('Verifying Steam login...');
        setStatus('Weryfikacja konta Steam...');
        
        const response = await fetch(verifyUrl);
        const result = await response.json();

        console.log('Steam verify result:', result);

        if (result.success && result.redirectUrl) {
          setStatus('Logowanie...');
          
          // Use the magic link to sign in
          window.location.href = result.redirectUrl;
        } else if (result.success) {
          toast({
            title: 'Zalogowano przez Steam!',
            description: `Witaj, ${result.displayName}!`,
          });
          
          // Refresh the session
          await supabase.auth.refreshSession();
          navigate('/');
        } else {
          throw new Error(result.error || 'Verification failed');
        }
      } catch (error) {
        console.error('Steam callback error:', error);
        toast({
          title: 'Błąd logowania',
          description: 'Nie udało się zweryfikować konta Steam',
          variant: 'destructive',
        });
        navigate('/auth');
      }
    };

    // Check if this is a Steam callback (has OpenID params)
    if (searchParams.has('openid.claimed_id')) {
      verifySteamLogin();
    } else {
      navigate('/auth');
    }
  }, [searchParams, navigate, toast]);

  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">{status}</p>
      </div>
    </Layout>
  );
};

export default SteamCallback;
