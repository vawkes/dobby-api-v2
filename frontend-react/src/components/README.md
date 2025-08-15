# UI Components

This directory contains reusable UI components following consistent design patterns and TypeScript interfaces.

## Design Principles

1. **Consistent API**: All components follow standardized prop interfaces from `types/component-props.ts`
2. **Type Safety**: Comprehensive TypeScript support with proper interfaces
3. **Accessibility**: Components include ARIA attributes and keyboard navigation
4. **Responsive**: Mobile-first design with touch-friendly interactions
5. **Performance**: Optimized for fast rendering and minimal bundle size

## Component Standards

### Props Structure
All components should extend from base interfaces:
- `BaseComponentProps` - className, children, data-testid
- `VariantProps` - variant, size for visual variations  
- `LoadingState` - loading states for async operations
- `InteractiveProps` - disabled, onClick for interactive elements

### Documentation
Each component includes:
- JSDoc comments with usage examples
- TypeScript interface documentation
- Accessibility notes
- Mobile considerations

## Usage Patterns

### Button Component
```tsx
import { Button } from './ui/Button';

// Basic usage
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

// Loading state
<Button loading loadingText="Saving...">
  Save Changes
</Button>

// Full width on mobile
<Button fullWidth>
  Submit Form
</Button>
```

### Input Component  
```tsx
import { Input } from './ui/Input';

// With label and validation
<Input
  label="Email Address"
  type="email"
  error={errors.email?.message}
  icon={<MailIcon />}
  {...register('email')}
/>
```

### Card Component
```tsx
import { Card } from './ui/Card';

// Interactive card
<Card interactive onClick={handleClick}>
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>

// Loading state
<Card loading>
  <SkeletonLoader />
</Card>
```

## Development Guidelines

### Creating New Components

1. **Use the component generator** (when available):
   ```bash
   npm run generate:component ComponentName
   ```

2. **Follow the template structure**:
   ```tsx
   /**
    * Component description and usage examples
    */
   interface ComponentProps extends BaseComponentProps {
     // Component-specific props
   }

   export const Component = forwardRef<HTMLElement, ComponentProps>(
     ({ className, children, ...props }, ref) => {
       return (
         <div ref={ref} className={cn(variants(), className)} {...props}>
           {children}
         </div>
       );
     }
   );

   Component.displayName = 'Component';
   ```

3. **Include comprehensive types**:
   - Extend from standard base interfaces
   - Use CVA variants for styling
   - Export prop types for external usage

4. **Add JSDoc documentation**:
   - Component purpose and behavior
   - Usage examples for common patterns
   - Accessibility considerations
   - Mobile-specific notes

### Testing Components

Use React Testing Library for component tests:
```tsx
import { render, screen, userEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct variant styles', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
  });

  it('handles loading state correctly', async () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Mobile Considerations

### Touch Targets
- Minimum 44px touch targets for interactive elements
- Adequate spacing between clickable items
- Visual feedback for touch interactions

### Responsive Breakpoints
```scss
// Tailwind CSS breakpoints used throughout
xs: 475px   // Extra small devices
sm: 640px   // Small devices
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (desktops)
xl: 1280px  // Extra large devices
2xl: 1536px // 2X Extra large devices
```

### Media Query Hooks
Use provided hooks for responsive behavior:
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');
const breakpoint = useBreakpoint();
const isTouchDevice = useTouch();
```

## Performance Best Practices

1. **Use React.forwardRef** for ref forwarding
2. **Implement proper memoization** for expensive calculations
3. **Lazy load heavy components** when appropriate
4. **Minimize bundle impact** by avoiding large dependencies
5. **Use CSS-in-JS sparingly** - prefer Tailwind classes

## Accessibility Standards

- Include proper ARIA labels and roles
- Ensure keyboard navigation works correctly
- Maintain proper color contrast ratios
- Support screen readers with descriptive text
- Test with accessibility tools regularly
