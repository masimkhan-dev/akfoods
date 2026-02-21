import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, TrendingDown, Calendar, Tag, Loader2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  paid_to: string | null;
  receipt_image: string | null;
  created_at: string;
}

const fmt = (n: number) => `Rs. ${Number(n).toLocaleString()}`;

const ExpenseList = () => {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (filterPeriod) {
      case 'today': return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week': return { start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
      case 'month': return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'custom': return { start: customStart, end: customEnd };
      default: return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  }, [filterPeriod, customStart, customEnd]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    if (!start || !end) { setLoading(false); return; }

    const { data } = await supabase.from('expenses').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }).order('created_at', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }, [getDateRange]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('expenses').delete().eq('id', deleteId);
    if (error) { toast.error('Failed to delete expense'); return; }
    toast.success('Expense deleted');
    setDeleteId(null);
    fetchExpenses();
  };

  const filtered = expenses.filter(e => {
    return e.description.toLowerCase().includes(search.toLowerCase()) || (e.paid_to && e.paid_to.toLowerCase().includes(search.toLowerCase()));
  });

  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount), 0);

  // Summary stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

  const todayTotal = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + Number(e.amount), 0);
  const weekTotal = expenses.filter(e => e.date >= weekStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0);

  const paymentBadgeColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'bank': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'card': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return '';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-destructive" /> Expenses
          </h1>
          <p className="text-sm text-muted-foreground">Track and manage all business expenses</p>
        </div>
        {role === 'admin' && (
          <Button onClick={() => navigate('/dashboard/expenses/add')}>
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Expenses", value: fmt(todayTotal), icon: Calendar, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: "This Week", value: fmt(weekTotal), icon: TrendingDown, color: 'text-primary', bg: 'bg-primary/10' },
          { label: "This Month", value: fmt(monthTotal), icon: TrendingDown, color: 'text-secondary-foreground', bg: 'bg-secondary/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`${bg} rounded-lg p-2`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`font-bold truncate ${color}`}>{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {filterPeriod === 'custom' && (
              <>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[140px] h-9" />
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[140px] h-9" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Expense Records</CardTitle>
            <span className="text-sm text-muted-foreground">{filtered.length} records | Total: <span className="font-bold text-destructive">{fmt(totalAmount)}</span></span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading expenses...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No expenses found for selected period</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Paid To</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-right p-3">Amount</th>
                    {role === 'admin' && <th className="text-right p-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(expense => (
                    <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{format(new Date(expense.date + 'T00:00:00'), 'dd MMM yyyy')}</td>
                      <td className="p-3 font-medium">{expense.description}</td>
                      <td className="p-3 text-muted-foreground">{expense.paid_to || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${paymentBadgeColor(expense.payment_method)}`}>{expense.payment_method}</span>
                      </td>
                      <td className="p-3 text-right font-bold text-destructive">{fmt(expense.amount)}</td>
                      {role === 'admin' && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/dashboard/expenses/edit/${expense.id}`)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(expense.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td colSpan={role === 'admin' ? 4 : 3} className="p-3 text-right font-semibold text-muted-foreground">Total:</td>
                    <td className="p-3 text-right font-bold text-destructive text-base">{fmt(totalAmount)}</td>
                    {role === 'admin' && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The expense record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseList;
