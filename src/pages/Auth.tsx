import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, initiateSteamLogin, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(formData.email, formData.password);
        if (error) {
          toast({
            title: t('auth.login_error'),
            description: error.message === 'Invalid login credentials' 
              ? t('auth.invalid_credentials')
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({ title: t('auth.logged_in') });
          navigate('/');
        }
      } else {
        const { error } = await signUpWithEmail(
          formData.email,
          formData.password,
          formData.displayName
        );
        if (error) {
          toast({
            title: t('auth.register_error'),
            description: error.message === 'User already registered'
              ? t('auth.user_exists')
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({ 
            title: t('auth.account_created'),
            description: t('auth.can_login'),
          });
          navigate('/');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSteamLogin = async () => {
    try {
      await initiateSteamLogin();
    } catch (error) {
      toast({
        title: t('auth.error'),
        description: t('auth.steam_error'),
        variant: 'destructive',
      });
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

  return (
    <Layout>
      <HeroSection
        title={isLogin ? t('auth.login') : t('auth.register')}
        subtitle={t('auth.subtitle')}
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-md mx-auto px-4">
          <div className="glass-card p-8">
            {/* Steam Login Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full mb-6 bg-[#171a21] hover:bg-[#2a475e] border-[#2a475e] text-foreground"
              onClick={handleSteamLogin}
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.46 3.66 10.07 8.65 11.52l3.58-4.86c-.3-.04-.6-.07-.91-.07-2.93 0-5.32 2.39-5.32 5.32 0 .24.02.48.05.71l-2.31 3.13C1.29 22.16 0 17.29 0 12 0 5.37 5.37 0 12 0zm0 4.8c3.97 0 7.2 3.23 7.2 7.2s-3.23 7.2-7.2 7.2c-.79 0-1.55-.13-2.26-.37l1.68-2.28c.19.02.38.03.58.03 2.65 0 4.8-2.15 4.8-4.8s-2.15-4.8-4.8-4.8-4.8 2.15-4.8 4.8c0 .87.23 1.68.64 2.38l-1.68 2.28C4.97 15.12 4.8 13.59 4.8 12c0-3.97 3.23-7.2 7.2-7.2z"/>
              </svg>
              {t('auth.steam_login')}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">{t('auth.or')}</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {t('auth.nickname')}
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder={t('auth.nickname_placeholder')}
                    className="bg-secondary/50 border-border/50 focus:border-primary"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('auth.email_placeholder')}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.password_placeholder')}
                  required
                  minLength={6}
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isLogin ? t('auth.login') : t('auth.register')}
              </Button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                {isLogin ? t('auth.no_account') : t('auth.have_account')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
