import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProposalHeader from '@/components/proposal/ProposalHeader';
import InvestmentsList from '@/components/proposal/InvestmentsList';
import RiskProductsList from '@/components/proposal/RiskProductsList';
import AttachmentsSection from '@/components/proposal/AttachmentsSection';
import PdfSection from '@/components/proposal/PdfSection';
import SignatureSection from '@/components/proposal/SignatureSection';
import ProposalSidePanel from '@/components/proposal/ProposalSidePanel';

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
  const { data: riskProductsRaw = [] } = useQuery({
    queryKey: ['riskProducts', id],
    queryFn: () => base44.entities.RiskProducts.filter({ proposal_id: id }),
    enabled: !!id,
  });

  // Fetch all risk covers for all risk products
  const { data: allRiskCovers = [] } = useQuery({
    queryKey: ['allRiskCovers', id],
    queryFn: async () => {
      const products = await base44.entities.RiskProducts.filter({ proposal_id: id });
      if (!products.length) return [];
      const coversArrays = await Promise.all(
        products.map(p => base44.entities.RiskCovers.filter({ risk_product_id: p.id }))
      );
      return coversArrays.flat();
    },
    enabled: !!id,
  });

  // Enrich riskProducts with their covers and total_premium
  const riskProducts = riskProductsRaw.map(rp => {
    const covers = allRiskCovers.filter(c => c.risk_product_id === rp.id);
    const total_premium = covers.reduce((s, c) => s + (parseFloat(c.premium) || 0), 0);
    return { ...rp, _covers: covers, total_premium };
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
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => navigate('/proposals')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1 min-w-0">
          <ProposalHeader
            proposal={proposal}
            client={client}
            onUpdate={handleFieldChange}
            isSaving={isSaving}
          />
        </div>
      </div>

      <div className="flex gap-4 max-w-screen-2xl mx-auto p-4">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Investments + Risk Products side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Investments</h2>
                <Button
                  onClick={() => navigate(`/proposal/${id}/add-investment`)}
                  className="flex items-center gap-1 bg-ocean hover:bg-sky text-white px-3 py-1.5 rounded-sm text-xs font-medium h-7"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <InvestmentsList investments={investments} proposalId={id} />
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Risk Products</h2>
                <Button
                  onClick={() => navigate(`/proposal/${id}/add-risk-product`)}
                  className="flex items-center gap-1 bg-teal hover:bg-teal/90 text-white px-3 py-1.5 rounded-sm text-xs font-medium h-7"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <RiskProductsList riskProducts={riskProducts} proposalId={id} />
            </div>
          </div>

          {/* Bottom sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AttachmentsSection attachments={attachments} proposalId={id} />
            <PdfSection proposal={proposal} proposalId={id} />
            <SignatureSection proposal={proposal} proposalId={id} />
          </div>
        </div>

        {/* Right side panel */}
        <ProposalSidePanel
          client={client}
          investments={investments}
          riskProducts={riskProducts}
          proposal={proposal}
          proposalId={id}
        />
      </div>
    </div>
  );
}