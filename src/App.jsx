import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Upload from '@/pages/Upload';
import Platforms from '@/pages/Platforms';
import DataQuality from '@/pages/DataQuality';
import Fees from '@/pages/Fees';
import Funds from '@/pages/Funds';
import BulkFees from '@/pages/BulkFees';
import PrimeProvider from '@/pages/PrimeProvider';
import Control from '@/pages/Control';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:accountCode" element={<ClientDetail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/platforms" element={<Platforms />} />
        <Route path="/funds" element={<Funds />} />
        <Route path="/data-quality" element={<DataQuality />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/bulk-fees" element={<BulkFees />} />
        <Route path="/control" element={<Control />} />
        <Route path="/providers/prime" element={<PrimeProvider />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
