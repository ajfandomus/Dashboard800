import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';

import AppLayout from '@/components/layout/AppLayout';
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

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/delivery" element={<Delivery />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/ai-ask" element={<AIAsk />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/all-orders" element={<AllOrders />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
