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

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Menu Management</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5" onClick={() => setFilter('all')}>All</Badge>
        {categories.map((c) => (
          <Badge key={c.id} variant={filter === c.category_name ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5 shrink-0" onClick={() => setFilter(c.category_name)}>
            {c.category_name}
          </Badge>
        ))}
      </div>

      <div className="pos-grid">
        {filtered.map((item) => (
          <Card key={item.id} className={`p-3 relative ${!item.is_available ? 'opacity-50' : ''}`}>
            {item.image_url ? (
              <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square rounded-md mb-2 bg-muted flex items-center justify-center"><span className="text-3xl">🍔</span></div>
            )}
            <p className="font-medium text-sm truncate">{item.item_name}</p>
            <p className="text-primary font-bold text-sm">Rs. {Number(item.price).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground truncate">{item.category}</p>

            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item)} />
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </Card>
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
