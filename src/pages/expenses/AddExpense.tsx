import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Receipt, Upload, X, Loader2 } from 'lucide-react';

const AddExpense = () => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    description: '',
    amount: '',
    payment_method: 'cash',
    paid_to: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Name/Description is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }

    setLoading(true);
    try {
      let receipt_image: string | null = null;
      // ... storage upload logic stays ...

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `receipts/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, imageFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
          receipt_image = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('expenses').insert({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        paid_to: form.paid_to.trim() || null,
        receipt_image,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success('Expense added successfully!');
      navigate('/dashboard/expenses');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Only admins can add expenses.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/expenses')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Add Expense
          </h1>
          <p className="text-sm text-muted-foreground">Record a new business expense</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Expense Details</CardTitle></CardHeader>
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
                placeholder="What was this expense for? (e.g. Murgi ka gosht - 5kg)"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Paid To (Optional)</Label>
                <Input
                  placeholder="Vendor / person name"
                  value={form.paid_to}
                  onChange={(e) => setForm(f => ({ ...f, paid_to: e.target.value }))}
                />
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

            <div className="space-y-1.5">
              <Label>Receipt Image (Optional)</Label>
              {imagePreview ? (
                <div className="relative w-40 h-40 rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Receipt" className="w-full h-full object-cover" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload receipt photo</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP (Max 5MB)</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/dashboard/expenses')}>Cancel</Button>
              <Button type="submit" className="flex-[2]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddExpense;
