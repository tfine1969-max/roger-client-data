import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

const extractDOBFromID = (idNumber) => {
  if (!idNumber || idNumber.length < 6) return '';
  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  const fullYear = parseInt(yy) > 25 ? `19${yy}` : `20${yy}`;
  return `${fullYear}-${mm}-${dd}`;
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    client_type: '',
    identity_type: '',
    first_name: '',
    last_name: '',
    sa_id_number: '',
    passport_number: '',
    date_of_birth: '',
    entity_name: '',
    registration_number: '',
    trust_number: '',
    email: '',
    mobile_number: '',
    residential_address: ''
  });

  // Verify pending client context on mount and pre-populate form
  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) {
      toast.error('Invalid session. Please register first.');
      navigate('/client-registration', { replace: true });
      return;
    }
    
    // Fetch client record to load all data
    base44.entities.Clients.list()
      .then(clients => {
        const client = clients.find(c => c.id === id);
        if (client) {
          setFormData(prev => ({
            ...prev,
            client_type: client.client_type || '',
            identity_type: client.identity_type || '',
            first_name: client.first_name || '',
            last_name: client.last_name || '',
            sa_id_number: client.sa_id_number || '',
            passport_number: client.passport_number || '',
            date_of_birth: client.date_of_birth || '',
            entity_name: client.entity_name || '',
            registration_number: client.registration_number || '',
            trust_number: client.trust_number || '',
            email: client.email || '',
            mobile_number: client.mobile_number || '',
            residential_address: client.residential_address || ''
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        setClientId(id);
        setIsInitializing(false);
      });
  }, [navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-extract DOB from SA ID
    if (field === 'sa_id_number' && value.length >= 6) {
      const dob = extractDOBFromID(value);
      if (dob) {
        setFormData(prev => ({ ...prev, date_of_birth: dob }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientId) {
      toast.error('Client record not found');
      return;
    }

    // Validate required fields
    if (!formData.client_type) {
      toast.error('Please select client type');
      return;
    }

    if (!formData.email || !formData.mobile_number || !formData.residential_address) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate type-specific required fields
    if (formData.client_type === 'Natural Person') {
      if (!formData.identity_type || !formData.first_name || !formData.last_name || !formData.date_of_birth) {
        toast.error('Please fill in all required fields for Natural Person');
        return;
      }
      if (formData.identity_type === 'SA ID' && !formData.sa_id_number) {
        toast.error('Please enter SA ID number');
        return;
      }
      if (formData.identity_type === 'Passport' && !formData.passport_number) {
        toast.error('Please enter passport number');
        return;
      }
    }

    if (formData.client_type === 'Company') {
      if (!formData.entity_name || !formData.registration_number) {
        toast.error('Please fill in all required fields for Company');
        return;
      }
    }

    if (formData.client_type === 'Trust') {
      if (!formData.entity_name || !formData.trust_number) {
        toast.error('Please fill in all required fields for Trust');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Update client record with onboarding data
      const updateData = {
        client_type: formData.client_type,
        client_status: 'Onboarded',
        email: formData.email,
        mobile_number: formData.mobile_number,
        residential_address: formData.residential_address
      };

      // Add type-specific fields
      if (formData.client_type === 'Natural Person') {
        updateData.identity_type = formData.identity_type;
        updateData.first_name = formData.first_name;
        updateData.last_name = formData.last_name;
        updateData.full_name = `${formData.first_name} ${formData.last_name}`;
        updateData.date_of_birth = formData.date_of_birth;
        if (formData.identity_type === 'SA ID') {
          updateData.sa_id_number = formData.sa_id_number;
        } else {
          updateData.passport_number = formData.passport_number;
        }
      } else if (formData.client_type === 'Company') {
        updateData.entity_name = formData.entity_name;
        updateData.registration_number = formData.registration_number;
      } else if (formData.client_type === 'Trust') {
        updateData.entity_name = formData.entity_name;
        updateData.trust_number = formData.trust_number;
      }

      await base44.entities.Clients.update(clientId, updateData);
      toast.success('Onboarding completed successfully');
      navigate('/client-confirmation', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-lg p-8">
            <h1 className="text-3xl font-bold text-navy mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground mb-8">Provide your details to finalize your account</p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Client Type Selection */}
              <div>
                <Label className="text-sm font-semibold text-navy mb-2 block">Client Type *</Label>
                <Select value={formData.client_type} onValueChange={(value) => handleChange('client_type', value)}>
                  <SelectTrigger className="rounded-sm">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Natural Person">Natural Person</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Trust">Trust</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Natural Person Fields */}
              {formData.client_type === 'Natural Person' && (
                <div className="space-y-6 p-6 bg-secondary/30 rounded border border-border">
                  <h3 className="font-semibold text-navy">Personal Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-navy mb-2 block">Identity Type *</Label>
                      <Select value={formData.identity_type} onValueChange={(value) => handleChange('identity_type', value)}>
                        <SelectTrigger className="rounded-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SA ID">SA ID</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      {formData.identity_type === 'SA ID' ? (
                        <div>
                          <Label className="text-sm font-semibold text-navy mb-2 block">SA ID Number *</Label>
                          <Input
                            value={formData.sa_id_number}
                            onChange={(e) => handleChange('sa_id_number', e.target.value)}
                            placeholder="13-digit SA ID"
                            maxLength="13"
                            className="rounded-sm"
                          />
                        </div>
                      ) : formData.identity_type === 'Passport' ? (
                        <div>
                          <Label className="text-sm font-semibold text-navy mb-2 block">Passport Number *</Label>
                          <Input
                            value={formData.passport_number}
                            onChange={(e) => handleChange('passport_number', e.target.value)}
                            placeholder="Passport number"
                            className="rounded-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-navy mb-2 block">First Name *</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        placeholder="First name"
                        className="rounded-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-navy mb-2 block">Last Name *</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        placeholder="Last name"
                        className="rounded-sm"
                      />
                    </div>
                  </div>



                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      className="rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Company Fields */}
              {formData.client_type === 'Company' && (
                <div className="space-y-6 p-6 bg-secondary/30 rounded border border-border">
                  <h3 className="font-semibold text-navy">Company Information</h3>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Entity Name *</Label>
                    <Input
                      value={formData.entity_name}
                      onChange={(e) => handleChange('entity_name', e.target.value)}
                      placeholder="Company name"
                      className="rounded-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Registration Number *</Label>
                    <Input
                      value={formData.registration_number}
                      onChange={(e) => handleChange('registration_number', e.target.value)}
                      placeholder="CIPC registration number"
                      className="rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Trust Fields */}
              {formData.client_type === 'Trust' && (
                <div className="space-y-6 p-6 bg-secondary/30 rounded border border-border">
                  <h3 className="font-semibold text-navy">Trust Information</h3>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Entity Name *</Label>
                    <Input
                      value={formData.entity_name}
                      onChange={(e) => handleChange('entity_name', e.target.value)}
                      placeholder="Trust name"
                      className="rounded-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Trust Number *</Label>
                    <Input
                      value={formData.trust_number}
                      onChange={(e) => handleChange('trust_number', e.target.value)}
                      placeholder="Trust registration/master reference"
                      className="rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Common Fields (shown for all types) */}
              {formData.client_type && (
                <div className="space-y-6 p-6 bg-secondary/30 rounded border border-border">
                  <h3 className="font-semibold text-navy">Contact Information</h3>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com"
                      className="rounded-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Mobile Number *</Label>
                    <Input
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => handleChange('mobile_number', e.target.value)}
                      placeholder="+27 ..."
                      className="rounded-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-navy mb-2 block">Residential Address *</Label>
                    <Input
                      value={formData.residential_address}
                      onChange={(e) => handleChange('residential_address', e.target.value)}
                      placeholder="Street address"
                      className="rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {formData.client_type && (
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/client-otp')}
                    className="flex-1 rounded-sm"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-navy text-white hover:bg-ocean py-3 rounded-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Complete Onboarding'}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}