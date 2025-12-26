import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Trophy, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTournamentSettings } from '@/hooks/useTournamentSettings';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Strona Główna', path: '/' },
  { name: 'Mecze', path: '/mecze' },
  { name: 'Wyniki', path: '/wyniki' },
  { name: 'Drużyny', path: '/druzyny' },
  { name: 'Kontakt', path: '/kontakt' },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { settings } = useTournamentSettings();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const tournamentName = settings.tournament_name || 'Feather Cup';
  const nameParts = tournamentName.split(' ');
  const firstWord = nameParts[0];
  const restOfName = nameParts.slice(1).join(' ');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <nav className="max-w-6xl mx-auto glass-nav px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] transition-shadow duration-300 overflow-hidden">
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Trophy className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:block">
              {firstWord} <span className="text-gradient">{restOfName}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'nav-link',
                  location.pathname === link.path && 'active'
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/konto" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden border-2 border-primary/30">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || 'Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-foreground">
                    {profile?.display_name || user.email?.split('@')[0]}
                  </span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="glass" size="sm" asChild>
                  <Link to="/auth">Zaloguj się</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth">Zapisz drużynę</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'px-4 py-3 rounded-xl transition-colors',
                    location.pathname === link.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    <Button variant="glass" className="w-full" asChild>
                      <Link to="/konto" onClick={() => setIsOpen(false)}>
                        <User className="w-4 h-4 mr-2" />
                        Moje konto
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Wyloguj się
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="glass" className="w-full" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        Zaloguj się
                      </Link>
                    </Button>
                    <Button variant="hero" className="w-full" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        Zapisz drużynę
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
