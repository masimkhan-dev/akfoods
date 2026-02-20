import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingUp, Receipt, DollarSign } from 'lucide-react';

interface Bill {
  id: string;
  bill_number: string;
  total: number;
  payment_method: string;
  created_at: string;
  order_type: string;
  customer_name: string | null;
}

interface BillItem {
  item_name: string;
  quantity: number;
  total_price: number;
  bill_id: string;
}

const Reports = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: billsData } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false });

    if (billsData) {
      setBills(billsData);
      const billIds = billsData.map((b) => b.id);
      if (billIds.length > 0) {
        const { data: items } = await supabase.from('bill_items').select('*').in('bill_id', billIds);
        setBillItems(items || []);
      } else {
        setBillItems([]);
      }
    }
    setLoading(false);
  };

  const fetchDateRange = async () => {
    setLoading(true);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const { data: billsData } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (billsData) {
      setBills(billsData);
      const billIds = billsData.map((b) => b.id);
      if (billIds.length > 0) {
        const { data: items } = await supabase.from('bill_items').select('*').in('bill_id', billIds);
        setBillItems(items || []);
      } else {
        setBillItems([]);
      }
    }
    setLoading(false);
  };

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total), 0);
  const totalOrders = bills.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const cashTotal = bills.filter((b) => b.payment_method === 'cash').reduce((s, b) => s + Number(b.total), 0);
  const cardTotal = bills.filter((b) => b.payment_method === 'card').reduce((s, b) => s + Number(b.total), 0);
  const mobileTotal = bills.filter((b) => b.payment_method === 'mobile').reduce((s, b) => s + Number(b.total), 0);

  // Top selling items
  const itemMap: Record<string, { quantity: number; revenue: number }> = {};
  billItems.forEach((item) => {
    if (!itemMap[item.item_name]) itemMap[item.item_name] = { quantity: 0, revenue: 0 };
    itemMap[item.item_name].quantity += item.quantity;
    itemMap[item.item_name].revenue += Number(item.total_price);
  });
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10);

  // Hourly sales
  const hourlyMap: Record<number, number> = {};
  bills.forEach((b) => {
    const hour = new Date(b.created_at).getHours();
    hourlyMap[hour] = (hourlyMap[hour] || 0) + Number(b.total);
  });
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    sales: hourlyMap[i] || 0,
  })).filter((d) => d.sales > 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold font-display">Sales Reports</h1>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" onClick={fetchToday}>Today</TabsTrigger>
          <TabsTrigger value="range">Date Range</TabsTrigger>
        </TabsList>

        <TabsContent value="range" className="mt-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
            <Button onClick={fetchDateRange} disabled={loading}>Generate</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2.5"><Receipt className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 rounded-lg p-2.5"><DollarSign className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">Rs. {totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/30 rounded-lg p-2.5"><TrendingUp className="w-5 h-5 text-secondary-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-2xl font-bold">Rs. {Math.round(avgOrder).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Cash', value: cashTotal, pct: totalRevenue > 0 ? ((cashTotal / totalRevenue) * 100).toFixed(1) : '0' },
              { label: 'Card', value: cardTotal, pct: totalRevenue > 0 ? ((cardTotal / totalRevenue) * 100).toFixed(1) : '0' },
              { label: 'Mobile', value: mobileTotal, pct: totalRevenue > 0 ? ((mobileTotal / totalRevenue) * 100).toFixed(1) : '0' },
            ].map((p) => (
              <div key={p.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="font-medium">Rs. {p.value.toLocaleString()} ({p.pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Selling Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topItems.map(([name, data], idx) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 shrink-0">{idx + 1}</Badge>
                  <span className="flex-1 truncate">{name}</span>
                  <span className="text-muted-foreground">{data.quantity} sold</span>
                  <span className="font-medium w-24 text-right">Rs. {data.revenue.toLocaleString()}</span>
                </div>
              ))}
              {topItems.length === 0 && <p className="text-sm text-muted-foreground">No sales data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Hourly Sales</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Sales']} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Bills */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Bills</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs">{bill.bill_number}</td>
                    <td className="p-2">{bill.customer_name || 'Walk-in'}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs capitalize">{bill.order_type}</Badge></td>
                    <td className="p-2 capitalize">{bill.payment_method}</td>
                    <td className="p-2 text-right font-medium">Rs. {Number(bill.total).toLocaleString()}</td>
                    <td className="p-2 text-right text-muted-foreground text-xs">
                      {new Date(bill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bills.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No bills found</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
