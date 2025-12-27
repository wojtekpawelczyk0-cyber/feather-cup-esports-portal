import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  steam_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  userRoles: string[];
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  initiateSteamLogin: () => Promise<void>;
  linkSteamAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSteamLinked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid blocking
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
    } else {
      setUserRoles(data?.map(r => r.role) || []);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRoles([]);
    setProfile(null);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { error: error as Error | null };
  };

  const initiateSteamLogin = async () => {
    const returnUrl = `${window.location.origin}/auth/steam-callback`;
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-auth?action=login&return_url=${encodeURIComponent(returnUrl)}`;
    
    const response = await fetch(functionUrl);
    const result = await response.json();
    
    if (result.url) {
      window.location.href = result.url;
    }
  };

  const linkSteamAccount = async () => {
    if (!session?.access_token) {
      throw new Error('Musisz być zalogowany, aby połączyć konto Steam');
    }
    
    const returnUrl = `${window.location.origin}/konto?steam_linked=true`;
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-auth?action=link&return_url=${encodeURIComponent(returnUrl)}&user_id=${user?.id}`;
    
    const response = await fetch(functionUrl);
    const result = await response.json();
    
    if (result.url) {
      window.location.href = result.url;
    }
  };

  const isSteamLinked = !!profile?.steam_id;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        userRoles,
        signOut,
        signInWithEmail,
        signUpWithEmail,
        initiateSteamLogin,
        linkSteamAccount,
        refreshProfile,
        isSteamLinked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
