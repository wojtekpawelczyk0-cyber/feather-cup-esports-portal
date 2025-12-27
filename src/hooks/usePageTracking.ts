import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Generate or get visitor ID from localStorage
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem('visitor_id', visitorId);
        }

        await supabase.from('page_visits').insert({
          page_path: location.pathname,
          visitor_id: visitorId,
        });
      } catch (error) {
        // Silent fail - don't break the app for tracking
        console.error('Error tracking page visit:', error);
      }
    };

    trackVisit();
  }, [location.pathname]);
};
