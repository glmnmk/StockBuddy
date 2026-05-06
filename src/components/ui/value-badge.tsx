import React from 'react';
import { cn } from '@/lib/utils';

interface ValueBadgeProps {
  children: React.ReactNode;
  variant: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const ValueBadge: React.FC<ValueBadgeProps> = ({ 
  children, 
  variant, 
  className 
}) => {
  const variantClasses = {
    positive: 'value-positive',
    negative: 'value-negative',
    neutral: 'value-neutral'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
};