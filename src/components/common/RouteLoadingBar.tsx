import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';

// Configure NProgress styling & behaviour
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.15,
  easing: 'ease',
  speed: 300,
});

export const RouteLoadingBar: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Start top loading progress on route change
    NProgress.start();

    // Scroll smoothly to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Complete loading bar with slight tactile delay so it feels substantial
    const timer = setTimeout(() => {
      NProgress.done();
    }, 180);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname, location.search]);

  return null;
};
