// hooks/useCachedDoc.ts
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../components/firebaseClient";

function getSessionKey(collectionName: string, id?: string) {
  return `${collectionName}_${id ?? "anon"}`;
}

export function useCachedDoc<T = any>(collectionName: string, id?: string, deps: any[] = []) {
  const [data, setData] = useState<T | undefined | null>(() => {
    // Initialize from cache synchronously
    if (!id) return null;
    try {
      const raw = sessionStorage.getItem(getSessionKey(collectionName, id));
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  });
  const [loading, setLoading] = useState<boolean>(data === undefined);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = getSessionKey(collectionName, id);

  const invalidate = useCallback(() => {
    try { sessionStorage.removeItem(cacheKey); } catch {}
    setData(undefined);
    setError(null);
    setLoading(true);
  }, [cacheKey]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) {
        if (mounted) { setData(null); setLoading(false); }
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const ref = doc(db, collectionName, id);
        const snap = await getDoc(ref);
        if (!mounted) return;
        
        const docData = snap.exists() ? (snap.data() as T) : null;
        
        try { sessionStorage.setItem(cacheKey, JSON.stringify(docData)); } catch {}
        setData(docData);
      } catch (err: any) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (data === undefined) {
      run();
    }
    
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, id, cacheKey, ...deps]);

  return { data, loading, error, invalidate };
}