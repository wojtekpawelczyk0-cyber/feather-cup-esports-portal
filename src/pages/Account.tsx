import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Settings, User, Shield, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Account = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Wylogowano pomyślnie' });
    navigate('/');
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
                <span className="text-foreground">
                  {profile?.steam_id ? 'Połączone' : 'Niepołączone'}
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
