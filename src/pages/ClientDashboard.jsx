import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusColors = {
  'Draft': 'bg-slate-100 text-slate-700',
  'Modified': 'bg-blue-100 text-blue-700',
  'PDF Generated': 'bg-green-100 text-green-700',
  'Sent': 'bg-purple-100 text-purple-700',
  'Completed': 'bg-emerald-100 text-emerald-700'
};

const statusIcons = {
  'Draft': <Clock className="w-4 h-4" />,
  'Modified': <FileText className="w-4 h-4" />,
  'PDF Generated': <FileText className="w-4 h-4" />,
  'Sent': <FileText className="w-4 h-4" />,
  'Completed': <CheckCircle2 className="w-4 h-4" />
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState('');

  // Get client from session
  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) {
      navigate('/client-registration', { replace: true });
      return;
    }
    setClientId(id);

    // Fetch client data for display
    base44.entities.Clients.filter({ id }).then(clients => {
      if (clients.length > 0) {
        const client = clients[0];
        setClientName(client.full_name || client.entity_name || 'Client');
      }
    }).catch(() => {});
  }, [navigate]);

  // Fetch proposals for this client
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['client-proposals', clientId],
    queryFn: () => clientId ? base44.entities.Proposals.filter({ client_id: clientId }) : [],
    enabled: !!clientId
  });

  const handleLogout = () => {
    sessionStorage.removeItem('pending_client_id');
    sessionStorage.removeItem('pending_client_email');
    toast.success('Logged out successfully');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-navy">My Proposals</h1>
            <p className="text-muted-foreground text-sm">Welcome, {clientName}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-navy rounded-full animate-spin"></div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No proposals yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {proposals.map(proposal => (
              <button
                key={proposal.id}
                onClick={() => navigate(`/sign?proposal=${proposal.id}`)}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all hover:border-ocean text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy text-lg mb-2">
                      {proposal.reference}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Advisor: <strong>{proposal.advisor_name}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Risk Profile: <strong>{proposal.risk_profile}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Time Horizon: <strong>{proposal.time_horizon}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[proposal.proposal_status] || 'bg-slate-100'}`}>
                      {statusIcons[proposal.proposal_status]}
                      {proposal.proposal_status}
                    </div>
                    <Button
                      variant="ghost"
                      className="text-ocean hover:text-ocean"
                    >
                      View →
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}