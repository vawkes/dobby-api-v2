import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import VerifyPage from './pages/Verify';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import BulkSchedulePage from './pages/BulkSchedulePage';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Context
import { AuthProvider } from './context/AuthContext';

// Utils
import { getApiUrl } from './utils/config';
import { updateBaseUrl } from './services/api';
import { testApiConfiguration } from './utils/api-test';

function App() {
  // Initialize configuration on app start
  useEffect(() => {
    const initApp = async () => {
      try {
        // Test API configuration first
        testApiConfiguration();

        // Update API base URL with the current configuration
        updateBaseUrl();

        // Test again after configuration is loaded
        console.log('🔧 Final API configuration test:');
        testApiConfiguration();
      } catch (error) {
        console.error('Failed to load app configuration:', error);
      }
    };

    initApp();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/devices/:deviceId" element={<DeviceDetail />} />
            <Route path="/bulk-schedule" element={<BulkSchedulePage />} />
            {/* Add more protected routes here */}
          </Route>

          {/* Redirect to dashboard if authenticated, otherwise to login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
