import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  showCharCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
}

/**
 * Enhanced textarea component with auto-resize and character counting
 * Features:
 * - Auto-resize functionality
 * - Character count display
 * - Error states
 * - Resize control
 * - Consistent styling with other inputs
 * - Dark mode support
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      error = false,
      resize = 'vertical',
      autoResize = false,
      minRows = 3,
      maxRows = 8,
      showCharCount = false,
      maxLength,
      fullWidth = false,
      className,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Merge refs
    const mergedRef = React.useCallback(
      (element: HTMLTextAreaElement) => {
        textareaRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Calculate the number of rows based on content
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const scrollHeight = textarea.scrollHeight;

      // Set height within min/max bounds
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [autoResize, minRows, maxRows]);

    // Handle change events
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      setCharCount(newValue.length);
      adjustHeight();
      
      if (onChange) {
        onChange(event);
      }
    };

    // Initial setup and value changes
    useEffect(() => {
      if (value !== undefined) {
        setCharCount(value.toString().length);
        adjustHeight();
      }
    }, [value, adjustHeight]);

    // Setup initial height
    useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const showCount = showCharCount || maxLength;
    const isOverLimit = maxLength && charCount > maxLength;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        <textarea
          ref={mergedRef}
          maxLength={maxLength}
          className={cn(
            // Base styles
            'w-full rounded-md border border-border bg-background text-foreground',
            'px-3 py-2 text-sm placeholder:text-muted-foreground',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            // Resize control
            resizeClasses[resize],
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            // Auto-resize styles
            autoResize && 'overflow-hidden',
            className
          )}
          style={{
            minHeight: autoResize ? `${20 * minRows}px` : undefined,
          }}
          onChange={handleChange}
          value={value}
          {...props}
        />

        {/* Character count */}
        {showCount && (
          <div className="absolute bottom-2 right-2 pointer-events-none">
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm',
                isOverLimit ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              {maxLength ? `${charCount}/${maxLength}` : charCount}
            </span>
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
