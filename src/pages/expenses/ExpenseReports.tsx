import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { TrendingDown, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const fmt = (n: number) => `Rs. ${Number(n).toLocaleString()}`;

interface Expense {
  date: string;
  category: string;
  amount: number;
}

interface Bill {
  created_at: string;
  total: number;
}

const ExpenseReports = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [trendExpenses, setTrendExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchDailyData = async () => {
    const [expRes, revRes] = await Promise.all([
      supabase.from('expenses').select('date, category, amount').eq('date', selectedDate),
      supabase.from('bills').select('created_at, total').gte('created_at', `${selectedDate}T00:00:00`).lte('created_at', `${selectedDate}T23:59:59`),
    ]);
    setDailyExpenses((expRes.data || []) as Expense[]);
    setDailyRevenue(((revRes.data || []) as Bill[]).reduce((s, b) => s + Number(b.total), 0));
  };

  const fetchMonthlyData = async () => {
    const start = format(startOfMonth(new Date(selectedMonth + '-01')), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date(selectedMonth + '-01')), 'yyyy-MM-dd');
    const [expRes, revRes] = await Promise.all([
      supabase.from('expenses').select('date, category, amount').gte('date', start).lte('date', end),
      supabase.from('bills').select('created_at, total').gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`),
    ]);
    setMonthlyExpenses((expRes.data || []) as Expense[]);
    setMonthlyRevenue(((revRes.data || []) as Bill[]).reduce((s, b) => s + Number(b.total), 0));
  };

  const fetchTrends = async () => {
    const start = format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const end = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase.from('expenses').select('date, category, amount').gte('date', start).lte('date', end);
    setTrendExpenses((data || []) as Expense[]);
  };

  // Daily category breakdown
  const dailyCatBreakdown = dailyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const dailyCatData = Object.entries(dailyCatBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const dailyTotal = dailyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const dailyProfit = dailyRevenue - dailyTotal;

  // Monthly day-by-day breakdown
  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(new Date(selectedMonth + '-01'));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dailyExpMap: Record<string, number> = {};
  monthlyExpenses.forEach(e => { dailyExpMap[e.date] = (dailyExpMap[e.date] || 0) + Number(e.amount); });
  const monthlyDayData = daysInMonth.map(d => ({
    day: format(d, 'dd'),
    expenses: dailyExpMap[format(d, 'yyyy-MM-dd')] || 0,
  })).filter(d => d.expenses > 0);

  // Monthly category breakdown
  const monthCatBreakdown = monthlyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const monthCatData = Object.entries(monthCatBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const monthlyTotal = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const monthlyProfit = monthlyRevenue - monthlyTotal;

  // 30-day trend
  const trendMap: Record<string, number> = {};
  trendExpenses.forEach(e => { trendMap[e.date] = (trendMap[e.date] || 0) + Number(e.amount); });
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
    return { date: format(new Date(d + 'T12:00:00'), 'dd MMM'), expenses: trendMap[d] || 0 };
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Expense Reports
        </h1>
        <p className="text-sm text-muted-foreground">Analyze expenses and compare with revenue</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="trends">Trends (30 Days)</TabsTrigger>
        </TabsList>

        {/* Daily Report */}
        <TabsContent value="daily" className="space-y-5 mt-5">
          <div className="flex items-center gap-3">
            <Input type="date" value={selectedDate} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setSelectedDate(e.target.value)} className="w-[180px] h-9" />
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>Today</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Revenue', value: fmt(dailyRevenue), icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
              { label: 'Expenses', value: fmt(dailyTotal), icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
              { label: 'Net Profit', value: fmt(Math.abs(dailyProfit)), icon: DollarSign, color: dailyProfit >= 0 ? 'text-accent' : 'text-destructive', bg: dailyProfit >= 0 ? 'bg-accent/10' : 'bg-destructive/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className={`${bg} rounded-lg p-2.5`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      {label === 'Net Profit' && <p className="text-xs text-muted-foreground">{dailyProfit >= 0 ? 'Profit' : 'Loss'}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {dailyCatData.length > 0 ? (
            <div className="grid grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={dailyCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {dailyCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Category Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dailyCatData.map(({ name, value }, i) => (
                      <div key={name} className="flex items-center gap-3 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="flex-1 truncate">{name}</span>
                        <span className="font-medium text-destructive">{fmt(value)}</span>
                        <span className="text-muted-foreground text-xs w-12 text-right">{dailyTotal > 0 ? ((value / dailyTotal) * 100).toFixed(1) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No expenses recorded for this date</CardContent></Card>
          )}
        </TabsContent>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-5 mt-5">
          <div className="flex items-center gap-3">
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[180px] h-9" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(monthlyRevenue), color: 'text-accent', bg: 'bg-accent/10', icon: TrendingUp },
              { label: 'Total Expenses', value: fmt(monthlyTotal), color: 'text-destructive', bg: 'bg-destructive/10', icon: TrendingDown },
              { label: 'Net Profit', value: fmt(Math.abs(monthlyProfit)), color: monthlyProfit >= 0 ? 'text-accent' : 'text-destructive', bg: monthlyProfit >= 0 ? 'bg-accent/10' : 'bg-destructive/10', icon: DollarSign },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className={`${bg} rounded-lg p-2.5`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      {monthlyRevenue > 0 && label === 'Net Profit' && (
                        <p className="text-xs text-muted-foreground">Margin: {((monthlyProfit / monthlyRevenue) * 100).toFixed(1)}%</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {monthCatData.length > 0 && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Daily Expenses</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyDayData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Expenses']} />
                      <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthCatData.map(({ name, value }, i) => (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{name}</span>
                          <span className="font-medium text-destructive">{fmt(value)} ({monthlyTotal > 0 ? ((value / monthlyTotal) * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${monthlyTotal > 0 ? (value / monthlyTotal) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 30-day Trends */}
        <TabsContent value="trends" className="space-y-5 mt-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Expense Trend — Last 30 Days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Expenses']} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpenseReports;
