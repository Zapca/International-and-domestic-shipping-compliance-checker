import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ComplianceChecker from './pages/ComplianceChecker';
import RuleManager from './pages/RuleManager';

// Auth Components
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E5077', // Deep blue - professional and trustworthy
    },
    secondary: {
      main: '#BBE2F0', // Teal - modern and fresh
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#546e7a',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/signup" element={<Layout><SignUp /></Layout>} />
            <Route path="/compliance-checker" element={<Layout><ComplianceChecker /></Layout>} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rule-manager" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <RuleManager />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            {/* Add more routes as needed */}
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
