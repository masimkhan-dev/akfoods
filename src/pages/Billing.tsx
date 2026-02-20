import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Minus, X, Printer, Trash2, ShoppingCart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from '@/components/billing/Receipt';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

interface MenuItem {
  id: string;
  item_name: string;
  category: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

interface Category {
  id: string;
  category_name: string;
  display_order: number;
}

const Billing = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [lastBill, setLastBill] = useState<any>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const cart = useCartStore();
  const { user } = useAuthStore();

  const handlePrint = useReactToPrint({
    // @ts-ignore - react-to-print v2 uses content
    content: () => receiptRef.current,
    pageStyle: `
      @media print {
        /* Force body to 58mm width for small thermal printers */
        body, html {
          width: 58mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* All text solid black for thermal heat transfer */
        * {
          color: #000 !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        /* Receipt container styling */
        .receipt-container {
          width: 58mm;
          max-width: 58mm;
          padding: 2px 0;
          font-family: 'Courier New', Courier, monospace !important;
          font-size: 11px;
          line-height: 1.2;
        }

        .receipt-container * {
          page-break-inside: avoid !important;
        }

        .no-print {
          display: none !important;
        }
      }
    `,
  });

  useEffect(() => {
    fetchData();
    fetchTodayOverview();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const enabled = data.find((s) => s.setting_key === 'tax_enabled')?.setting_value === 'true';
      const percent = parseFloat(data.find((s) => s.setting_key === 'tax_percentage')?.setting_value || '0');
      cart.setTaxConfig(enabled, percent);

      const settingsMap = data.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }), {});
      setStoreSettings(settingsMap || {});
    }
  };

  const fetchTodayOverview = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [revRes, expRes] = await Promise.all([
      supabase.from('bills').select('total').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('expenses').select('amount').eq('date', today),
    ]);
    setTodayRevenue(((revRes.data || []) as { total: number }[]).reduce((s, b) => s + Number(b.total), 0));
    setTodayExpenses(((expRes.data || []) as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0));
  };

  const fetchData = async () => {
    const [menuRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('is_available', true).order('category'),
      supabase.from('categories').select('*').order('display_order'),
    ]);
    if (menuRes.data) setMenuItems(menuRes.data);
    if (catRes.data) setCategories(catRes.data);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePrintBill = async () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    // Fix #7: Prevent double-click from firing two bills
    if (saving) return;
    setSaving(true);

    try {
      const subtotal = cart.getSubtotal();
      const tax = cart.getTax();
      const total = cart.getTotal();
      const change = cart.amountPaid > 0 ? cart.amountPaid - total : 0;

      // Generate bill number via atomic RPC to prevent duplicates
      const { data: billNumber, error: numError } = await supabase.rpc('generate_next_bill_number');

      if (numError) {
        toast.error('Failed to generate bill number. Please retry.');
        console.error(numError);
        return;
      }

      // Save bill
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_number: billNumber,
          customer_name: cart.customerName || null,
          customer_phone: cart.customerPhone || null,
          order_type: cart.orderType,
          subtotal,
          discount: cart.discount,
          tax,
          total,
          payment_method: cart.paymentMethod,
          amount_paid: cart.amountPaid || total,
          change_returned: change > 0 ? change : 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (billError) {
        toast.error('Failed to save bill');
        console.error(billError);
        return;
      }

      // Save bill items
      const billItems = cart.items.map((item) => ({
        bill_id: billData.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }));

      // Fix #4: Check for bill_items save failure (was silent before)
      const { error: itemsError } = await supabase.from('bill_items').insert(billItems);

      if (itemsError) {
        toast.error(`Items failed to record. Note bill number: ${billNumber}`);
        console.error(itemsError);
        // Fix #5: Do NOT clear cart — cashier can still see what was ordered
        return;
      }

      setLastBill({
        ...billData,
        items: cart.items,
        change: change > 0 ? change : 0,
      });

      // Fix #5: clearCart only runs after FULL success (bill + items both saved)
      setTimeout(() => {
        handlePrint();
        toast.success(`Bill ${billNumber} printed!`);
        cart.clearCart();
        fetchTodayOverview();
      }, 200);
    } finally {
      // Fix #7: Always re-enable the button when done (success or failure)
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Today's Overview */}
      <div className="bg-card border-b px-4 py-2 flex items-center gap-6">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Overview</span>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-muted-foreground">Revenue:</span>
          <span className="text-sm font-bold text-accent">Rs. {todayRevenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs text-muted-foreground">Expenses:</span>
          <span className="text-sm font-bold text-destructive">Rs. {todayExpenses.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Net Profit:</span>
          <span className={`text-sm font-bold ${todayRevenue - todayExpenses >= 0 ? 'text-accent' : 'text-destructive'}`}>
            Rs. {(todayRevenue - todayExpenses).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Customer Info Bar */}
      <div className="bg-card border-b p-3 flex gap-3 items-end">
        <div className="flex-1 max-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name</label>
          <Input
            placeholder="Walk-in"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex-1 max-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
          <Input
            placeholder="Optional"
            value={cart.customerPhone}
            onChange={(e) => cart.setCustomerPhone(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Order Type</label>
          <Select value={cart.orderType} onValueChange={(v: any) => cart.setOrderType(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine-in">Dine In</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[130px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment</label>
          <Select value={cart.paymentMethod} onValueChange={(v: any) => cart.setPaymentMethod(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {/* Search */}
          <div className="p-3 border-b bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="p-2 border-b bg-card flex gap-1.5 overflow-x-auto scrollbar-thin">
            <Badge
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer shrink-0 px-3 py-1.5"
              onClick={() => setActiveCategory('all')}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.category_name ? 'default' : 'outline'}
                className="cursor-pointer shrink-0 px-3 py-1.5"
                onClick={() => setActiveCategory(cat.category_name)}
              >
                {cat.category_name}
              </Badge>
            ))}
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            <div className="pos-grid">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all active:scale-[0.97] group"
                  onClick={() => cart.addItem({ id: item.id, name: item.item_name, price: Number(item.price) })}
                >
                  {item.image_url ? (
                    <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                      <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-md mb-2 bg-muted flex items-center justify-center">
                      <span className="text-3xl">🍔</span>
                    </div>
                  )}
                  <p className="font-medium text-sm leading-tight truncate">{item.item_name}</p>
                  <p className="text-primary font-bold text-sm mt-0.5">Rs. {Number(item.price).toLocaleString()}</p>
                </Card>
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No items found
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-[380px] flex flex-col bg-card shrink-0">
          <div className="p-3 border-b flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Current Order</h2>
            <Badge variant="secondary" className="ml-auto">{cart.items.length} items</Badge>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {cart.items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-xs">Click items to add</p>
              </div>
            )}
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-muted-foreground text-xs">Rs. {item.unitPrice.toLocaleString()} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => item.quantity === 1 ? cart.removeItem(item.id) : cart.updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center font-medium text-xs">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <p className="font-bold text-xs w-16 text-right">Rs. {item.totalPrice.toLocaleString()}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => cart.removeItem(item.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="border-t p-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Discount:</label>
              <Input
                type="number"
                min={0}
                value={cart.discount || ''}
                onChange={(e) => cart.setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-8 w-24 text-xs"
              />
              <label className="text-xs text-muted-foreground ml-auto">Paid:</label>
              <Input
                type="number"
                min={0}
                value={cart.amountPaid || ''}
                onChange={(e) => cart.setAmountPaid(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-8 w-24 text-xs"
              />
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs. {cart.getSubtotal().toLocaleString()}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-Rs. {cart.discount.toLocaleString()}</span>
                </div>
              )}
              {cart.getTax() > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({cart.taxPercentage}%)</span>
                  <span>Rs. {cart.getTax().toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-1">
                <span>Total</span>
                <span className="text-primary">Rs. {cart.getTotal().toLocaleString()}</span>
              </div>
              {cart.amountPaid > 0 && cart.amountPaid >= cart.getTotal() && (
                <div className="flex justify-between text-accent font-medium">
                  <span>Change</span>
                  <span>Rs. {(cart.amountPaid - cart.getTotal()).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={cart.clearCart} disabled={cart.items.length === 0}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button className="flex-[2]" onClick={handlePrintBill} disabled={cart.items.length === 0 || saving}>
                <Printer className="w-4 h-4 mr-1" />
                Print Bill
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Receipt */}
      <div className="hidden">
        <Receipt ref={receiptRef} bill={lastBill} settings={storeSettings} />
      </div>
    </div>
  );
};

export default Billing;
