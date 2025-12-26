import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogOut, Settings, User, Shield, Loader2, Link2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Account = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading, signOut, linkSteamAccount, refreshProfile, isSteamLinked } = useAuth();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Handle Steam link callback
  useEffect(() => {
    const steamLinked = searchParams.get('steam_linked');
    if (steamLinked === 'true') {
      refreshProfile();
      toast({ title: 'Konto Steam połączone!', description: 'Możesz teraz tworzyć i dołączać do drużyn.' });
      // Clear URL params
      window.history.replaceState({}, '', '/konto');
    }
  }, [searchParams]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Wylogowano pomyślnie' });
    navigate('/');
  };

  const handleLinkSteam = async () => {
    setLinking(true);
    try {
      await linkSteamAccount();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <HeroSection title="Moje Konto" size="sm">
        <div className="flex flex-col items-center gap-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-secondary overflow-hidden border-4 border-primary/30">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          {/* Display Name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {profile?.display_name || user.email?.split('@')[0]}
            </h2>
            {profile?.steam_id && (
              <p className="text-muted-foreground text-sm mt-1">
                Steam ID: {profile.steam_id}
              </p>
            )}
          </div>
        </div>
      </HeroSection>

      <section className="py-12 md:py-16">
        <div className="container max-w-2xl mx-auto px-4">
          {/* Steam Connection Card */}
          <div className={`glass-card p-6 mb-6 border-2 ${isSteamLinked ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Połączenie Steam
            </h3>
            
            {isSteamLinked ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-foreground">Konto Steam połączone</p>
                  <p className="text-sm text-muted-foreground">Steam ID: {profile?.steam_id}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Konto Steam niepołączone</p>
                    <p className="text-sm text-muted-foreground">
                      Aby utworzyć drużynę lub dołączyć jako członek, musisz połączyć swoje konto Steam.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="hero" 
                  onClick={handleLinkSteam} 
                  disabled={linking}
                  className="w-full"
                >
                  {linking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Połącz konto Steam
                </Button>
              </>
            )}
          </div>

          {/* Account Info Card */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Informacje o koncie
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Nick</span>
                <span className="text-foreground">{profile?.display_name || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Steam</span>
                <span className={isSteamLinked ? 'text-green-500' : 'text-yellow-500'}>
                  {isSteamLinked ? 'Połączone' : 'Niepołączone'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Konto utworzone</span>
                <span className="text-foreground">
                  {new Date(user.created_at).toLocaleDateString('pl-PL')}
                </span>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Ustawienia
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Shield className="w-4 h-4 mr-2" />
                Zmień hasło
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Szybkie linki</h3>
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/moja-druzyna">
                  <User className="w-4 h-4 mr-2" />
                  Moja drużyna
                </Link>
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button variant="destructive" onClick={handleSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Wyloguj się
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Account;
