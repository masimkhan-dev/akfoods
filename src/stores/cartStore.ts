import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
  extraCharge?: number;
}

interface CartState {
  items: CartItem[];
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  discount: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'credit';
  amountPaid: number;
  deliveryCharge: number;
  addItem: (item: { id: string; name: string; price: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemNote: (id: string, note: string) => void;
  updateItemExtraCharge: (id: string, amount: number) => void;
  setCustomerId: (id: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'mobile' | 'credit') => void;
  setAmountPaid: (amount: number) => void;
  setDeliveryCharge: (amount: number) => void;
  clearCart: () => void;
  taxEnabled: boolean;
  taxPercentage: number;
  setTaxConfig: (enabled: boolean, percentage: number) => void;
  subtotal: number;
  tax: number;
  total: number;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: '',
  customerName: '',
  customerPhone: '',
  orderType: 'takeaway',
  discount: 0,
  paymentMethod: 'cash',
  amountPaid: 0,
  deliveryCharge: 0,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      const name = (item as any).item_name || (item as any).name;
      const price = (item as any).price || (item as any).unitPrice;

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? {
                ...i,
                quantity: i.quantity + 1,
                totalPrice: (i.quantity + 1) * (i.unitPrice + (i.extraCharge || 0))
              }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { 
          id: item.id, 
          name: name, 
          quantity: 1, 
          unitPrice: price, 
          totalPrice: price 
        }],
      };
    });
  },

  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) => {
    if (quantity < 1) return;
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity, totalPrice: quantity * (i.unitPrice + (i.extraCharge || 0)) } : i
      ),
    }));
  },

  updateItemNote: (id, note) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, note } : i
      ),
    }));
  },

  updateItemExtraCharge: (id, amount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? {
            ...i,
            extraCharge: amount,
            totalPrice: i.quantity * (i.unitPrice + amount)
          }
          : i
      ),
    }));
  },

  setCustomerId: (customerId) => set({ customerId }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setOrderType: (orderType) => set({ orderType }),
  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  setDeliveryCharge: (deliveryCharge) => set({ deliveryCharge }),

  clearCart: () =>
    set({ items: [], customerId: '', customerName: '', customerPhone: '', discount: 0, amountPaid: 0, orderType: 'takeaway', paymentMethod: 'cash', deliveryCharge: 0 }),

  taxEnabled: false,
  taxPercentage: 0,
  setTaxConfig: (taxEnabled, taxPercentage) => set({ taxEnabled, taxPercentage }),

  // Helpers (internal)
  _calculateTotals: (items: CartItem[], discount: number, deliveryCharge: number, taxEnabled: boolean, taxPercentage: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = taxEnabled ? Math.round(((subtotal - discount) * (taxPercentage / 100)) * 100) / 100 : 0;
    const total = Math.max(0, subtotal + tax - discount + (deliveryCharge || 0));
    return { subtotal, tax, total };
  },

  // State
  subtotal: 0,
  tax: 0,
  total: 0,

  getSubtotal: () => get().subtotal,
  getTax: () => get().tax,
  getTotal: () => get().total,
}));

// Add middleware-like update to ensure totals are always synced
const originalSet = useCartStore.setState;
useCartStore.setState = (fn: any, replace: any) => {
  originalSet((state: any) => {
    const nextState = typeof fn === 'function' ? fn(state) : fn;
    const merged = { ...state, ...nextState };
    const { subtotal, tax, total } = (useCartStore.getState() as any)._calculateTotals(
      merged.items, merged.discount, merged.deliveryCharge, merged.taxEnabled, merged.taxPercentage
    );
    return { ...nextState, subtotal, tax, total };
  }, replace);
};
