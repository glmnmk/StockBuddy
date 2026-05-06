import React from 'react';
import { cn } from '@/lib/utils';

interface StockCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'danger' | 'success';
}

export const StockCard: React.FC<StockCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const variantClasses = {
    default: 'stock-card transition-all duration-300 ease-out hover:shadow-elegant',
    highlight: 'stock-card shadow-glow border-primary/20 hover:shadow-glow hover:border-primary/40',
    danger: 'stock-card shadow-danger border-destructive/20 hover:shadow-danger hover:border-destructive/40',
    success: 'stock-card shadow-success border-success/20 hover:shadow-success hover:border-success/40'
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
};