import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  discount: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  amountPaid: number;
  addItem: (item: { id: string; name: string; price: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'mobile') => void;
  setAmountPaid: (amount: number) => void;
  clearCart: () => void;
  taxEnabled: boolean;
  taxPercentage: number;
  setTaxConfig: (enabled: boolean, percentage: number) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  orderType: 'takeaway',
  discount: 0,
  paymentMethod: 'cash',
  amountPaid: 0,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { id: item.id, name: item.name, quantity: 1, unitPrice: item.price, totalPrice: item.price }],
      };
    });
  },

  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) => {
    if (quantity < 1) return;
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity, totalPrice: quantity * i.unitPrice } : i
      ),
    }));
  },

  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setOrderType: (orderType) => set({ orderType }),
  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),

  clearCart: () =>
    set({ items: [], customerName: '', customerPhone: '', discount: 0, amountPaid: 0, orderType: 'takeaway', paymentMethod: 'cash' }),

  taxEnabled: false,
  taxPercentage: 0,
  setTaxConfig: (taxEnabled, taxPercentage) => set({ taxEnabled, taxPercentage }),

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.totalPrice, 0),

  getTax: () => {
    if (!get().taxEnabled) return 0;
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    // Financial rounding safety (2 decimal places)
    return Math.round(((subtotal - discount) * (get().taxPercentage / 100)) * 100) / 100;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const tax = get().getTax();
    const discount = get().discount;
    return Math.max(0, subtotal + tax - discount);
  },
}));
