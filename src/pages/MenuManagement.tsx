// Menu Management page for AKF POS
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

const MenuManagement = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ item_name: '', category: '', price: '', description: '', is_available: true });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [menuRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*').order('category'),
      supabase.from('categories').select('*').order('display_order'),
    ]);
    if (menuRes.data) setItems(menuRes.data);
    if (catRes.data) setCategories(catRes.data);
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({ item_name: '', category: categories[0]?.category_name || '', price: '', description: '', is_available: true });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      category: item.category,
      price: String(item.price),
      description: item.description || '',
      is_available: item.is_available,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.item_name.trim() || !form.category || !form.price) {
      toast.error('Fill required fields');
      return;
    }

    let imageUrl = editingItem?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `items/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('menu-images').upload(path, imageFile);
      if (uploadErr) {
        toast.error('Image upload failed');
        return;
      }
      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const payload = {
      item_name: form.item_name.trim(),
      category: form.category,
      price: parseFloat(form.price),
      description: form.description.trim() || null,
      image_url: imageUrl,
      is_available: form.is_available,
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Update failed'); return; }
      toast.success('Item updated');
    } else {
      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) { toast.error('Insert failed'); return; }
      toast.success('Item added');
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    toast.success('Item deleted');
    fetchData();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    fetchData();
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  const getCategoryIcon = (category: string) => {
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
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Menu Management</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        <button
          className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${filter === 'all'
            ? 'bg-primary text-white border-primary premium-shadow'
            : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
          onClick={() => setFilter('all')}
        >
          All Items
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${filter === c.category_name
              ? 'bg-primary text-white border-primary premium-shadow'
              : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
            onClick={() => setFilter(c.category_name)}
          >
            {c.category_name}
          </button>
        ))}
      </div>

      <div className="pos-grid">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl p-2.5 premium-shadow premium-hover border-2 transition-all flex flex-col gap-2 group ${!item.is_available ? 'opacity-60 border-dashed border-muted' : 'border-transparent hover:border-primary/20'}`}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/30">
              {item.image_url ? (
                <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl transition-all font-serif">
                  {getCategoryIcon(item.category)}
                </div>
              )}

              {/* Floating Management Actions */}
              <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 rounded-lg shadow-lg hover:bg-white hover:text-primary transition-all backdrop-blur-md bg-white/80"
                  onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 rounded-lg shadow-lg hover:bg-white hover:text-destructive transition-all backdrop-blur-md bg-white/80"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {!item.is_available && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <Badge variant="destructive" className="uppercase font-bold tracking-widest text-[8px] h-5">Sold Out</Badge>
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-start justify-between gap-1">
                <p className="font-bold text-[11px] tracking-tight leading-tight line-clamp-2 min-h-[1.5rem] group-hover:text-primary transition-colors">{item.item_name}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-primary font-black text-[10px] tabular-nums">Rs. {Number(item.price).toLocaleString()}</p>
                <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter bg-muted/20 border-none px-1 h-4">{item.category}</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-muted/50">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={item.is_available}
                  onCheckedChange={() => toggleAvailability(item)}
                  className="scale-[0.6] origin-left"
                />
                <span className="text-[8px] font-bold text-muted-foreground uppercase">{item.is_available ? 'Live' : 'Off'}</span>
              </div>
              <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-tighter bg-muted/20 border-none px-1 h-3.5 max-w-[60px] truncate">{item.category}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of this menu item.' : 'Enter the details for the new menu item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (Rs.) *</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
              <Label>Available</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingItem ? 'Update' : 'Add Item'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
