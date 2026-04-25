import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { queryKeys } from '@/lib/query-keys';
import { invalidateCache } from '@/lib/cache-utils';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [formSettings, setFormSettings] = useState<Record<string, string>>({});

  // Query
  const { data: initialSettings, isLoading: loading } = useCachedQuery(
    queryKeys.settings,
    () => db.getSettings(),
    { 
      persistKey: 'settings',
      onSuccess: (data: any[]) => {
        const obj: Record<string, string> = {};
        data.forEach((s) => { obj[s.setting_key] = s.setting_value; });
        setFormSettings(obj);
      }
    }
  );

  // Fallback for form initialization if onSuccess doesn't fire (e.g. from cache)
  useEffect(() => {
    if (initialSettings && Object.keys(formSettings).length === 0) {
      const obj: Record<string, string> = {};
      initialSettings.forEach((s: any) => { obj[s.setting_key] = s.setting_value; });
      setFormSettings(obj);
    }
  }, [initialSettings, formSettings]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      return supabase.from('settings').upsert(updates);
    },
    onSuccess: () => {
      invalidateCache(queryClient, ['settings']);
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save');
    }
  });

  const update = (key: string, value: string) => {
    setFormSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const updates = Object.entries(formSettings).map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value,
      updated_at: new Date().toISOString(),
    }));
    saveMutation.mutate(updates);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-display">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Restaurant Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Restaurant Name</Label>
            <Input value={formSettings.restaurant_name || ''} onChange={(e) => update('restaurant_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={formSettings.address || ''} onChange={(e) => update('address', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone 1</Label>
              <Input value={formSettings.phone1 || ''} onChange={(e) => update('phone1', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone 2</Label>
              <Input value={formSettings.phone2 || ''} onChange={(e) => update('phone2', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tax Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={formSettings.tax_enabled === 'true'}
              onCheckedChange={(v) => update('tax_enabled', v ? 'true' : 'false')}
            />
            <Label>Enable Tax</Label>
          </div>
          {formSettings.tax_enabled === 'true' && (
            <div className="space-y-2">
              <Label>Tax Percentage (%)</Label>
              <Input type="number" min={0} max={100} value={formSettings.tax_percentage || '0'} onChange={(e) => update('tax_percentage', e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Receipt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Receipt Footer</Label>
            <Textarea value={formSettings.receipt_footer || ''} onChange={(e) => update('receipt_footer', e.target.value)} rows={3} />
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
