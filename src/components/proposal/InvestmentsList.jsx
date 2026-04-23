import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';

export default function InvestmentsList({ investments, proposalId }) {
  const navigate = useNavigate();

  if (investments.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No investments added yet. Click "Add Investment" to create one.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {investments.map((investment) => (
          <div key={investment.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-navy">
                  {investment.provider || 'Investment'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {investment.jurisdiction} · {investment.currency}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/proposal/${proposalId}/investment/${investment.id}`)}
                  className="p-2 text-ocean hover:bg-muted rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-destructive hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-foreground">
              Amount: <span className="font-medium">{investment.amount ? `R${investment.amount.toLocaleString()}` : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}