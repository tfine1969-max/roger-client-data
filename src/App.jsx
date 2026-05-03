import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Toaster } from 'sonner';

// Pages
import Landing from '@/pages/Landing';
import AdvisorLogin from '@/pages/AdvisorLogin';
import ClientRegistration from '@/pages/ClientRegistration';
import ClientOTP from '@/pages/ClientOTP';
import ClientLogin from '@/pages/ClientLogin';
import ClientOnboarding from '@/pages/ClientOnboarding';
import ClientOnboardingConfirmation from '@/pages/ClientOnboardingConfirmation';
import ClientOnboardingTrust from '@/pages/ClientOnboardingTrust';
import ClientOnboardingCompany from '@/pages/ClientOnboardingCompany';
import Inbox from '@/pages/Inbox';
import CreateProposal from '@/pages/CreateProposal';
import ProposalDetail from '@/pages/ProposalDetail';
import AddEditInvestment from '@/pages/AddEditInvestment';
import InvestmentForm from '@/pages/InvestmentForm';
import AddEditRiskProduct from '@/pages/AddEditRiskProduct';
import ProposalEngine from '@/pages/ProposalEngine';
import ClientSign from '@/pages/ClientSign';
import ClientDashboard from '@/pages/ClientDashboard';
import SignProposal from '@/pages/SignProposal';
import ProjectTracker from '@/pages/ProjectTracker';
import ComplianceReview from '@/pages/ComplianceReview';
import ComplianceClientReview from '@/pages/ComplianceClientReview';

// Protected route wrapper for advisor-only pages
const ProtectedAdvisorRoute = ({ element }) => {
  const { isAuthenticated, userType, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || userType !== 'advisor') {
    return <Navigate to="/" replace />;
  }

  return element;
};

// Protected route wrapper for pre-auth client onboarding flow
// No authentication required—checks only for pending client context
const ProtectedClientInitRoute = ({ element }) => {
  const hasPendingFlow = !!sessionStorage.getItem('pending_client_id');

  if (!hasPendingFlow) {
    return <Navigate to="/client-registration" replace />;
  }

  return element;
};

// Protected route wrapper for fully authenticated client pages
const ProtectedClientRoute = ({ element }) => {
  const { isAuthenticated, userType, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || userType !== 'client') {
    return <Navigate to="/" replace />;
  }

  return element;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/advisor-login" element={<AdvisorLogin />} />
      <Route path="/sign" element={<ClientSign />} />
      <Route path="/sign-proposal/:proposalId" element={<SignProposal />} />

      <Route path="/client-registration" element={<ClientRegistration />} />
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client-otp" element={<ProtectedClientInitRoute element={<ClientOTP />} />} />
      <Route path="/client-onboarding" element={<ProtectedClientInitRoute element={<ClientOnboarding />} />} />
      <Route path="/client-onboarding-trust" element={<ProtectedClientInitRoute element={<ClientOnboardingTrust />} />} />
      <Route path="/client-onboarding-company" element={<ProtectedClientInitRoute element={<ClientOnboardingCompany />} />} />
      <Route path="/client-confirmation" element={<ProtectedClientInitRoute element={<ClientOnboardingConfirmation />} />} />
      <Route path="/client-dashboard" element={<ProtectedClientInitRoute element={<ClientDashboard />} />} />

      <Route path="/proposals" element={<ProtectedAdvisorRoute element={<Inbox />} />} />
      <Route path="/create-proposal" element={<ProtectedAdvisorRoute element={<CreateProposal />} />} />
      <Route path="/proposal/:id" element={<ProtectedAdvisorRoute element={<ProposalDetail />} />} />
      <Route path="/proposal/:id/add-investment" element={<ProtectedAdvisorRoute element={<InvestmentForm />} />} />
      <Route path="/proposal/:id/investment/:investmentId" element={<ProtectedAdvisorRoute element={<InvestmentForm />} />} />
      <Route path="/proposal/:id/add-risk-product" element={<ProtectedAdvisorRoute element={<AddEditRiskProduct />} />} />
      <Route path="/proposal/:id/risk-product/:riskProductId" element={<ProtectedAdvisorRoute element={<AddEditRiskProduct />} />} />
      <Route path="/proposal/:id/engine" element={<ProtectedAdvisorRoute element={<ProposalEngine />} />} />
      <Route path="/project-tracker" element={<ProjectTracker />} />
      <Route path="/compliance-review" element={<ProtectedAdvisorRoute element={<ComplianceReview />} />} />
      <Route path="/compliance-review/:clientId" element={<ProtectedAdvisorRoute element={<ComplianceClientReview />} />} />

      <Route path="/advisor-dashboard" element={<Navigate to="/proposals" replace />} />

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