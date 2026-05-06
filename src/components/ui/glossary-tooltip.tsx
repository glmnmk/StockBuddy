import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GlossaryTooltipProps {
  term: string;
  definition: string;
  category?: 'valuation' | 'fundamentals' | 'market' | 'ratios' | 'general';
  example?: string;
  size?: 'sm' | 'md';
}

const categoryColors = {
  valuation: 'bg-primary/10 text-primary border-primary/20',
  fundamentals: 'bg-success/10 text-success border-success/20',
  market: 'bg-warning/10 text-warning border-warning/20',
  ratios: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  general: 'bg-muted text-muted-foreground border-border'
};

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({
  term,
  definition,
  category = 'general',
  example,
  size = 'sm'
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size={size === 'sm' ? 'sm' : 'default'}
          className={`p-1 h-auto ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} rounded-full hover:bg-primary/20`}
        >
          <Info className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground hover:text-primary`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="top" align="center">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-base">{term}</h4>
            {category && (
              <Badge 
                className={categoryColors[category]}
                variant="outline"
              >
                {category}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {definition}
          </p>
          
          {example && (
            <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary">
              <p className="text-xs">
                <span className="font-semibold text-primary">Example:</span>{' '}
                {example}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};