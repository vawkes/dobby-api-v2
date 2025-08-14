import React from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/use-theme';

/**
 * Custom tooltip component for charts with consistent styling
 * 
 * Features:
 * - Theme-aware styling
 * - Multi-value support
 * - Unit formatting
 * - Timestamp formatting
 * - Mobile-optimized sizing
 */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: any;
    name: string;
    color: string;
    dataKey: string;
    unit?: string;
  }>;
  label?: any;
  labelFormatter?: (label: any) => string;
  valueFormatter?: (value: any, name: string) => string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}) => {
  const { effectiveTheme } = useTheme();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Format the label (usually timestamp)
  const formattedLabel = labelFormatter 
    ? labelFormatter(label)
    : formatDefaultLabel(label);

  return (
    <Card 
      className={cn(
        'border shadow-lg p-3 min-w-[200px]',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95',
        effectiveTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'
      )}
      padding="none"
    >
      {/* Tooltip Header */}
      {formattedLabel && (
        <div className="text-sm font-medium text-foreground mb-2 pb-2 border-b border-border">
          {formattedLabel}
        </div>
      )}
      
      {/* Tooltip Items */}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const formattedValue = valueFormatter 
            ? valueFormatter(item.value, item.name)
            : formatDefaultValue(item.value, item.unit);
          
          return (
            <div 
              key={`${item.dataKey}-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Color indicator */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                
                {/* Series name */}
                <span className="text-sm text-foreground truncate">
                  {item.name}
                </span>
              </div>
              
              {/* Value */}
              <span className="text-sm font-medium text-foreground flex-shrink-0">
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/**
 * Default label formatter for timestamps
 */
function formatDefaultLabel(label: any): string {
  if (typeof label === 'number') {
    // Assume it's a timestamp
    const date = new Date(label);
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      return String(label);
    }
    
    // Format based on time difference from now
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Within last 24 hours - show time
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 24 * 7) {
      // Within last week - show day and time
      return date.toLocaleString(undefined, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      // Older - show full date and time
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  
  if (typeof label === 'string') {
    // Try to parse as date
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      return formatDefaultLabel(date.getTime());
    }
  }
  
  return String(label);
}

/**
 * Default value formatter with units
 */
function formatDefaultValue(value: any, unit?: string): string {
  if (typeof value === 'number') {
    // Format numbers with appropriate precision
    let formatted: string;
    
    if (Math.abs(value) >= 1000000) {
      formatted = (value / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1000) {
      formatted = (value / 1000).toFixed(1) + 'K';
    } else if (value % 1 === 0) {
      formatted = value.toString();
    } else {
      formatted = value.toFixed(2);
    }
    
    return unit ? `${formatted} ${unit}` : formatted;
  }
  
  return String(value);
}

/**
 * Minimal tooltip for simple charts
 */
interface SimpleTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: any;
    name: string;
    color: string;
  }>;
  label?: any;
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  const { effectiveTheme } = useTheme();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-md shadow-lg text-sm',
        'bg-background/95 border border-border',
        effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'
      )}
    >
      <div className="font-medium">
        {item.value} {label && `at ${formatDefaultLabel(label)}`}
      </div>
    </div>
  );
};

export default ChartTooltip;
