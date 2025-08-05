import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { checkAndUpdatePremiumStatus, getPremiumStatus } from '../utils/premiumStatus';

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        // First check and update if needed
        const status = await checkAndUpdatePremiumStatus();
        if (mounted) {
          setIsPremium(status);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkStatus();

    // Set up a refresh interval
    const interval = setInterval(checkStatus, 60 * 1000); // Check every minute

    // Set up app state listener to check status when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return { isPremium, loading };
} 