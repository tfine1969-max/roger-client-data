import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposals.list(),
  });

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-muted text-muted-foreground',
      'Modified': 'bg-yellow-100 text-yellow-700',
      'PDF Generated': 'bg-blue-100 text-blue-700',
      'Sent': 'bg-purple-100 text-purple-700',
      'Completed': 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">WealthWorks</h1>
            <p className="text-white/60 text-sm">Advisor Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm font-medium">{user?.full_name || 'Advisor'}</p>
              <p className="text-white/60 text-xs">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-navy mb-2">Proposals</h2>
            <p className="text-muted-foreground">Manage and create financial proposals</p>
          </div>
          <Button
            onClick={() => navigate('/create-proposal')}
            className="flex items-center gap-2 bg-navy hover:bg-ocean text-white px-6 py-3 rounded-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Proposal
          </Button>
        </div>

        {/* Proposals List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {proposals.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No proposals yet</p>
              <Button
                onClick={() => navigate('/create-proposal')}
                className="bg-navy hover:bg-ocean text-white px-6 py-2 rounded-sm font-medium"
              >
                Create your first proposal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">Reference</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">Advisor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">PDF</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-navy">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-navy">{proposal.reference}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.client_id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.advisor_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusColor(proposal.proposal_status)}`}>
                          {proposal.proposal_status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          proposal.pdf_status === 'Current'
                            ? 'bg-green-100 text-green-700'
                            : proposal.pdf_status === 'Outdated'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {proposal.pdf_status || 'No PDF'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/proposal/${proposal.id}`)}
                          className="text-navy hover:text-ocean font-medium text-sm transition-colors"
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}