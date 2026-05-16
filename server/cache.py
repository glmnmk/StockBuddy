"""Simple in-memory TTL cache to avoid hammering Yahoo Finance."""

import time
import threading
from typing import Any, Optional


class TTLCache:
    """Thread-safe in-memory cache with per-key TTL."""

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache. Returns None if expired or missing."""
        with self._lock:
            if key not in self._store:
                return None
            value, expiry = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Set a value in cache with a TTL in seconds."""
        with self._lock:
            self._store[key] = (value, time.time() + ttl_seconds)

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._store.clear()

    def cleanup(self) -> int:
        """Remove expired entries. Returns number removed."""
        with self._lock:
            now = time.time()
            expired = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in expired:
                del self._store[k]
            return len(expired)


# Singleton instance
cache = TTLCache()

# Cache TTL constants (seconds)
# WRDS/Compustat is end-of-day data, so we can cache aggressively
QUOTE_TTL = 1800        # 30 minutes for quotes (EOD data doesn't change intraday)
FINANCIALS_TTL = 86400  # 24 hours for financial statements (annual data)
HISTORY_TTL = 7200      # 2 hours for price history
SEARCH_TTL = 3600       # 1 hour for search results
