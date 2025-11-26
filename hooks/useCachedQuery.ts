// hooks/useCachedQuery.ts
import { useEffect, useState, useCallback } from "react";
import { getDocs, Query, DocumentData } from "firebase/firestore";
import { getSessionCache, setSessionCache, removeSessionCache } from "../utils/cacheUtils";

export function useCachedQuery(cacheKey: string, queryRefFactory: () => Query | null, deps: any[] = []) {
  const [data, setData] = useState<DocumentData[] | null | undefined>(() => getSessionCache(cacheKey));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<any>(null);

  const invalidate = useCallback(() => {
    removeSessionCache(cacheKey);
    setData(undefined); // Trigger re-fetch
  }, [cacheKey]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const q = queryRefFactory();
      if (!q) {
          setData(null);
          setLoading(false);
          return;
      }
      
      if (data === undefined) { // Only fetch if cache was invalidated or it's the first time
          setLoading(true);
          setError(null);
          try {
            const snap = await getDocs(q);
            if (!mounted) return;
            const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setData(arr);
            setSessionCache(cacheKey, arr);
          } catch (e) { 
            if(mounted) setError(e); 
          } finally { 
            if (mounted) setLoading(false); 
          }
      } else {
        setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, data, ...deps]);

  return { data, loading, error, invalidate };
}
