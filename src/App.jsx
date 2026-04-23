import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Inbox from '@/pages/Inbox';
import ProposalEngine from '@/pages/ProposalEngine';
import ClientSign from '@/pages/ClientSign';
import Landing from '@/pages/Landing';
import ClientRegistration from '@/pages/ClientRegistration';
import AdvisorLogin from '@/pages/AdvisorLogin';
import AdvisorDashboard from '@/pages/AdvisorDashboard';
import CreateProposal from '@/pages/CreateProposal';
import ProposalDetail from '@/pages/ProposalDetail';
import AddEditInvestment from '@/pages/AddEditInvestment';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/client-registration" element={<ClientRegistration />} />
      <Route path="/advisor-login" element={<AdvisorLogin />} />
      <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
      <Route path="/create-proposal" element={<CreateProposal />} />
      <Route path="/proposal/:id" element={<ProposalDetail />} />
      <Route path="/proposal/:id/add-investment" element={<AddEditInvestment />} />
      <Route path="/proposal/:id/investment/:investmentId" element={<AddEditInvestment />} />
      <Route path="/proposal/:id/engine" element={<ProposalEngine />} />
      <Route path="/sign" element={<ClientSign />} />
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
  )
}

export default App