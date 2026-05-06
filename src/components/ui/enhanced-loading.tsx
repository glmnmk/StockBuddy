import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  size = 'md',
  text,
  className
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-3 animate-fade-in',
      className
    )}>
      <div className="relative">
        <Loader2 className={cn(
          'animate-spin text-primary',
          sizes[size]
        )} />
        <div className={cn(
          'absolute inset-0 rounded-full animate-pulse-gentle',
          'border-2 border-primary/20',
          size === 'sm' && 'border-1',
          size === 'lg' && 'border-3'
        )} />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse-gentle">
          {text}
        </p>
      )}
    </div>
  );
};

// Skeleton loader for cards
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    'animate-pulse space-y-4 p-6 bg-card border border-border rounded-lg',
    className
  )}>
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded animate-shimmer" />
      <div className="h-4 bg-muted rounded w-3/4 animate-shimmer" />
    </div>
    <div className="space-y-3">
      <div className="h-8 bg-muted rounded animate-shimmer" />
      <div className="h-4 bg-muted rounded animate-shimmer" />
    </div>
  </div>
);

// Shimmer effect for loading states
export const ShimmerLine: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
  width = 'w-full', 
  height = 'h-4',
  className 
}) => (
  <div className={cn(
    'bg-muted rounded overflow-hidden relative',
    width,
    height,
    className
  )}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
  </div>
);