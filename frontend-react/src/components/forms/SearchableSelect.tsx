import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { FiChevronDown, FiX, FiSearch } from 'react-icons/fi';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

/**
 * Searchable select component with dropdown functionality
 * Features:
 * - Search/filter functionality
 * - Keyboard navigation
 * - Clearable selection
 * - Error states
 * - Size variants
 * - Dark mode support
 */
export const SearchableSelect = forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      searchPlaceholder = 'Search...',
      error = false,
      disabled = false,
      clearable = false,
      size = 'md',
      fullWidth = false,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    const sizeClasses = {
      sm: 'h-8 px-2 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(option => option.value === value);

      // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

    // Focus search input when opening
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    const handleToggle = () => {
      if (disabled) return;
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    const handleSelect = (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onChange) {
        onChange('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value);
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
      }
    };

    return (
      <div
        ref={ref}
        className={cn('relative', fullWidth && 'w-full', className)}
      >
        {/* Trigger */}
        <div
          ref={containerRef}
          className={cn(
            'relative cursor-pointer rounded-md border border-border bg-background',
            'focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
            'transition-colors duration-200',
            sizeClasses[size],
            fullWidth && 'w-full',
            disabled && 'cursor-not-allowed opacity-50',
            error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500',
            'flex items-center justify-between'
          )}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
        >
          <span className={cn(
            'block truncate',
            selectedOption ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center">
            {clearable && selectedOption && (
              <button
                type="button"
                className="mr-2 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
            <FiChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Options */}
            <div
              ref={optionsRef}
              className="max-h-60 overflow-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none',
                      index === focusedIndex && 'bg-muted',
                      value === option.value && 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';

export default SearchableSelect;
