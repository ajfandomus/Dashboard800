import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';

import Dashboard from '@/pages/Dashboard';
import Orders from '@/pages/Orders';
import Products from '@/pages/Products';
import Customers from '@/pages/Customers';
import Finance from '@/pages/Finance';
import Invoices from '@/pages/Invoices';
import Delivery from '@/pages/Delivery';
import Summary from '@/pages/Summary';
import AIAsk from '@/pages/AIAsk';
import Settings from '@/pages/Settings';
import AllOrders from '@/pages/AllOrders';

function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/all-orders" element={<AllOrders />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/ai-ask" element={<AIAsk />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;