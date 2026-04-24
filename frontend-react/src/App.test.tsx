import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
    Route: ({ element }: { element?: React.ReactNode }) => <>{element}</>,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  }),
  { virtual: true },
);

jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('./services/api', () => ({
  authAPI: {
    login: jest.fn(),
    refreshToken: jest.fn(),
    register: jest.fn(),
  },
  updateBaseUrl: jest.fn(),
}));

jest.mock('./utils/api-test', () => ({
  testApiConfiguration: jest.fn(),
}));

jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Register', () => () => <div>Register Page</div>);
jest.mock('./pages/Verify', () => () => <div>Verify Page</div>);
jest.mock('./pages/ForgotPassword', () => () => <div>Forgot Password Page</div>);
jest.mock('./pages/ResetPassword', () => () => <div>Reset Password Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('./pages/Devices', () => () => <div>Devices Page</div>);
jest.mock('./pages/DeviceDetail', () => () => <div>Device Detail Page</div>);
jest.mock('./pages/BulkSchedulePage', () => () => <div>Bulk Schedule Page</div>);
jest.mock('./components/ProtectedRoute', () => () => <div>Protected Route</div>);

test('renders application shell routes', () => {
  render(<App />);

  expect(screen.getByTestId('router')).toBeInTheDocument();
  expect(screen.getByTestId('routes')).toBeInTheDocument();
  expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  expect(screen.getByText('Login Page')).toBeInTheDocument();
});
