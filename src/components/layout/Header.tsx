
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Calculator, Home, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { StockSearch } from '@/components/ui/stock-search';
import stockBuddyLogo from '@/assets/stockbuddy-logo-modern.png';

export const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="glass border-b sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center space-x-3 group hover-lift-subtle shrink-0">
            <div className="relative">
              <img 
                src={stockBuddyLogo} 
                alt="StockBuddy Logo" 
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <h1 className="text-2xl font-bold text-primary hidden sm:block">
              StockBuddy
            </h1>
          </Link>

          {/* Search bar — hidden on home page (has its own hero search) */}
          {location.pathname !== '/' && (
            <div className="flex-1 max-w-md hidden md:block">
              <StockSearch
                placeholder="Search stocks..."
                variant="default"
              />
            </div>
          )}

          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <Button 
              variant={isActive('/') ? 'default' : 'ghost'} 
              size="sm" 
              asChild
              className="px-2 sm:px-3"
            >
              <Link to="/" className="flex items-center space-x-1 sm:space-x-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>

            <Button 
              variant={isActive('/stocks') ? 'default' : 'ghost'} 
              size="sm" 
              asChild
              className="px-2 sm:px-3"
            >
              <Link to="/stocks" className="flex items-center space-x-1 sm:space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Stocks</span>
              </Link>
            </Button>

            <Button 
              variant={isActive('/calculator') ? 'default' : 'ghost'} 
              size="sm" 
              asChild
              className="px-2 sm:px-3"
            >
              <Link to="/calculator" className="flex items-center space-x-1 sm:space-x-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden md:inline">DCF Calculator</span>
                <span className="hidden sm:inline md:hidden">Calc</span>
              </Link>
            </Button>

            <Button 
              variant={isActive('/glossary') ? 'default' : 'ghost'} 
              size="sm" 
              asChild
              className="px-2 sm:px-3"
            >
              <Link to="/glossary" className="flex items-center space-x-1 sm:space-x-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Glossary</span>
              </Link>
            </Button>

            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        {location.pathname !== '/' && (
          <div className="md:hidden pb-3">
            <StockSearch placeholder="Search stocks..." variant="default" />
          </div>
        )}
      </nav>
    </header>
  );
};
