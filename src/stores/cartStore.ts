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
  customerName: string;
  customerPhone: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  discount: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  amountPaid: number;
  deliveryCharge: number;
  addItem: (item: { id: string; name: string; price: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemNote: (id: string, note: string) => void;
  updateItemExtraCharge: (id: string, amount: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'mobile') => void;
  setAmountPaid: (amount: number) => void;
  setDeliveryCharge: (amount: number) => void;
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
  deliveryCharge: 0,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
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
        items: [...state.items, { id: item.id, name: item.name, quantity: 1, unitPrice: item.price, totalPrice: item.price }],
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

  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setOrderType: (orderType) => set({ orderType }),
  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  setDeliveryCharge: (deliveryCharge) => set({ deliveryCharge }),

  clearCart: () =>
    set({ items: [], customerName: '', customerPhone: '', discount: 0, amountPaid: 0, orderType: 'takeaway', paymentMethod: 'cash', deliveryCharge: 0 }),

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
    const dev = get().deliveryCharge || 0;
    return Math.max(0, subtotal + tax - discount + dev);
  },
}));
