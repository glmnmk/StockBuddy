import React from 'react';
import { getGlossaryDefinition } from '@/lib/glossary';
import { GlossaryTooltip } from '@/components/ui/glossary-tooltip';

interface MetricLabelProps {
  metricId: string;
  fallbackLabel?: string;
  className?: string;
  iconSize?: 'sm' | 'md';
}

export const MetricLabel: React.FC<MetricLabelProps> = ({ 
  metricId, 
  fallbackLabel,
  className = '',
  iconSize = 'sm'
}) => {
  const def = getGlossaryDefinition(metricId);

  // If definition exists, show the label and the info icon
  if (def) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span>{def.term}</span>
        <GlossaryTooltip 
          term={def.term} 
          definition={def.definition}
          category={def.category}
          example={def.example}
          size={iconSize}
        />
      </div>
    );
  }

  // Fallback if no definition is found
  return (
    <span className={className}>{fallbackLabel || metricId}</span>
  );
};
