import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Printer } from 'lucide-react';

const fmt = (n: number) => `Rs. ${Number(n).toLocaleString()}`;

interface Expense {
  category: string;
  amount: number;
}

const ProfitLoss = () => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [expRes, revRes] = await Promise.all([
      supabase.from('expenses').select('category, amount').gte('date', startDate).lte('date', endDate),
      supabase.from('bills').select('total').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`),
    ]);
    setExpenses((expRes.data || []) as Expense[]);
    setRevenue(((revRes.data || []) as { total: number }[]).reduce((s, b) => s + Number(b.total), 0));
    setLoading(false);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
  const isProfit = netProfit >= 0;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" /> Profit & Loss Statement
          </h1>
          <p className="text-sm text-muted-foreground">Financial summary for the selected period</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <Button onClick={fetchData} disabled={loading}>Generate P&L</Button>
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="text-center text-lg">
            PROFIT & LOSS STATEMENT
            <p className="text-sm font-normal text-muted-foreground mt-1">
              {format(new Date(startDate + 'T12:00:00'), 'dd MMM yyyy')} — {format(new Date(endDate + 'T12:00:00'), 'dd MMM yyyy')}
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Revenue */}
          <div className="p-5 border-b">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-accent uppercase tracking-wide text-sm">Income</h3>
            </div>
            <div className="flex justify-between items-center pl-6">
              <span className="text-sm">Total Sales Revenue</span>
              <span className="font-semibold text-accent">{fmt(revenue)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="p-5 border-b">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-destructive uppercase tracking-wide text-sm">Expenses</h3>
            </div>
            <div className="space-y-4 pl-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Business Expenses</span>
                <span className="text-destructive font-semibold">{fmt(totalExpenses)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t pl-6">
              <span className="font-semibold text-sm">Net Expense impact</span>
              <span className="font-bold text-destructive">{fmt(totalExpenses)}</span>
            </div>
          </div>

          {/* Net Profit / Loss */}
          <div className={`p-5 ${isProfit ? 'bg-accent/10' : 'bg-destructive/10'}`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-xl font-bold ${isProfit ? 'text-accent' : 'text-destructive'}`}>
                  NET {isProfit ? 'PROFIT' : 'LOSS'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Profit Margin: <span className={`font-semibold ${isProfit ? 'text-accent' : 'text-destructive'}`}>{profitMargin.toFixed(1)}%</span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${isProfit ? 'text-accent' : 'text-destructive'}`}>
                  {isProfit ? '+' : '-'}{fmt(Math.abs(netProfit))}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-accent">{fmt(revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <TrendingDown className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-destructive">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <DollarSign className={`w-8 h-8 ${isProfit ? 'text-accent' : 'text-destructive'} mx-auto mb-2`} />
            <p className="text-xs text-muted-foreground">Net {isProfit ? 'Profit' : 'Loss'}</p>
            <p className={`text-xl font-bold ${isProfit ? 'text-accent' : 'text-destructive'}`}>{fmt(Math.abs(netProfit))}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLoss;
