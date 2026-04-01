import { useState, useEffect, useCallback } from "react";

export function useQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher().then((result) => {
      if (!cancelled) { setData(result); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, refresh };
}
