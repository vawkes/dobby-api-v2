import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveNavigation } from './ResponsiveNavigation';

jest.mock(
    'react-router-dom',
    () => ({
        NavLink: ({ children, to, className }: { children: React.ReactNode; to: string; className?: unknown }) => (
            <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>
                {children}
            </a>
        ),
        useLocation: () => ({ pathname: '/dashboard' }),
    }),
    { virtual: true }
);

jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        logout: jest.fn(),
        user: {
            email: 'operator@example.com',
            name: 'Operator',
            companyName: 'Acme Grid Ops',
        },
    }),
}));

beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));
});

afterEach(() => {
    jest.restoreAllMocks();
});

test('shows the active company name in desktop navigation', async () => {
    render(<ResponsiveNavigation />);

    expect(screen.getByText('Acme Grid Ops')).toBeInTheDocument();
});
