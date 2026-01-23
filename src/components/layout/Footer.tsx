import { Link } from 'react-router-dom';
import { Trophy, Twitter, Youtube, Twitch, MessageCircle } from 'lucide-react';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { useTournamentSettings } from '@/hooks/useTournamentSettings';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer = () => {
  const { settings: footerSettings } = useFooterSettings();
  const { settings: tournamentSettings } = useTournamentSettings();
  const { t } = useLanguage();

  const socialLinks = [
    { icon: Twitter, label: 'Twitter', url: footerSettings.footer_twitter },
    { icon: Youtube, label: 'YouTube', url: footerSettings.footer_youtube },
    { icon: Twitch, label: 'Twitch', url: footerSettings.footer_twitch },
    { icon: MessageCircle, label: 'Discord', url: footerSettings.footer_discord },
  ].filter(link => link.url);

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                {tournamentSettings.site_logo_url ? (
                  <img src={tournamentSettings.site_logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Trophy className="w-5 h-5 text-primary" />
                )}
              </div>
              <span className="text-xl font-bold text-foreground">
                {tournamentSettings.tournament_name.split(' ')[0]}{' '}
                <span className="text-gradient">{tournamentSettings.tournament_name.split(' ').slice(1).join(' ')}</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              {footerSettings.footer_description}
            </p>
            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-6">
                {socialLinks.map(({ icon: Icon, label, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-all duration-300"
                    aria-label={label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.navigation')}</h4>
            <ul className="space-y-2">
              {[
                { name: t('nav.home'), path: '/' },
                { name: t('nav.matches'), path: '/mecze' },
                { name: t('nav.results'), path: '/wyniki' },
                { name: t('nav.teams'), path: '/druzyny' },
                { name: t('nav.contact'), path: '/kontakt' },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.information')}</h4>
            <ul className="space-y-2">
              {[
                { name: t('footer.terms'), path: '/regulamin' },
                { name: t('footer.privacy'), path: '/polityka-prywatnosci' },
                { name: t('footer.faq'), path: '/faq' },
                { name: t('footer.support'), path: '/wsparcie' }
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            {footerSettings.footer_copyright}
          </p>
          <p className="text-muted-foreground text-sm">
            Designed by <span className="text-primary font-medium">Jager</span> for Feather Cup
          </p>
        </div>
      </div>
    </footer>
  );
};
