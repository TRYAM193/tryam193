// src/hooks/useGlobalTemplates.ts
import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

export interface Template {
  id: string;
  name: string;
  thumbnailUrl: string;
  category: string;
  createdAt: any; // Timestamp or string
  canvasData: any; // The actual design data for the template
  canvasBackground: string; // Background color or image for the template
  type: string
}

export function useGlobalTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true); // Initial full page load
  const [isFetchingMore, setIsFetchingMore] = useState(false); // "Load More" loading state
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Initial Fetch (First 20)
  useEffect(() => {
    async function fetchInitialTemplates() {
      try {
        setLoading(true);
        const templatesRef = collection(db, 'templates');
        // Order by createdAt desc so newest appear first
        const q = query(templatesRef, orderBy('createdAt', 'desc'), limit(20));
        
        const snapshot = await getDocs(q);
        const fetchedTemplates: Template[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Template));

        setTemplates(fetchedTemplates);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        
        // If we got fewer than 20, there are no more to load
        if (snapshot.docs.length < 20) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Failed to load templates");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialTemplates();
  }, []);

  // Load More Function (Next 10)
  const loadMore = async () => {
    if (!lastDoc || !hasMore || isFetchingMore) return;

    try {
      setIsFetchingMore(true);
      const templatesRef = collection(db, 'templates');
      const q = query(
        templatesRef, 
        orderBy('createdAt', 'desc'), 
        startAfter(lastDoc), 
        limit(10) // Load 10 at a time
      );

      const snapshot = await getDocs(q);
      const newTemplates: Template[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));

      if (newTemplates.length > 0) {
        setTemplates(prev => [...prev, ...newTemplates]); // Append to list
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        
        if (newTemplates.length < 10) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more templates:", err);
      // Optional: set a toast error here
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Derive categories dynamically from the *entire* loaded set
  const categories = useMemo(() => {
    const uniqueCats = new Set(templates.map(t => t.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCats).sort()];
  }, [templates]);

  return { 
    templates, 
    categories, 
    loading, 
    error, 
    loadMore, 
    isFetchingMore, 
    hasMore 
  };
}