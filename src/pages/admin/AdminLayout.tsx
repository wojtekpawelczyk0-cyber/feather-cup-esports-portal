import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Trophy, Calendar, Image, Settings, 
  Shield, Loader2, ChevronRight, Mic, GitBranch 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type AppRole = 'owner' | 'admin' | 'commentator' | 'support';

interface UserRole {
  role: AppRole;
}

const adminLinks = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['owner', 'admin', 'commentator', 'support'] },
  { name: 'Panel Komentatora', path: '/admin/komentator', icon: Mic, roles: ['owner', 'admin', 'commentator'] },
  { name: 'Drabinka', path: '/admin/drabinka', icon: GitBranch, roles: ['owner', 'admin'] },
  { name: 'Mecze', path: '/admin/mecze', icon: Calendar, roles: ['owner', 'admin'] },
  { name: 'Drużyny', path: '/admin/druzyny', icon: Users, roles: ['owner', 'admin'] },
  { name: 'Wyniki', path: '/admin/wyniki', icon: Trophy, roles: ['owner', 'admin'] },
  { name: 'Sponsorzy', path: '/admin/sponsorzy', icon: Image, roles: ['owner', 'admin'] },
  { name: 'Użytkownicy', path: '/admin/uzytkownicy', icon: Shield, roles: ['owner'] },
  { name: 'Ustawienia', path: '/admin/ustawienia', icon: Settings, roles: ['owner'] },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      checkUserRoles();
    }
  }, [user, authLoading, navigate]);

  const checkUserRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = (data || []).map((r: UserRole) => r.role);
      
      if (roles.length === 0) {
        navigate('/');
        return;
      }

      setUserRoles(roles);
    } catch (error) {
      console.error('Error checking roles:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (requiredRoles: string[]) => {
    return userRoles.some((role) => requiredRoles.includes(role));
  };

  const getRoleBadge = () => {
    if (userRoles.includes('owner')) return { label: 'Owner', color: 'bg-red-500/20 text-red-400' };
    if (userRoles.includes('admin')) return { label: 'Admin', color: 'bg-orange-500/20 text-orange-400' };
    if (userRoles.includes('commentator')) return { label: 'Komentator', color: 'bg-blue-500/20 text-blue-400' };
    if (userRoles.includes('support')) return { label: 'Support', color: 'bg-green-500/20 text-green-400' };
    return null;
  };

  const roleBadge = getRoleBadge();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">Feather Cup</span>
              <div className="text-xs text-muted-foreground">Panel administracyjny</div>
            </div>
          </Link>
        </div>

        {/* Role Badge */}
        {roleBadge && (
          <div className="px-6 py-3 border-b border-border">
            <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', roleBadge.color)}>
              {roleBadge.label}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {adminLinks
            .filter((link) => hasAccess(link.roles))
            .map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
        </nav>

        {/* Back to Site */}
        <div className="p-4 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="font-medium">Wróć na stronę</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ userRoles }} />
      </main>
    </div>
  );
};

export default AdminLayout;
