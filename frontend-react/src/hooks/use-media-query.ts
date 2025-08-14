import { useState, useEffect } from 'react';

/**
 * Hook to detect media query matches for responsive design
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        // Set initial value
        setMatches(media.matches);

        // Create listener
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Add listener
        if (media.addEventListener) {
            media.addEventListener('change', listener);
        } else {
            // Fallback for older browsers
            media.addListener(listener);
        }

        // Cleanup
        return () => {
            if (media.removeEventListener) {
                media.removeEventListener('change', listener);
            } else {
                // Fallback for older browsers
                media.removeListener(listener);
            }
        };
    }, [query]);

    return matches;
}

/**
 * Hook to get current breakpoint based on Tailwind CSS breakpoints
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState<string>('md');

    useEffect(() => {
        const updateBreakpoint = () => {
            const width = window.innerWidth;

            if (width < 475) {
                setBreakpoint('xs');
            } else if (width < 640) {
                setBreakpoint('sm');
            } else if (width < 768) {
                setBreakpoint('md');
            } else if (width < 1024) {
                setBreakpoint('lg');
            } else if (width < 1280) {
                setBreakpoint('xl');
            } else {
                setBreakpoint('2xl');
            }
        };

        // Set initial breakpoint
        updateBreakpoint();

        // Add resize listener
        window.addEventListener('resize', updateBreakpoint);

        // Cleanup
        return () => window.removeEventListener('resize', updateBreakpoint);
    }, []);

    return breakpoint;
}

/**
 * Hook to detect if the device supports touch
 * 
 * @example
 * const isTouchDevice = useTouch();
 */
export function useTouch() {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-ignore - for older browsers
                navigator.msMaxTouchPoints > 0
            );
        };

        checkTouch();

        // Some devices may not report touch support until after load
        window.addEventListener('touchstart', checkTouch, { once: true });

        return () => {
            window.removeEventListener('touchstart', checkTouch);
        };
    }, []);

    return isTouchDevice;
}
