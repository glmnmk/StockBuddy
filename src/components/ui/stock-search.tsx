import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchStocks } from '@/lib/api';
import type { SearchResult } from '@/lib/types';

interface StockSearchProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional classes for the container */
  className?: string;
  /** Size variant */
  variant?: 'default' | 'hero';
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Optional callback to override default navigation behavior */
  onSelect?: (ticker: string) => void;
}

export const StockSearch: React.FC<StockSearchProps> = ({
  placeholder = 'Search any stock (e.g. AAPL, Tesla, Microsoft)...',
  className = '',
  variant = 'default',
  autoFocus = false,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchStocks(query);
        setResults(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((ticker: string) => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    
    if (onSelect) {
      onSelect(ticker);
    } else {
      navigate(`/stocks/${ticker}`);
    }
  }, [navigate, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex].ticker);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const isHero = variant === 'hero';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${
            isHero ? 'h-5 w-5' : 'h-4 w-4'
          }`}
        />
        {isLoading && (
          <Loader2
            className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground ${
              isHero ? 'h-5 w-5' : 'h-4 w-4'
            }`}
          />
        )}
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className={`${isHero ? 'pl-12 pr-12 py-6 text-lg rounded-2xl' : 'pl-10 pr-10'}`}
        />
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
          {results.map((result, index) => (
            <button
              key={result.ticker}
              onClick={() => handleSelect(result.ticker)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                selectedIndex === index
                  ? 'bg-primary/10'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{result.ticker}</span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                    {result.exchange}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {result.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
