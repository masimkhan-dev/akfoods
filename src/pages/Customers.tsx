import { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, History, DollarSign, Loader2, Phone, MapPin, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  current_balance: number;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  transaction_type: 'credit' | 'payment';
  amount: number;
  description: string;
  created_at: string;
  bill_id?: string;
}

const Customers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [transactionForm, setTransactionForm] = useState({ amount: '', description: '', type: 'payment' as 'credit' | 'payment' });

  // Queries
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.getCustomers()
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer_ledger', selectedCustomer?.id],
    queryFn: () => db.getCustomerLedger(selectedCustomer!.id),
    enabled: !!selectedCustomer && ledgerDialogOpen
  });

  // Mutations
  const addCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('customers').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Customer added successfully');
      setAddDialogOpen(false);
      setCustomerForm({ name: '', phone: '', address: '' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to add customer')
  });

  const transactionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await db.recordManualEntry(payload.customerId, payload.amount, payload.type, payload.description);
      return res;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.type === 'credit' ? 'Charge' : 'Payment'} recorded successfully`);
      setPaymentDialogOpen(false);
      setTransactionForm({ amount: '', description: '', type: 'payment' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer_ledger', selectedCustomer?.id] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to record transaction')
  });

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone?.includes(search)
    );
  }, [customers, search]);

  const handleAddCustomer = () => {
    if (!customerForm.name.trim()) return toast.error('Name is required');
    addCustomerMutation.mutate(customerForm);
  };

  const handleRecordTransaction = () => {
    if (!selectedCustomer) return;
    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount');
    transactionMutation.mutate({
      customerId: selectedCustomer.id,
      amount,
      type: transactionForm.type,
      description: transactionForm.description || (transactionForm.type === 'credit' ? 'Manual Charge' : 'Payment Received')
    });
  };

  const openLedger = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLedgerDialogOpen(true);
  };

  const openTransaction = (customer: Customer, type: 'credit' | 'payment') => {
    setSelectedCustomer(customer);
    setTransactionForm(prev => ({ ...prev, type }));
    setPaymentDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Khata Management</h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1">Manage Loan Customers & Ledgers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full md:w-[300px] bg-white border-muted shadow-sm focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
            />
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="rounded-xl premium-shadow font-bold uppercase tracking-widest text-xs h-10 px-6">
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </div>
      </div>

      {customersLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="premium-hover border-muted/50 overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {customer.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{customer.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          {customer.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={customer.current_balance > 0 ? "destructive" : "outline"} className="font-bold tabular-nums">
                      {customer.current_balance > 0 ? `Owes Rs. ${customer.current_balance.toLocaleString()}` : "Clear"}
                    </Badge>
                  </div>

                  {customer.address && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70 bg-muted/30 p-2 rounded-lg">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => openLedger(customer)}
                    >
                      <History className="w-3 h-3 mr-1.5" /> Ledger
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-destructive hover:bg-destructive/90"
                      onClick={() => openTransaction(customer, 'credit')}
                    >
                      <Plus className="w-3 h-3 mr-1.5" /> Add Udhaar
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-accent hover:bg-accent/90"
                      onClick={() => openTransaction(customer, 'payment')}
                    >
                      <DollarSign className="w-3 h-3 mr-1.5" /> Receive Pay
                    </Button>
                  </div>
                </div>
                <div className="h-1 bg-muted/20 group-hover:bg-primary/20 transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">New Khata Customer</DialogTitle>
            <DialogDescription className="font-medium">
              Add a permanent customer to your loan register.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input 
                value={customerForm.name} 
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                placeholder="e.g. Haji Sahab"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone Number</Label>
              <Input 
                value={customerForm.phone} 
                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                placeholder="03xx xxxxxxx"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Address / Description</Label>
              <Input 
                value={customerForm.address} 
                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                placeholder="Shop location or notes"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="rounded-xl h-11 px-6">Cancel</Button>
            <Button onClick={handleAddCustomer} disabled={addCustomerMutation.isPending} className="rounded-xl h-11 px-8 premium-shadow font-bold">
              {addCustomerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/5">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{selectedCustomer?.name}'s Ledger</DialogTitle>
                <DialogDescription className="font-medium">Recent transaction history (Last 50 entries)</DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Balance</p>
                <p className="text-2xl font-black text-destructive tabular-nums">Rs. {selectedCustomer?.current_balance.toLocaleString()}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-0 bg-[#fdfdfd]">
            {ledgerLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-right p-4">Debit</th>
                    <th className="text-right p-4">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), 'dd MMM, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{entry.description}</div>
                        {entry.bill_id && <div className="text-[10px] text-primary font-bold">SALE TRANSACTION</div>}
                      </td>
                      <td className="p-4 text-right tabular-nums font-bold text-destructive">
                        {entry.transaction_type === 'credit' ? `Rs. ${entry.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right tabular-nums font-bold text-accent">
                        {entry.transaction_type === 'payment' ? `Rs. ${entry.amount.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground italic">No transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-4 border-t bg-white flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">Export options coming soon</span>
            <Button variant="outline" onClick={() => setLedgerDialogOpen(false)} className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Close History</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {transactionForm.type === 'credit' ? 'Add Udhaar / Charge' : 'Receive Payment'}
            </DialogTitle>
            <DialogDescription className={cn("font-medium", transactionForm.type === 'credit' ? "text-destructive" : "text-accent")}>
              {transactionForm.type === 'credit' 
                ? `Recording a new loan for ${selectedCustomer?.name}`
                : `Recording cash received from ${selectedCustomer?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-accent/5 rounded-xl border border-accent/20 flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Current Due:</span>
              <span className="text-lg font-black text-accent">Rs. {selectedCustomer?.current_balance.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount (Rs)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className={cn("h-12 pl-10 text-lg font-bold rounded-xl", transactionForm.type === 'credit' ? "border-destructive/30 focus:ring-destructive/10" : "border-accent/30 focus:ring-accent/10")}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Note / Bill Details</Label>
              <Input 
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                className="h-11 rounded-xl"
                placeholder={transactionForm.type === 'credit' ? "e.g. Lunch Bill #123" : "e.g. Received by Cashier"}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl h-11 flex-1">Cancel</Button>
            <Button 
              onClick={handleRecordTransaction} 
              disabled={transactionMutation.isPending} 
              className={cn("rounded-xl h-11 flex-[2] premium-shadow font-bold", transactionForm.type === 'credit' ? "bg-destructive hover:bg-destructive/90" : "bg-accent hover:bg-accent/90")}
            >
              {transactionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
