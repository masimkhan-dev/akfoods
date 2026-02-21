import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Minus, X, Printer, Trash2, ShoppingCart, TrendingUp, TrendingDown, DollarSign, MessageSquarePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from '@/components/billing/Receipt';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import KOT from '@/components/billing/KOT';

// Simple Error Boundary for resilience
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Print Component Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 bg-destructive/10 text-destructive text-xs rounded-lg">Print preview failed to load.</div>;
    }
    return this.props.children;
  }
}

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

const CartItem = React.memo(({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateNote,
  onUpdateExtra,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange
}: {
  item: any;
  onUpdateQuantity: (id: string, q: number) => void;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, n: string) => void;
  onUpdateExtra: (id: string, e: number) => void;
  isEditing: boolean;
  editValue: { note: string; extra: number };
  onStartEdit: (item: any) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (field: string, val: any) => void;
}) => {
  return (
    <div className="p-2 rounded-xl bg-[#fcfcfc] border border-muted/50 premium-hover transition-all animate-in fade-in slide-in-from-right-2 duration-300 relative overflow-hidden group mb-1">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/20 group-hover:bg-primary transition-colors" />

      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[11px] tracking-tight truncate group-hover:text-primary transition-colors leading-tight">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-black text-primary tabular-nums">Rs. {item.unitPrice.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground/40">×</span>
            <span className="text-[9px] font-bold text-muted-foreground/70">{item.quantity}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-[11px] tabular-nums text-foreground leading-tight">Rs. {item.totalPrice.toLocaleString()}</p>
          <button
            onClick={() => onRemove(item.id)}
            className="text-[8px] font-extrabold text-destructive/30 hover:text-destructive uppercase tracking-widest transition-colors mt-0.5"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 gap-1.5">
        <div className="flex items-center bg-white border border-muted rounded-lg p-0.5 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-md hover:bg-primary/5 hover:text-primary"
            onClick={() => item.quantity === 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Minus className="w-2 h-2" />
          </Button>
          <span className="w-6 text-center font-black text-[10px] tabular-nums">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-md hover:bg-primary/5 hover:text-primary"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="w-2 h-2" />
          </Button>
        </div>

        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-1.5 animate-in slide-in-from-left-1 duration-200">
              <Input
                value={editValue.note}
                onChange={(e) => onEditChange('note', e.target.value)}
                placeholder="Special instruction..."
                className="h-8 text-[11px] flex-[2] rounded-lg border-primary/20"
                autoFocus
              />
              <Input
                type="number"
                value={editValue.extra || ''}
                onChange={(e) => onEditChange('extra', Number(e.target.value) || 0)}
                placeholder="+Rs"
                className="h-8 text-[11px] flex-1 rounded-lg border-primary/20"
              />
              <Button
                size="sm"
                className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                onClick={onSaveEdit}
              >
                Save
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 cursor-pointer hover:text-primary transition-colors italic w-full p-1 rounded hover:bg-primary/5 group/note"
              onClick={() => onStartEdit(item)}
            >
              <MessageSquarePlus className="w-3 h-3 group-hover/note:scale-110 transition-transform" />
              {item.note || item.extraCharge ? (
                <span className="font-medium">
                  {item.note ? `"${item.note}" ` : ''}
                  {item.extraCharge ? <span className="text-primary not-italic ml-1">(+Rs. {item.extraCharge})</span> : ''}
                </span>
              ) : (
                "Add custom instructions..."
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const MenuItemComponent = React.memo(({ item, onAdd, getIcon }: { item: MenuItem; onAdd: (item: MenuItem) => void; getIcon: (cat: string) => string }) => {
  return (
    <div
      className="bg-white border-transparent border-2 hover:border-primary/20 rounded-xl p-2 cursor-pointer premium-hover premium-shadow flex flex-col gap-2 group active:scale-95 transition-all"
      onClick={() => onAdd(item)}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/30">
        {item.image_url ? (
          <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl transition-all font-serif">
            {getIcon(item.category)}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-primary text-white p-1 rounded-md shadow-lg">
            <Plus className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="font-bold text-[11px] tracking-tight leading-tight line-clamp-2 min-h-[1.5rem] group-hover:text-primary transition-colors">
          {item.item_name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-primary font-black text-[10px] tabular-nums">Rs. {Number(item.price).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
});

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
  const [noteEditing, setNoteEditing] = useState<{ id: string | null; note: string; extra: number }>({
    id: null,
    note: '',
    extra: 0,
  });
  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  const cart = useCartStore();
  const { user } = useAuthStore();

  const handlePrint = useReactToPrint({
    // @ts-ignore
    content: () => receiptRef.current,
  });

  const handlePrintKOT = useReactToPrint({
    // @ts-ignore
    content: () => kotRef.current,
  });

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('setting_key,setting_value');
    if (data) {
      const enabled = data.find((s) => s.setting_key === 'tax_enabled')?.setting_value === 'true';
      const percent = parseFloat(data.find((s) => s.setting_key === 'tax_percentage')?.setting_value || '0');
      cart.setTaxConfig(enabled, percent);

      const settingsMap = data.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }), {});
      setStoreSettings(settingsMap || {});
    }
  }, [cart]);

  const fetchTodayOverview = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [revRes, expRes] = await Promise.all([
      supabase.from('bills').select('total').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('expenses').select('amount').eq('date', today),
    ]);
    setTodayRevenue(((revRes.data || []) as { total: number }[]).reduce((s, b) => s + Number(b.total), 0));
    setTodayExpenses(((expRes.data || []) as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0));
  }, []);

  const fetchData = useCallback(async () => {
    const [menuRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('id,item_name,category,price,image_url,is_available').eq('is_available', true).order('category'),
      supabase.from('categories').select('id,category_name').order('display_order'),
    ]);
    if (menuRes.data) setMenuItems(menuRes.data as MenuItem[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
  }, []);

  useEffect(() => {
    fetchData();
    fetchTodayOverview();
    fetchSettings();
  }, [fetchData, fetchTodayOverview, fetchSettings]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.item_name.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, debouncedSearch]);

  const cartSubtotal = useMemo(() => cart.getSubtotal(), [cart.items]);
  const cartTax = useMemo(() => cart.getTax(), [cart.items]);
  const cartTotal = useMemo(() => cart.getTotal(), [cart.items]);

  const handlePrintBill = useCallback(async () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    // Fix #7: Prevent double-click from firing two bills
    if (saving) return;
    setSaving(true);

    console.time('OrderProcessing');
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

      const { error: itemsError } = await supabase.from('bill_items').insert(billItems);

      if (itemsError) {
        toast.error(`Items failed to record. Note bill number: ${billNumber}`);
        console.error(itemsError);
        return;
      }

      setLastBill({
        ...billData,
        items: cart.items,
        change: change > 0 ? change : 0,
      });

      console.timeEnd('OrderProcessing');

      // Sequential Printing
      setTimeout(() => {
        handlePrint();
        setTimeout(() => {
          handlePrintKOT();
          toast.success(`Bill ${billNumber} & KOT printed!`);
          cart.clearCart();
          fetchTodayOverview();
        }, 1000);
      }, 200);
    } finally {
      setSaving(false);
    }
  }, [cart, user?.id, saving, handlePrint, handlePrintKOT, fetchTodayOverview]);

  const handleAddItem = useCallback((item: MenuItem) => {
    const start = performance.now();
    const existing = cart.items.find(i => i.id === item.id);
    
    cart.addItem({ id: item.id, name: item.item_name, price: Number(item.price) });
    
    if (existing) {
      toast.info(`${item.item_name} quantity increased to ${existing.quantity + 1}`, {
        icon: '➕',
        duration: 1500,
      });
    } else {
      toast.success(`${item.item_name} added to cart`, {
        icon: '🛒',
        duration: 1500,
      });
    }

    const end = performance.now();
    if (end - start > 10) console.warn(`Slow cart addition: ${(end - start).toFixed(2)}ms`);
  }, [cart]);

  const handleUpdateQuantity = useCallback((id: string, q: number) => cart.updateQuantity(id, q), [cart]);
  const handleRemoveItem = useCallback((id: string) => cart.removeItem(id), [cart]);
  const handleUpdateNote = useCallback((id: string, n: string) => cart.updateItemNote(id, n), [cart]);
  const handleUpdateExtra = useCallback((id: string, e: number) => cart.updateItemExtraCharge(id, e), [cart]);

  const handleStartEdit = useCallback((item: any) => setNoteEditing({ id: item.id, note: item.note || '', extra: item.extraCharge || 0 }), []);
  const handleSaveEdit = useCallback(() => {
    if (noteEditing.id) {
      cart.updateItemNote(noteEditing.id, noteEditing.note);
      cart.updateItemExtraCharge(noteEditing.id, noteEditing.extra);
      setNoteEditing({ id: null, note: '', extra: 0 });
    }
  }, [noteEditing, cart]);
  const handleCancelEdit = useCallback(() => setNoteEditing({ id: null, note: '', extra: 0 }), []);
  const handleEditChange = useCallback((field: string, val: any) => setNoteEditing(prev => ({ ...prev, [field]: val })), []);

  const getCategoryIcon = useMemo(() => (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('burger') || cat.includes('fast')) return '🍔';
    if (cat.includes('pizza')) return '🍕';
    if (cat.includes('drink') || cat.includes('beverage') || cat.includes('cold') || cat.includes('juice')) return '🥤';
    if (cat.includes('chicken') || cat.includes('tikka') || cat.includes('karahi') || cat.includes('meat')) return '🍗';
    if (cat.includes('rice') || cat.includes('biryani') || cat.includes('pulao')) return '🍚';
    if (cat.includes('roti') || cat.includes('naan') || cat.includes('bread')) return '🫓';
    if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('cake') || cat.includes('ice')) return '🍰';
    if (cat.includes('tea') || cat.includes('coffee') || cat.includes('hot')) return '☕';
    if (cat.includes('fries') || cat.includes('side') || cat.includes('snack')) return '🍟';
    if (cat.includes('deal') || cat.includes('combo')) return '🍱';
    return '🍽️';
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Today's Overview Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b px-6 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group">
            <div className="p-1.5 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Revenue</span>
              <span className="text-sm font-bold text-accent tabular-nums">Rs. {todayRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 group">
            <div className="p-1.5 bg-destructive/10 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Expenses</span>
              <span className="text-sm font-bold text-destructive tabular-nums">Rs. {todayExpenses.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Net Profit</span>
              <span className={`text-sm font-bold tabular-nums ${todayRevenue - todayExpenses >= 0 ? 'text-accent' : 'text-destructive'}`}>
                Rs. {(todayRevenue - todayExpenses).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <Badge variant="outline" className="text-[10px] font-bold py-1 px-3 border-border/50 bg-white/50 backdrop-blur-sm">
            TERMINAL #{user?.id?.slice(-4).toUpperCase() || 'POS'}
          </Badge>
        </div>
      </div>

      {/* Customer Info Bar */}
      <div className="bg-white border-b px-6 py-4 grid grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Customer</label>
          <Input
            placeholder="Search or enter name"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            className="h-10 border-muted bg-muted/20 focus:bg-white transition-all shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Phone</label>
          <Input
            placeholder="e.g. 03xx xxxxxxx"
            value={cart.customerPhone}
            onChange={(e) => cart.setCustomerPhone(e.target.value)}
            className="h-10 border-muted bg-muted/20 focus:bg-white transition-all shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Type</label>
          <Select value={cart.orderType} onValueChange={(v: any) => cart.setOrderType(v)}>
            <SelectTrigger className="h-10 border-muted bg-muted/20 focus:bg-white transition-all shadow-sm capitalize font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine-in" className="capitalize">Dine In</SelectItem>
              <SelectItem value="takeaway" className="capitalize">Takeaway</SelectItem>
              <SelectItem value="delivery" className="capitalize">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Payment</label>
          <Select value={cart.paymentMethod} onValueChange={(v: any) => cart.setPaymentMethod(v)}>
            <SelectTrigger className="h-10 border-muted bg-muted/20 focus:bg-white transition-all shadow-sm capitalize font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash" className="capitalize">Cash</SelectItem>
              <SelectItem value="card" className="capitalize">Card</SelectItem>
              <SelectItem value="mobile" className="capitalize">Mobile Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {/* Search */}
          <div className="p-4 border-b bg-muted/5">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by meal name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white border-muted shadow-sm focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-4 py-2 border-b bg-white flex gap-1.5 overflow-x-auto scrollbar-thin">
            <button
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${activeCategory === 'all'
                ? 'bg-primary text-white border-primary premium-shadow'
                : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${activeCategory === cat.category_name
                  ? 'bg-primary text-white border-primary premium-shadow'
                  : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
                onClick={() => setActiveCategory(cat.category_name)}
              >
                {cat.category_name}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            <div className="pos-grid">
              {filteredItems.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  onAdd={handleAddItem}
                  getIcon={getCategoryIcon}
                />
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
        <div className="w-[390px] flex flex-col bg-white border-l shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-black text-sm uppercase tracking-tighter">Current Order</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Terminal ACTIVE</p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] rounded-lg px-2 shadow-none">
              {cart.items.length} ITEMS
            </Badge>
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
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                onUpdateNote={handleUpdateNote}
                onUpdateExtra={handleUpdateExtra}
                isEditing={noteEditing.id === item.id}
                editValue={noteEditing}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditChange={handleEditChange}
              />
            ))}
            <div ref={cartEndRef} />
          </div>

          {/* Cart Summary Header */}
          <div className="border-t bg-muted/5 p-3 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Discount</label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={cart.discount || ''}
                    onChange={(e) => cart.setDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 rounded-lg bg-white border-muted pr-6 text-xs"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Amount Paid</label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={cart.amountPaid || ''}
                    onChange={(e) => cart.setAmountPaid(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 rounded-lg bg-white border-muted pr-6 text-xs font-bold text-primary"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 p-1">
              <div className="flex justify-between items-center text-[11px] font-medium">
                <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Subtotal</span>
                <span className="tabular-nums font-bold">Rs. {cartSubtotal.toLocaleString()}</span>
              </div>

              {cart.discount > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-destructive font-bold uppercase tracking-widest text-[9px]">Discount</span>
                  <span className="text-destructive tabular-nums font-bold">-Rs. {cart.discount.toLocaleString()}</span>
                </div>
              )}

              {cartTax > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Tax ({cart.taxPercentage}%)</span>
                  <span className="text-muted-foreground tabular-nums font-bold">Rs. {cartTax.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-2 border-t border-muted">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black uppercase tracking-tighter">Net Payable</span>
                  <span className="text-xl font-black text-primary tabular-nums">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {cart.amountPaid > 0 && cart.amountPaid >= cartTotal && (
                <div className="flex justify-between items-center py-1.5 px-3 bg-accent/10 rounded-lg border border-accent/20">
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">Return</span>
                  <span className="text-sm font-black text-accent tabular-nums">Rs. {(cart.amountPaid - cartTotal).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive hover:border-destructive transition-all"
                onClick={cart.clearCart}
                disabled={cart.items.length === 0}
              >
                Clear
              </Button>
              <Button
                className="flex-[2.5] h-10 rounded-xl premium-shadow font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handlePrintBill}
                disabled={cart.items.length === 0 || saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Complete order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Receipt */}
      <div className="hidden">
        {lastBill && (
          <ErrorBoundary>
            <Receipt ref={receiptRef} bill={lastBill} settings={storeSettings} />
            <KOT ref={kotRef} bill={lastBill} settings={storeSettings} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default Billing;