import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { handleGoogleRedirect } from './lib/googleAuth';
import Nav from './components/Nav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Scans from './pages/Scans';
import ScanDetail from './pages/ScanDetail';
import Findings from './pages/Findings';

// Handles the Google sign-in redirect fallback (popup → ?google_id_token=...).
handleGoogleRedirect();

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollManager />
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<AuthPage />} />

              {/* Protected console routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scans"
                element={
                  <ProtectedRoute>
                    <Scans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scans/:id"
                element={
                  <ProtectedRoute>
                    <ScanDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/findings"
                element={
                  <ProtectedRoute>
                    <Findings />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
