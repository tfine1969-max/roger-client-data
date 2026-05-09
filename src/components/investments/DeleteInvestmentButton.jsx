import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DeleteInvestmentButton({ investmentId, onDeleted }) {
  const handleDelete = async () => {
    await base44.entities.Investment.delete(investmentId);
    onDeleted?.();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete}>
      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
    </Button>
  );
}