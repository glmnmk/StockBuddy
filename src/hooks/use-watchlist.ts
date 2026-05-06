import { useState, useEffect, useCallback } from 'react';

const WATCHLIST_KEY = 'stockbuddy_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load initial watchlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load watchlist from local storage', error);
    }
  }, []);

  const saveWatchlist = useCallback((newList: string[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      setWatchlist(newList);
      
      // Dispatch a custom event so other components can sync
      window.dispatchEvent(new Event('watchlistUpdated'));
    } catch (error) {
      console.error('Failed to save watchlist to local storage', error);
    }
  }, []);

  const addToWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      if (prev.includes(ticker)) return prev;
      const newList = [...prev, ticker];
      saveWatchlist(newList);
      return newList;
    });
  }, [saveWatchlist]);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const newList = prev.filter((t) => t !== ticker);
      saveWatchlist(newList);
      return newList;
    });
  }, [saveWatchlist]);

  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const newList = prev.includes(ticker) 
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      saveWatchlist(newList);
      return newList;
    });
  }, [saveWatchlist]);

  const isInWatchlist = useCallback((ticker: string) => {
    return watchlist.includes(ticker);
  }, [watchlist]);

  // Sync state if another component updates the watchlist
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem(WATCHLIST_KEY);
        if (stored) {
          setWatchlist(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to sync watchlist', error);
      }
    };

    window.addEventListener('watchlistUpdated', handleUpdate);
    return () => window.removeEventListener('watchlistUpdated', handleUpdate);
  }, []);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist
  };
}
