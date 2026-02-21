import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Loader2 } from 'lucide-react';

const EditExpense = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState({
    date: '',
    category: 'General',
    description: '',
    amount: '',
    payment_method: 'cash',
    paid_to: '',
  });

  useEffect(() => {
    supabase.from('expenses').select('*').eq('id', id!).single().then(({ data }) => {
      if (data) {
        setForm({
          date: data.date,
          category: data.category || 'General',
          description: data.description,
          amount: String(data.amount),
          payment_method: data.payment_method,
          paid_to: data.paid_to || '',
        });
      }
      setFetching(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Name/Description is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }

    setLoading(true);
    const { error } = await supabase.from('expenses').update({
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      payment_method: form.payment_method,
      paid_to: form.paid_to.trim() || null,
    }).eq('id', id!);

    if (error) { toast.error('Failed to update expense'); setLoading(false); return; }
    toast.success('Expense updated!');
    navigate('/dashboard/expenses');
  };

  if (role !== 'admin') return <div className="p-6"><p className="text-muted-foreground">Only admins can edit expenses.</p></div>;
  if (fetching) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/expenses')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit Expense
          </h1>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Edit Expense Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                className="max-w-[200px]"
                value={form.date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Expense Name / Description *</Label>
              <Textarea
                placeholder="Describe the expense..."
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (Rs.) *</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Paid To (Optional)</Label>
                <Input placeholder="Vendor / person name" value={form.paid_to} onChange={(e) => setForm(f => ({ ...f, paid_to: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <div className="flex gap-3">
                {['cash', 'bank', 'card'].map((method) => (
                  <label key={method} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors capitalize ${form.payment_method === method ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/50'}`}>
                    <input type="radio" name="payment_method" value={method} checked={form.payment_method === method} onChange={(e) => setForm(f => ({ ...f, payment_method: e.target.value }))} className="sr-only" />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/dashboard/expenses')}>Cancel</Button>
              <Button type="submit" className="flex-[2]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : 'Update Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditExpense;
