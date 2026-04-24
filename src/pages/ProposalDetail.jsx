import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProposalHeader from '@/components/proposal/ProposalHeader';
import FinancialProfile from '@/components/proposal/FinancialProfile';
import InvestmentsList from '@/components/proposal/InvestmentsList';
import RiskProductsList from '@/components/proposal/RiskProductsList';
import AttachmentsSection from '@/components/proposal/AttachmentsSection';
import PdfSection from '@/components/proposal/PdfSection';
import SignatureSection from '@/components/proposal/SignatureSection';

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch proposal — try Proposal (onboarding) entity first, fall back to Proposals (advisor) entity
  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const list = await base44.entities.Proposal.list();
      const found = list.find(p => p.id === id);
      if (found) return { ...found, _entity: 'Proposal' };
      const list2 = await base44.entities.Proposals.list();
      const found2 = list2.find(p => p.id === id);
      return found2 ? { ...found2, _entity: 'Proposals' } : null;
    },
    enabled: !!id,
  });

  // Fetch client details
  const { data: client } = useQuery({
    queryKey: ['client', proposal?.client_id],
    queryFn: async () => {
      if (!proposal?.client_id) return null;
      const list = await base44.entities.Clients.list();
      return list.find(c => c.id === proposal.client_id) || null;
    },
    enabled: !!proposal?.client_id,
  });

  // Fetch investments
  const { data: investments = [] } = useQuery({
    queryKey: ['investments', id],
    queryFn: () => base44.entities.Investments.filter({ proposal_id: id }),
    enabled: !!id,
  });

  // Fetch risk products
  const { data: riskProducts = [] } = useQuery({
    queryKey: ['riskProducts', id],
    queryFn: () => base44.entities.RiskProducts.filter({ proposal_id: id }),
    enabled: !!id,
  });

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => base44.entities.Attachments.filter({ proposal_id: id }),
    enabled: !!id,
  });

  const updateProposalMutation = useMutation({
    mutationFn: (data) => proposal?._entity === 'Proposal'
      ? base44.entities.Proposal.update(id, data)
      : base44.entities.Proposals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    }
  });

  const handleFieldChange = async (field, value) => {
    setIsSaving(true);
    await updateProposalMutation.mutate({ [field]: value });
    setIsSaving(false);
  };

  if (isLoading || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate('/advisor-dashboard')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <ProposalHeader
          proposal={proposal}
          client={client}
          onUpdate={handleFieldChange}
          isSaving={isSaving}
        />

        {/* Financial Profile */}
        <FinancialProfile
          proposal={proposal}
          onUpdate={handleFieldChange}
        />

        {/* Investments Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">Investments</h2>
            <Button
              onClick={() => navigate(`/proposal/${id}/add-investment`)}
              className="flex items-center gap-2 bg-ocean hover:bg-sky text-white px-4 py-2 rounded-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Investment
            </Button>
          </div>
          <InvestmentsList investments={investments} proposalId={id} />
        </div>

        {/* Risk Products Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">Risk Products</h2>
            <Button
              onClick={() => navigate(`/proposal/${id}/add-risk-product`)}
              className="flex items-center gap-2 bg-teal hover:bg-teal/90 text-white px-4 py-2 rounded-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Risk Product
            </Button>
          </div>
          <RiskProductsList riskProducts={riskProducts} proposalId={id} />
        </div>

        {/* Attachments Section */}
        <AttachmentsSection attachments={attachments} proposalId={id} />

        {/* PDF Section */}
        <PdfSection proposal={proposal} proposalId={id} />

        {/* Signature Section */}
        <SignatureSection proposal={proposal} proposalId={id} />
      </div>
    </div>
  );
}