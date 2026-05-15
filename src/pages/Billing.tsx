import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Printer, ShoppingCart, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import Receipt from '@/components/billing/Receipt';
import KOT from '@/components/billing/KOT';
import { useBillingData, useOfflineSync, useOrderProcessing } from '@/hooks/useBilling';
import { TodayOverviewBar, MenuItemComponent } from '@/components/billing/BillingUI';
import { useQuery } from '@tanstack/react-query';

// Simple Error Boundary for resilience
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="p-4 bg-destructive/10 text-destructive text-xs rounded-lg">Component failed to load.</div>;
    return this.props.children;
  }
}

const CartItem = React.memo(({ item, onUpdateQuantity, onRemove, onStartEdit, isEditing, editValue, onSaveEdit, onEditChange }: any) => (
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
        <button onClick={() => onRemove(item.id)} className="text-[8px] font-extrabold text-destructive/30 hover:text-destructive uppercase tracking-widest transition-colors mt-0.5">Remove</button>
      </div>
    </div>
    <div className="flex items-center justify-between mt-1 gap-1.5">
      <div className="flex items-center bg-white border border-muted rounded-lg p-0.5 shadow-sm">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => item.quantity === 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}>
          <span className="text-xs">−</span>
        </Button>
        <span className="w-6 text-center font-black text-[10px] tabular-nums">{item.quantity}</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
          <span className="text-xs">+</span>
        </Button>
      </div>
      <div className="flex-1">
        {isEditing ? (
          <div className="flex gap-1.5">
            <Input value={editValue.note} onChange={(e) => onEditChange('note', e.target.value)} placeholder="Note..." className="h-8 text-[11px] flex-[2]" autoFocus />
            <Input type="number" value={editValue.extra || ''} onChange={(e) => onEditChange('extra', Number(e.target.value) || 0)} placeholder="+Rs" className="h-8 text-[11px] flex-1" />
            <Button size="sm" className="h-8 px-3 text-[10px]" onClick={onSaveEdit}>Save</Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 cursor-pointer hover:text-primary italic p-1 rounded hover:bg-primary/5" onClick={() => onStartEdit(item)}>
            <span className="truncate">{item.note || item.extraCharge ? `${item.note || ''} ${item.extraCharge ? '(+Rs.' + item.extraCharge + ')' : ''}` : "Add instructions..."}</span>
          </div>
        )}
      </div>
    </div>
  </div>
));

const Billing = () => {
  const { user, role, username } = useAuthStore(useShallow(s => ({ user: s.user, role: s.role, username: s.username })));
  const { 
    items, customerId, customerName, customerPhone, orderType, paymentMethod, amountPaid, deliveryCharge, discount,
    subtotal, tax, total, taxPercentage,
    addItem, removeItem, updateQuantity, updateItemNote, updateItemExtraCharge, 
    setCustomerId, setCustomerName, setCustomerPhone, setOrderType, setPaymentMethod, setAmountPaid, setDeliveryCharge, setDiscount, setTaxConfig, clearCart 
  } = useCartStore(useShallow(s => ({
    items: s.items, customerId: s.customerId, customerName: s.customerName, customerPhone: s.customerPhone,
    orderType: s.orderType, paymentMethod: s.paymentMethod, amountPaid: s.amountPaid, deliveryCharge: s.deliveryCharge, discount: s.discount,
    subtotal: s.subtotal, tax: s.tax, total: s.total, taxPercentage: s.taxPercentage,
    addItem: s.addItem, removeItem: s.removeItem, updateQuantity: s.updateQuantity, updateItemNote: s.updateItemNote, updateItemExtraCharge: s.updateItemExtraCharge,
    setCustomerId: s.setCustomerId, setCustomerName: s.setCustomerName, setCustomerPhone: s.setCustomerPhone, setOrderType: s.setOrderType,
    setPaymentMethod: s.setPaymentMethod, setAmountPaid: s.setAmountPaid, setDeliveryCharge: s.setDeliveryCharge, setDiscount: s.setDiscount,
    setTaxConfig: s.setTaxConfig, clearCart: s.clearCart
  })));

  const { menuItems, categories, settings, overview, refetchOverview } = useBillingData();
  const { pendingSync } = useOfflineSync(refetchOverview);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [lastBill, setLastBill] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [noteEditing, setNoteEditing] = useState<{ id: string | null; note: string; extra: number }>({ id: null, note: '', extra: 0 });
  const [pendingPrintId, setPendingPrintId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isWeak = /Windows NT 6.3/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 4) < 4;
    if (isWeak) document.body.classList.add('lite-mode');
  }, []);

  const handlePrintKOT = useReactToPrint({
    content: () => kotRef.current,
    removeAfterPrint: true,
    onAfterPrint: () => {
      setIsPrinting(false);
      toast.success("Order Processed Successfully");
      clearCart();
      refetchOverview();
    }
  });

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    removeAfterPrint: true,
    onAfterPrint: () => {
      setTimeout(() => handlePrintKOT(), 500);
    }
  });

  useEffect(() => {
    if (lastBill && lastBill.id === pendingPrintId) {
      setPendingPrintId(null);
      setIsPrinting(true);
      setTimeout(() => handlePrint(), 100);
    }
  }, [lastBill, pendingPrintId, handlePrint]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (settings?.length) {
      const enabled = settings.find((s: any) => s.setting_key === 'tax_enabled')?.setting_value === 'true';
      const percent = parseFloat(settings.find((s: any) => s.setting_key === 'tax_percentage')?.setting_value || '0');
      if (enabled !== useCartStore.getState().taxEnabled || percent !== useCartStore.getState().taxPercentage) setTaxConfig(enabled, percent);
      setStoreSettings(settings.reduce((acc: any, s: any) => ({ ...acc, [s.setting_key]: s.setting_value }), {}));
    }
  }, [settings, setTaxConfig]);

  const { orderMutation, saving } = useOrderProcessing((data: any) => {
    setLastBill({
      id: data.bill_id, bill_number: data.bill_number, customer_name: customerName, customer_phone: customerPhone,
      order_type: orderType, payment_method: paymentMethod, amount_paid: amountPaid || data.total,
      subtotal: data.subtotal, discount: discount, tax: data.tax, total: data.total, delivery_charge: deliveryCharge,
      items: items.map(i => ({ ...i, item_name: i.name })), created_at: data.created_at || new Date().toISOString()
    });
    setPendingPrintId(data.bill_id);
  });

  const filteredItems = useMemo(() => menuItems.filter((item: any) => (activeCategory === 'all' || item.category === activeCategory) && item.item_name.toLowerCase().includes(debouncedSearch.toLowerCase())), [menuItems, activeCategory, debouncedSearch]);

  const handlePrintBill = useCallback(() => {
    if (!items.length || saving) return;
    orderMutation.mutate({
      p_idempotency_key: crypto.randomUUID(), p_customer_id: customerId || null, p_customer_name: customerName || null,
      p_customer_phone: customerPhone || null, p_order_type: orderType, p_discount: discount, p_tax_rate: taxPercentage / 100,
      p_payment_method: paymentMethod, p_amount_paid: amountPaid || 0, p_delivery_charge: deliveryCharge || 0,
      p_created_by: user?.id, p_items: items.map(item => ({ id: item.id, item_name: item.name, quantity: item.quantity, unit_price: item.unitPrice }))
    });
  }, [items, customerId, customerName, customerPhone, orderType, discount, taxPercentage, paymentMethod, amountPaid, deliveryCharge, user?.id, saving, orderMutation]);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('burger')) return '🍔';
    if (cat.includes('pizza')) return '🍕';
    if (cat.includes('drink')) return '🥤';
    if (cat.includes('chicken')) return '🍗';
    return '🍽️';
  };

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => db.getCustomers() });

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      <TodayOverviewBar todayRevenue={overview.revenue} todayExpenses={overview.expenses} totalKhata={overview.totalKhata} pendingSync={pendingSync} username={username} role={role} />
      
      <div className="bg-white border-b px-6 py-4 grid grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Customer</label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild><Button variant="outline" className="w-full h-10 justify-between">{customerName || "Walk-in Customer"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger>
            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandList><CommandEmpty className="p-4 text-xs">No customer found.</CommandEmpty><CommandGroup>
              <CommandItem onSelect={() => { setCustomerId(''); setCustomerName(''); setCustomerPhone(''); setCustomerOpen(false); }} className="text-xs font-bold"><Check className={cn("mr-2 h-4 w-4", !customerId ? "opacity-100" : "opacity-0")} />Walk-in Customer</CommandItem>
              {customers.map((c: any) => (
                <CommandItem key={c.id} onSelect={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone || ''); setCustomerOpen(false); }} className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center justify-between w-full"><span className="font-bold">{c.name}</span>{c.current_balance > 0 && <Badge variant="destructive" className="text-[9px]">Owes Rs. {c.current_balance}</Badge>}</div>
                  <span className="text-[10px] text-muted-foreground">{c.phone || 'No phone'}</span>
                </CommandItem>
              ))}
            </CommandGroup></CommandList></Command></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5"><label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Phone</label><Input placeholder="03xx xxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-10" disabled={!!customerId} /></div>
        <div className="space-y-1.5"><label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Type</label><Select value={orderType} onValueChange={setOrderType}><SelectTrigger className="h-10 capitalize"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dine-in">Dine In</SelectItem><SelectItem value="takeaway">Takeaway</SelectItem><SelectItem value="delivery">Delivery</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">Payment</label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger className={cn("h-10 capitalize", paymentMethod === 'credit' && "bg-destructive/5 text-destructive")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="mobile">Mobile Payment</SelectItem><SelectItem value="credit" className="font-bold text-destructive">Khata / Loan</SelectItem></SelectContent></Select></div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          <div className="p-4 border-b bg-muted/5"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input placeholder="Search meal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" /></div></div>
          <div className="px-4 py-2 border-b bg-white flex gap-1.5 overflow-x-auto scrollbar-thin">
            <button className={cn("whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase border", activeCategory === 'all' ? 'bg-primary text-white' : 'bg-white text-muted-foreground')} onClick={() => setActiveCategory('all')}>All</button>
            {categories.map((cat: any) => (<button key={cat.id} className={cn("whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase border", activeCategory === cat.category_name ? 'bg-primary text-white' : 'bg-white text-muted-foreground')} onClick={() => setActiveCategory(cat.category_name)}>{cat.category_name}</button>))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin"><div className="pos-grid">{filteredItems.map((item: any) => (<MenuItemComponent key={item.id} item={item} onAdd={addItem} getIcon={getCategoryIcon} />))}</div></div>
        </div>

        <div className="w-[390px] flex flex-col bg-white border-l shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 border-b flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="p-2 bg-primary/10 rounded-xl"><ShoppingCart className="w-4 h-4 text-primary" /></div><div><h2 className="font-black text-sm uppercase tracking-tighter">Current Order</h2><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Terminal ACTIVE</p></div></div><Badge className="bg-primary/10 text-primary border-none font-black text-[10px]">{items.length} ITEMS</Badge></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {items.map((item) => (<CartItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} isEditing={noteEditing.id === item.id} editValue={noteEditing} onStartEdit={(i:any) => setNoteEditing({ id: i.id, note: i.note || '', extra: i.extraCharge || 0 })} onSaveEdit={() => { updateItemNote(noteEditing.id!, noteEditing.note); updateItemExtraCharge(noteEditing.id!, noteEditing.extra); setNoteEditing({ id: null, note: '', extra: 0 }); }} onEditChange={(f:any, v:any) => setNoteEditing(p => ({ ...p, [f]: v }))} />))}
          </div>
          <div className="border-t bg-muted/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Discount</label><Input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="h-8" /></div>
              {orderType === 'delivery' && <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-primary uppercase tracking-widest pl-1">Delivery</label><Input type="number" value={deliveryCharge || ''} onChange={(e) => setDeliveryCharge(Number(e.target.value) || 0)} className="h-8" /></div>}
              <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Paid</label><Input type="number" value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} className="h-8 font-bold text-primary" /></div>
            </div>
            <div className="space-y-1.5 p-1">
              <div className="flex justify-between items-center text-[11px] font-medium"><span className="text-muted-foreground uppercase tracking-widest text-[9px]">Subtotal</span><span className="font-bold">Rs. {subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="flex justify-between items-center text-[11px]"><span className="text-destructive uppercase tracking-widest text-[9px]">Discount</span><span className="text-destructive font-bold">-Rs. {discount.toLocaleString()}</span></div>}
              {tax > 0 && <div className="flex justify-between items-center text-[11px]"><span className="text-muted-foreground uppercase tracking-widest text-[9px]">Tax ({taxPercentage}%)</span><span className="font-bold">Rs. {tax.toLocaleString()}</span></div>}
              <div className="pt-2 border-t border-muted"><div className="flex justify-between items-center"><span className="text-sm font-black uppercase tracking-tighter">Net Payable</span><span className="text-xl font-black text-primary">Rs. {total.toLocaleString()}</span></div></div>
              {amountPaid >= total && amountPaid > 0 && <div className="flex justify-between items-center py-1.5 px-3 bg-accent/10 rounded-lg"><span className="text-[9px] font-black text-accent uppercase tracking-widest">Return</span><span className="text-sm font-black text-accent">Rs. {(amountPaid - total).toLocaleString()}</span></div>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={clearCart} disabled={!items.length}>Clear</Button>
              <Button className="flex-[2.5] h-10 rounded-xl premium-shadow font-bold text-xs" onClick={handlePrintBill} disabled={!items.length || saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Printer className="w-4 h-4 mr-2" />Complete order</>}</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="print-container-hidden" aria-hidden="true">
        <ErrorBoundary>
          {isPrinting && lastBill && (
            <>
              <Receipt ref={receiptRef} bill={lastBill} settings={storeSettings} />
              <KOT ref={kotRef} bill={lastBill} settings={storeSettings} />
            </>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Billing;