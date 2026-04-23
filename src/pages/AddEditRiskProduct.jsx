import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RISK_PROVIDERS = ['PPS', 'Momentum', 'Discovery', 'Hollard', 'Brightrock'];
const COVER_TYPES = ['Life', 'Dread', 'Disability', 'Income'];

export default function AddEditRiskProduct() {
  const { id: proposalId, riskProductId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState('');
  const [riskCovers, setRiskCovers] = useState([]);
  const [editingCoverId, setEditingCoverId] = useState(null);
  const [newCover, setNewCover] = useState({
    cover_type: '',
    amount_required: '',
    premium: '',
    annual_premium_increase_percent: '',
    annual_cover_increase_percent: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing risk product if editing
  const { data: riskProduct } = useQuery({
    queryKey: ['riskProduct', riskProductId],
    queryFn: () => riskProductId ? base44.entities.RiskProducts.filter({ id: riskProductId }).then(data => data[0]) : null,
    enabled: !!riskProductId,
  });

  // Fetch related risk covers
  const { data: existingCovers = [] } = useQuery({
    queryKey: ['riskCovers', riskProductId],
    queryFn: () => riskProductId ? base44.entities.RiskCovers.filter({ risk_product_id: riskProductId }) : [],
    enabled: !!riskProductId,
  });

  // Populate form when editing
  useEffect(() => {
    if (riskProduct) {
      setProvider(riskProduct.provider || '');
      setRiskCovers(existingCovers);
    }
  }, [riskProduct, existingCovers]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let productId = riskProductId;
      
      // Create or update risk product
      if (!riskProductId) {
        const created = await base44.entities.RiskProducts.create({
          proposal_id: proposalId,
          provider: data.provider
        });
        productId = created.id;
      } else {
        await base44.entities.RiskProducts.update(riskProductId, {
          provider: data.provider
        });
      }

      // Save risk covers
      for (const cover of data.covers) {
        if (cover.id) {
          // Update existing
          await base44.entities.RiskCovers.update(cover.id, cover);
        } else {
          // Create new
          await base44.entities.RiskCovers.create({
            ...cover,
            risk_product_id: productId
          });
        }
      }

      return productId;
    },
    onSuccess: () => {
      navigate(`/proposal/${proposalId}`);
    }
  });

  const handleAddCover = () => {
    if (!newCover.cover_type || !newCover.premium) {
      alert('Please fill in cover type and premium');
      return;
    }

    setRiskCovers([
      ...riskCovers,
      {
        cover_type: newCover.cover_type,
        amount_required: parseFloat(newCover.amount_required) || 0,
        premium: parseFloat(newCover.premium) || 0,
        annual_premium_increase_percent: parseFloat(newCover.annual_premium_increase_percent) || 0,
        annual_cover_increase_percent: parseFloat(newCover.annual_cover_increase_percent) || 0
      }
    ]);

    setNewCover({
      cover_type: '',
      amount_required: '',
      premium: '',
      annual_premium_increase_percent: '',
      annual_cover_increase_percent: ''
    });
  };

  const handleRemoveCover = (index) => {
    setRiskCovers(riskCovers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!provider) {
      alert('Please select a provider');
      return;
    }

    if (riskCovers.length === 0) {
      alert('Please add at least one risk cover');
      return;
    }

    setIsSubmitting(true);
    await saveMutation.mutate({
      provider,
      covers: riskCovers
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate(`/proposal/${proposalId}`)}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to proposal
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-navy mb-2">
          {riskProductId ? 'Edit Risk Product' : 'Add Risk Product'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {riskProductId ? 'Update risk product and covers' : 'Create a new risk product with cover types'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Provider Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-navy mb-4">Risk Provider</h2>
            
            <div>
              <Label className="text-sm font-semibold text-navy mb-2 block">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_PROVIDERS.map(prov => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Risk Covers Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-navy mb-6">Risk Covers</h2>

            {/* Existing Covers */}
            {riskCovers.length > 0 && (
              <div className="space-y-4 mb-6">
                {riskCovers.map((cover, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-navy">{cover.cover_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          Premium: R{parseFloat(cover.premium).toLocaleString()} {cover.annual_premium_increase_percent ? `(+${cover.annual_premium_increase_percent}% p.a.)` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCover(index)}
                        className="p-2 text-destructive hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {cover.amount_required > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Sum Assured: R{parseFloat(cover.amount_required).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Cover */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-bold text-navy mb-4">Add Risk Cover</h3>
              
              <div className="space-y-4">
                {/* Cover Type */}
                <div>
                  <Label className="text-xs font-semibold text-navy mb-1.5 block">Cover Type</Label>
                  <Select value={newCover.cover_type} onValueChange={(v) => setNewCover({ ...newCover, cover_type: v })}>
                    <SelectTrigger className="rounded-sm">
                      <SelectValue placeholder="Select cover type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COVER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount Required */}
                  <div>
                    <Label className="text-xs font-semibold text-navy mb-1.5 block">Sum Assured (Optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCover.amount_required}
                      onChange={(e) => setNewCover({ ...newCover, amount_required: e.target.value })}
                      placeholder="Amount"
                      className="rounded-sm"
                    />
                  </div>

                  {/* Premium */}
                  <div>
                    <Label className="text-xs font-semibold text-navy mb-1.5 block">Monthly Premium</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCover.premium}
                      onChange={(e) => setNewCover({ ...newCover, premium: e.target.value })}
                      placeholder="Premium"
                      className="rounded-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Annual Premium Increase */}
                  <div>
                    <Label className="text-xs font-semibold text-navy mb-1.5 block">Annual Premium Increase %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCover.annual_premium_increase_percent}
                      onChange={(e) => setNewCover({ ...newCover, annual_premium_increase_percent: e.target.value })}
                      placeholder="0.00"
                      className="rounded-sm"
                    />
                  </div>

                  {/* Annual Cover Increase */}
                  <div>
                    <Label className="text-xs font-semibold text-navy mb-1.5 block">Annual Cover Increase %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCover.annual_cover_increase_percent}
                      onChange={(e) => setNewCover({ ...newCover, annual_cover_increase_percent: e.target.value })}
                      placeholder="0.00"
                      className="rounded-sm"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddCover}
                  className="w-full flex items-center justify-center gap-2 border border-teal text-teal bg-transparent hover:bg-teal/5 py-2 rounded-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Cover
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => navigate(`/proposal/${proposalId}`)}
              variant="outline"
              className="flex-1 py-3 rounded-sm border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !provider || riskCovers.length === 0}
              className="flex-1 bg-teal hover:bg-teal/90 text-white py-3 rounded-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : riskProductId ? 'Update Risk Product' : 'Add Risk Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}