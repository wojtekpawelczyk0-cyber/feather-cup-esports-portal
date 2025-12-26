import { Link } from 'react-router-dom';
import { Trophy, Twitter, Youtube, Twitch, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Feather <span className="text-gradient">Cup</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Profesjonalny turniej esportowy z nagrodami. Dołącz do najlepszych 
              graczy i pokaż swoje umiejętności na arenie Feather Cup.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Youtube, label: 'YouTube' },
                { icon: Twitch, label: 'Twitch' },
                { icon: MessageCircle, label: 'Discord' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-all duration-300"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Nawigacja</h4>
            <ul className="space-y-2">
              {['Strona Główna', 'Mecze', 'Wyniki', 'Drużyny', 'Kontakt'].map((link) => (
                <li key={link}>
                  <Link
                    to={link === 'Strona Główna' ? '/' : `/${link.toLowerCase()}`}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Informacje</h4>
            <ul className="space-y-2">
              {['Regulamin', 'Polityka prywatności', 'FAQ', 'Wsparcie'].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 Feather Cup. Wszelkie prawa zastrzeżone.
          </p>
          <p className="text-muted-foreground text-sm">
            Designed with ❤️ for esports
          </p>
        </div>
      </div>
    </footer>
  );
};
