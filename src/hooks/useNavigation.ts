import { useState, useCallback, useEffect } from 'react';

export type View = 'home' | 'complaint' | 'summarizer' | 'history' | 'correction' | 'exhibit' | 'cost' | 'admin_appeal' | 'demand_letter' | 'divorce' | 'lawyer_reg' | 'security' | 'admin' | 'customer_center' | 'lawyer_review' | 'lawyer_search' | 'subscription' | 'litigation_finder' | 'about' | 'payment_success' | 'payment_fail' | 'ad_preview_demo';

export function useNavigation(initialView: View = 'home') {
  const [view, setView] = useState<View>(initialView);

  const navigateTo = useCallback((nextView: View, replace: boolean = false) => {
    setView(nextView);
    window.scrollTo(0, 0);
    
    if (replace) {
      window.history.replaceState({ view: nextView }, '', '');
    } else {
      window.history.pushState({ view: nextView }, '', '');
    }
  }, []);

  useEffect(() => {
    // Initialize history state
    window.history.replaceState({ view: initialView }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view as View);
      } else {
        setView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialView]);

  return { view, navigateTo };
}
