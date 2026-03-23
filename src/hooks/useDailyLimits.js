// src/hooks/useDailyLimits.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';

export function useDailyLimits() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ cheap_count: 0, gen_count: 0 });

  const GEN_LIMIT = 5;   // Visible
  const CHEAP_LIMIT = 50; // Invisible (Safety)

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, `users/${user.uid}/daily_stats/${today}`);
    console.log(today)

    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          setStats(doc.data());
        } else {
          setStats({ cheap_count: 0, gen_count: 0 });
        }
      },
      (error) => {
        console.error("Error fetching daily limits:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const optimisticIncrementGen = () => {
    setStats(prev => ({
      ...prev,
      gen_count: (prev.gen_count || 0) + 1
    }));
  };

  return {
    genUsed: stats.gen_count || 0,
    genRemaining: Math.max(0, GEN_LIMIT - (stats.gen_count || 0)),
    genLimit: GEN_LIMIT,
    incrementGen: optimisticIncrementGen,

    // We strictly use this for internal logic, not to show the user
    cheapUsed: stats.cheap_count || 0,
    isCheapLimitReached: (stats.cheap_count || 0) >= CHEAP_LIMIT
  };
}