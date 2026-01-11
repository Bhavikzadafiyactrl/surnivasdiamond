import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SessionHandler from './components/SessionHandler';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import LandingPage from './components/LandingPage'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import DiamondSearch from './pages/DiamondSearch'
import HoldDiamonds from './pages/HoldDiamonds'
import Basket from './pages/Basket'
import Contact from './pages/Contact'
import Auth from './pages/Auth'
import AdminMessages from './pages/admin/AdminMessages'
import AdminHoldRequests from './pages/admin/AdminHoldRequests'
import AdminOrders from './pages/admin/AdminOrders'
import AllOrderAdmin from './pages/admin/AllOrderAdmin';
import ManageDiamondList from './pages/admin/ManageDiamondList';
import ManageRegistrations from './pages/admin/ManageRegistrations'
import DashboardManagement from './pages/admin/DashboardManagement'
import Confirmation from './pages/Confirmation';
import OrderHistory from './pages/OrderHistory';
import { LanguageProvider } from './contexts/LanguageContext';
import { SocketProvider } from './contexts/SocketContext';
import './animations.css'

import { AuthProvider } from './contexts/AuthContext';

const App = () => {
  const [accessAllowed, setAccessAllowed] = useState(null); // null = loading

  useEffect(() => {
    // Check URL for bypass key (e.g. ?bypass=diamond_admin_vip)
    const params = new URLSearchParams(window.location.search);
    const bypassKey = params.get('bypass');
    
    // Check if we are allowed to access via backend
    // If bypass key exists, append it to the check URL
    // Use VITE_API_URL but strip '/api' to get the root backend URL
    const backendRoot = import.meta.env.VITE_API_URL.replace('/api', '');
    const checkUrl = bypassKey ? `${backendRoot}/?bypass=${bypassKey}` : `${backendRoot}/`;

    fetch(checkUrl, { credentials: 'include' }) // Important: include credentials for cookie setting
      .then(res => {
        if (res.status === 403) {
            setAccessAllowed(false);
        } else {
            setAccessAllowed(true);
        }
      })
      .catch(() => setAccessAllowed(true)); // Allow on network error (or handle differently)
  }, []);

  if (!accessAllowed) {
      return null; // Show nothing (Blank) while loading (null) OR if blocked (false)
  }

  return (
    <LanguageProvider>
      <SocketProvider>
        <AuthProvider>
          <Router>
            <SessionHandler />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes */}
              <Route path="/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
              <Route path="/order-history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/diamonds" element={<ProtectedRoute><DiamondSearch /></ProtectedRoute>} />
              <Route path="/held-diamonds" element={<ProtectedRoute><HoldDiamonds /></ProtectedRoute>} />
              <Route path="/basket" element={<ProtectedRoute><Basket /></ProtectedRoute>} />
              
              <Route path="/admin/messages" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
              <Route path="/admin/dashboard-management" element={<ProtectedRoute><DashboardManagement /></ProtectedRoute>} />
              <Route path="/admin/hold-requests" element={<ProtectedRoute><AdminHoldRequests /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/all-orders" element={<ProtectedRoute><AllOrderAdmin /></ProtectedRoute>} />
              <Route path="/admin/diamond-list" element={<ProtectedRoute><ManageDiamondList /></ProtectedRoute>} />
              <Route path="/admin/registrations" element={<ProtectedRoute><ManageRegistrations /></ProtectedRoute>} />
            </Routes>
          </Router>
        </AuthProvider>
      </SocketProvider>
    </LanguageProvider>
  )
}

export default App
