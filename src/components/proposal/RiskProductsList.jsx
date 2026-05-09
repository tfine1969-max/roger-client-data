import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';

export default function RiskProductsList({ riskProducts, proposalId }) {
  const navigate = useNavigate();

  if (riskProducts.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No risk products added yet. Click "Add Risk Product" to create one.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {riskProducts.map((product) => (
          <div key={product.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-navy">
                  {product.provider || 'Risk Product'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Risk product
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/proposal/${proposalId}/risk-product/${product.id}`)}
                  className="p-2 text-ocean hover:bg-muted rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-destructive hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}