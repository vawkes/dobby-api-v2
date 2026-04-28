import React from 'react';
import { render, waitFor } from '@testing-library/react';
import LoginPage from './Login.tsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: jest.fn(),
}), { virtual: true });

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseNavigate = useNavigate as jest.Mock;

beforeEach(() => {
  mockedUseAuth.mockReset();
  mockedUseNavigate.mockReset();
});

test('redirects authenticated users away from login', async () => {
  const navigate = jest.fn();
  mockedUseNavigate.mockReturnValue(navigate);
  mockedUseAuth.mockReturnValue({
    user: { email: 'user@example.com', name: '' },
    token: 'Bearer token',
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshTokenIfNeeded: jest.fn(),
  });

  render(<LoginPage />);

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
});
