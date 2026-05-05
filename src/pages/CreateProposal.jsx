import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ADVISORS = [
  { id: 'trevor', name: 'Trevor Fine' },
  { id: 'roger', name: 'Roger Eskinazi' },
  { id: 'malcolm', name: 'Malcolm Munsamy' }
];

export default function CreateProposal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client') || '';
  const [clientMode, setClientMode] = useState('existing');
  const [formData, setFormData] = useState({
    advisor_name: '',
    mandate_included: 'No',
    client_id: preselectedClientId,
    searchQuery: ''
  });
  const [newClientData, setNewClientData] = useState({
    full_name: '',
    email: '',
    mobile_number: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch existing clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Clients.list(),
  });

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!formData.searchQuery) return allClients;
    return allClients.filter(c =>
      c.full_name?.toLowerCase().includes(formData.searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(formData.searchQuery.toLowerCase())
    );
  }, [allClients, formData.searchQuery]);

  const createProposalMutation = useMutation({
    mutationFn: async ({ clientId, advisorName }) => {
      const reference = `WW-P-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      return base44.entities.Proposal.create({
        client_id: clientId,
        advisor_name: advisorName,
        reference,
        mandate_included: formData.mandate_included,
        proposal_status: 'Draft',
        document_version: 1
      });
    },
    onSuccess: (proposal) => {
      navigate(`/proposal/${proposal.id}`);
    }
  });

  const handleCreateClient = async () => {
    if (!newClientData.full_name || !newClientData.email) {
      alert('Please fill in name and email');
      return;
    }
    setIsCreating(true);
    const createdClient = await base44.entities.Clients.create({
      full_name: newClientData.full_name,
      email: newClientData.email,
      mobile_number: newClientData.mobile_number,
      client_status: 'Draft',
      client_source: 'Advisor Manual'
    });
    setIsCreating(false);
    // Switch to proposal creation with new client
    createProposalMutation.mutate({
      clientId: createdClient.id,
      advisorName: formData.advisor_name
    });
  };

  const handleCreateProposal = () => {
    if (!formData.advisor_name) {
      alert('Please select an advisor');
      return;
    }
    if (clientMode === 'existing') {
      if (!formData.client_id) {
        alert('Please select a client');
        return;
      }
      createProposalMutation.mutate({
        clientId: formData.client_id,
        advisorName: formData.advisor_name
      });
    } else {
      handleCreateClient();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate('/proposals')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to proposals
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-navy mb-2">Create Proposal</h1>
        <p className="text-muted-foreground mb-8">Set up a new financial proposal</p>

        <div className="bg-card border border-border rounded-lg p-8 space-y-8">
          {/* Advisor Selection */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-3 block">Advisor</Label>
            <Select value={formData.advisor_name} onValueChange={(v) => setFormData({ ...formData, advisor_name: v })}>
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Select advisor" />
              </SelectTrigger>
              <SelectContent>
                {ADVISORS.map(advisor => (
                  <SelectItem key={advisor.id} value={advisor.name}>
                    {advisor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mandate Included */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-3 block">Mandate Included</Label>
            <div className="flex gap-4">
              {['Yes', 'No'].map(option => (
                <label key={option} className={`flex items-center gap-3 px-4 py-3 border rounded-sm cursor-pointer transition-colors ${
                  formData.mandate_included === option
                    ? 'border-navy bg-navy/5'
                    : 'border-border hover:border-ocean/50'
                }`}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    formData.mandate_included === option
                      ? 'bg-navy border-navy'
                      : 'border-muted-foreground'
                  }`}>
                    {formData.mandate_included === option && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="font-medium text-navy">{option}</span>
                  <input
                    type="radio"
                    name="mandate"
                    value={option}
                    checked={formData.mandate_included === option}
                    onChange={(e) => setFormData({ ...formData, mandate_included: e.target.value })}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Client Selection Mode Toggle */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-3 block">Client Source</Label>
            <div className="flex gap-4">
              {['existing', 'new'].map(mode => (
                <label key={mode} className={`flex items-center gap-3 px-4 py-3 border rounded-sm cursor-pointer transition-colors flex-1 ${
                  clientMode === mode
                    ? 'border-ocean bg-ocean/5'
                    : 'border-border hover:border-ocean/50'
                }`}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    clientMode === mode
                      ? 'bg-ocean border-ocean'
                      : 'border-muted-foreground'
                  }`}>
                    {clientMode === mode && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="font-medium text-navy">
                    {mode === 'existing' ? 'Existing Client' : 'New Client'}
                  </span>
                  <input
                    type="radio"
                    name="client_mode"
                    value={mode}
                    checked={clientMode === mode}
                    onChange={(e) => {
                      setClientMode(e.target.value);
                      setFormData({ ...formData, client_id: '', searchQuery: '' });
                      setNewClientData({ full_name: '', email: '', mobile_number: '' });
                    }}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Client Selection - Option A: Existing */}
          {clientMode === 'existing' && (
            <div>
              <Label className="text-sm font-semibold text-navy mb-3 block">Select Client</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search by name or email..."
                  value={formData.searchQuery}
                  onChange={(e) => setFormData({ ...formData, searchQuery: e.target.value })}
                  className="rounded-sm"
                />
                <div className="border border-border rounded-sm max-h-64 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {allClients.length === 0 ? 'No clients found' : 'No matching clients'}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => setFormData({ ...formData, client_id: client.id })}
                          className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                            formData.client_id === client.id ? 'bg-ocean/10 border-l-2 border-l-ocean' : ''
                          }`}
                        >
                          <div className="font-medium text-navy">{client.full_name}</div>
                          <div className="text-xs text-muted-foreground">{client.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Client Selection - Option B: New */}
          {clientMode === 'new' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-navy">Create New Client</h3>
              <div>
                <Label className="text-sm font-semibold text-navy mb-1.5 block">Full Name</Label>
                <Input
                  placeholder="Client name"
                  value={newClientData.full_name}
                  onChange={(e) => setNewClientData({ ...newClientData, full_name: e.target.value })}
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-navy mb-1.5 block">Email Address</Label>
                <Input
                  type="email"
                  placeholder="client@email.com"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-navy mb-1.5 block">Mobile Number (Optional)</Label>
                <Input
                  type="tel"
                  placeholder="+27 ..."
                  value={newClientData.mobile_number}
                  onChange={(e) => setNewClientData({ ...newClientData, mobile_number: e.target.value })}
                  className="rounded-sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <Button
              onClick={() => navigate('/proposals')}
              variant="outline"
              className="flex-1 py-3 rounded-sm border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProposal}
              disabled={!formData.advisor_name || createProposalMutation.isPending || isCreating}
              className="flex-1 bg-navy hover:bg-ocean text-white py-3 rounded-sm font-medium disabled:opacity-50"
            >
              {createProposalMutation.isPending || isCreating ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
