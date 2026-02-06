import { useEffect } from 'react';
import { useTournamentSettings } from './useTournamentSettings';

export const useDynamicSEO = () => {
  const { settings, loading } = useTournamentSettings();

  useEffect(() => {
    if (loading) return;

    // Update document title
    if (settings.site_title) {
      document.title = settings.site_title;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && settings.site_description) {
      metaDescription.setAttribute('content', settings.site_description);
    }

    // Update OG title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && settings.site_title) {
      ogTitle.setAttribute('content', settings.site_title);
    }

    // Update OG description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && settings.site_description) {
      ogDescription.setAttribute('content', settings.site_description);
    }

    // Update OG image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (settings.og_image_url) {
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', settings.og_image_url);
    }

    // Update favicon
    if (settings.favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = settings.favicon_url;
      
      // Also update shortcut icon for broader compatibility
      let shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      if (!shortcutIcon) {
        shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        document.head.appendChild(shortcutIcon);
      }
      shortcutIcon.href = settings.favicon_url;

      // Update apple-touch-icon for iOS devices
      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach((icon) => {
        (icon as HTMLLinkElement).href = settings.favicon_url;
      });

      // If no apple-touch-icon exists, create one
      if (appleTouchIcons.length === 0) {
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = settings.favicon_url;
        document.head.appendChild(appleIcon);
      }
    }
  }, [settings, loading]);

  return { settings, loading };
};
