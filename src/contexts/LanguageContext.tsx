import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pl' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pl: {
    // Navigation
    'nav.home': 'Strona Główna',
    'nav.matches': 'Mecze',
    'nav.results': 'Wyniki',
    'nav.teams': 'Drużyny',
    'nav.contact': 'Kontakt',
    'nav.login': 'Zaloguj się',
    'nav.register_team': 'Zapisz drużynę',
    
    // Account page
    'account.title': 'Moje Konto',
    'account.steam_connection': 'Połączenie Steam',
    'account.steam_connected': 'Konto Steam połączone',
    'account.steam_not_connected': 'Konto Steam niepołączone',
    'account.steam_required': 'Aby utworzyć drużynę lub dołączyć jako członek, musisz połączyć swoje konto Steam.',
    'account.connect_steam': 'Połącz konto Steam',
    'account.info': 'Informacje o koncie',
    'account.email': 'Email',
    'account.nickname': 'Nick',
    'account.steam': 'Steam',
    'account.connected': 'Połączone',
    'account.not_connected': 'Niepołączone',
    'account.created': 'Konto utworzone',
    'account.settings': 'Ustawienia',
    'account.change_password': 'Zmień hasło',
    'account.quick_links': 'Szybkie linki',
    'account.my_team': 'Moja drużyna',
    'account.logout': 'Wyloguj się',
    'account.language': 'Język',
    'account.language_polish': 'Polski',
    'account.language_english': 'English',
    
    // Auth
    'auth.logged_out': 'Wylogowano pomyślnie',
    'auth.steam_linked': 'Konto Steam połączone!',
    'auth.steam_linked_desc': 'Możesz teraz tworzyć i dołączać do drużyn.',
    'auth.error': 'Błąd',
    
    // Contact
    'contact.title': 'Kontakt',
    'contact.subtitle': 'Masz pytania? Skontaktuj się z nami.',
    'contact.name': 'Imię i nazwisko',
    'contact.email': 'Adres email',
    'contact.discord_id': 'Discord ID',
    'contact.subject': 'Temat',
    'contact.message': 'Wiadomość',
    'contact.send': 'Wyślij wiadomość',
    'contact.sending': 'Wysyłanie...',
    'contact.success': 'Wiadomość wysłana!',
    'contact.success_desc': 'Odpowiemy najszybciej jak to możliwe.',
    'contact.error': 'Wystąpił błąd podczas wysyłania wiadomości.',
    
    // Footer
    'footer.navigation': 'Nawigacja',
    'footer.information': 'Informacje',
    'footer.terms': 'Regulamin',
    'footer.privacy': 'Polityka prywatności',
    'footer.faq': 'FAQ',
    'footer.support': 'Wsparcie',
    
    // Common
    'common.loading': 'Ładowanie...',
    'common.save': 'Zapisz',
    'common.cancel': 'Anuluj',
    'common.edit': 'Edytuj',
    'common.delete': 'Usuń',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.matches': 'Matches',
    'nav.results': 'Results',
    'nav.teams': 'Teams',
    'nav.contact': 'Contact',
    'nav.login': 'Log in',
    'nav.register_team': 'Register team',
    
    // Account page
    'account.title': 'My Account',
    'account.steam_connection': 'Steam Connection',
    'account.steam_connected': 'Steam account connected',
    'account.steam_not_connected': 'Steam account not connected',
    'account.steam_required': 'To create a team or join as a member, you must connect your Steam account.',
    'account.connect_steam': 'Connect Steam account',
    'account.info': 'Account information',
    'account.email': 'Email',
    'account.nickname': 'Nickname',
    'account.steam': 'Steam',
    'account.connected': 'Connected',
    'account.not_connected': 'Not connected',
    'account.created': 'Account created',
    'account.settings': 'Settings',
    'account.change_password': 'Change password',
    'account.quick_links': 'Quick links',
    'account.my_team': 'My team',
    'account.logout': 'Log out',
    'account.language': 'Language',
    'account.language_polish': 'Polski',
    'account.language_english': 'English',
    
    // Auth
    'auth.logged_out': 'Logged out successfully',
    'auth.steam_linked': 'Steam account connected!',
    'auth.steam_linked_desc': 'You can now create and join teams.',
    'auth.error': 'Error',
    
    // Contact
    'contact.title': 'Contact',
    'contact.subtitle': 'Have questions? Get in touch with us.',
    'contact.name': 'Full name',
    'contact.email': 'Email address',
    'contact.discord_id': 'Discord ID',
    'contact.subject': 'Subject',
    'contact.message': 'Message',
    'contact.send': 'Send message',
    'contact.sending': 'Sending...',
    'contact.success': 'Message sent!',
    'contact.success_desc': 'We will respond as soon as possible.',
    'contact.error': 'An error occurred while sending the message.',
    
    // Footer
    'footer.navigation': 'Navigation',
    'footer.information': 'Information',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.faq': 'FAQ',
    'footer.support': 'Support',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'pl';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
