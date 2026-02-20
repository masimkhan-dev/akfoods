import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const obj: Record<string, string> = {};
      data.forEach((s) => { obj[s.setting_key] = s.setting_value; });
      setSettings(obj);
    }
    setLoading(false);
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const updates = Object.entries(settings).map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('settings').upsert(updates);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Settings saved');
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-display">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Restaurant Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Restaurant Name</Label>
            <Input value={settings.restaurant_name || ''} onChange={(e) => update('restaurant_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={settings.address || ''} onChange={(e) => update('address', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone 1</Label>
              <Input value={settings.phone1 || ''} onChange={(e) => update('phone1', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone 2</Label>
              <Input value={settings.phone2 || ''} onChange={(e) => update('phone2', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tax Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.tax_enabled === 'true'}
              onCheckedChange={(v) => update('tax_enabled', v ? 'true' : 'false')}
            />
            <Label>Enable Tax</Label>
          </div>
          {settings.tax_enabled === 'true' && (
            <div className="space-y-2">
              <Label>Tax Percentage (%)</Label>
              <Input type="number" min={0} max={100} value={settings.tax_percentage || '0'} onChange={(e) => update('tax_percentage', e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Receipt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Receipt Footer</Label>
            <Textarea value={settings.receipt_footer || ''} onChange={(e) => update('receipt_footer', e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="w-4 h-4 mr-1" /> Save Settings
      </Button>
    </div>
  );
};

export default SettingsPage;
