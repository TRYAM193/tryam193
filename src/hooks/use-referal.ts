import { useEffect } from 'react';

export function useReferralTracking() {
  useEffect(() => {
    // Check the URL for a 'ref' parameter
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    // If found, save it to localStorage so it survives until they sign up
    if (refCode) {
      localStorage.setItem('tryam_pending_referral', refCode);
    }
  }, []);
}