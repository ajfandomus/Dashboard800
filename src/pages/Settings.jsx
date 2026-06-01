import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Save, Trash2, Database, Settings2, Loader2, Flower } from 'lucide-react';
import { DEFAULT_SHEET_CONFIGS } from '@/lib/sheetsEngine';
import { toast } from 'sonner';

// Local storage persistence for sheet configs (replaces base44 entities)
const CONFIG_KEY = 'sheet_configs';
const loadConfigs = () => {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || DEFAULT_SHEET_CONFIGS; }
  catch { return DEFAULT_SHEET_CONFIGS; }
};
const saveConfigs = (configs) => localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));

export default function Settings() {
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['allSheetConfigs'],
    queryFn: loadConfigs,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const current = loadConfigs();
      const idx = current.findIndex(c => c.sheet_key === data.sheet_key);
      if (idx >= 0) current[idx] = data;
      else current.push({ ...data, id: Date.now().toString() });
      saveConfigs(current);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allSheetConfigs'] }); setEditingConfig(null); toast.success('Sheet configuration saved!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (sheet_key) => {
      const current = loadConfigs().filter(c => c.sheet_key !== sheet_key);
      saveConfigs(current);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allSheetConfigs'] }); toast.success('Configuration deleted'); },
  });

  const startEdit = (config) => { setEditingConfig(config.sheet_key || 'new'); setFormData({ ...config }); };
  const startNew = () => { setEditingConfig('new'); setFormData({ name: '', sheet_key: '', spreadsheet_id: '', sheet_name: '', refresh_interval_minutes: 15, is_active: true, column_mapping: [], formulas: [] }); };

  const sheetIcons = { orders: '🛒', products: '🌸', customers: '👤', finance: '💰', delivery: '🚚', invoices: '📄' };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Settings" subtitle="Manage sheet configurations and data sources" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Sheet Sources</h3>
            <Button size="sm" variant="outline" onClick={startNew}><Plus className="w-3 h-3 mr-1" />Add</Button>
          </div>
          {isLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : configs.map(config => (
            <Card key={config.sheet_key} className={`cursor-pointer transition-all hover:shadow-md ${editingConfig === config.sheet_key ? 'ring-2 ring-primary' : ''}`} onClick={() => startEdit(config)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{sheetIcons[config.sheet_key] || '📊'}</span>
                    <div>
                      <p className="font-medium text-sm">{config.name}</p>
                      <p className="text-xs text-muted-foreground">{config.sheet_key}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={config.is_active ? 'default' : 'secondary'} className="text-xs">{config.is_active ? 'Active' : 'Off'}</Badge>
                    <span className="text-xs text-muted-foreground">{config.refresh_interval_minutes}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Panel */}
        <div className="lg:col-span-2">
          {editingConfig ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4" />{editingConfig === 'new' ? 'New Sheet Source' : `Edit: ${formData.name}`}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Display Name</Label><Input value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Orders" /></div>
                  <div className="space-y-2"><Label>Sheet Key</Label><Input value={formData.sheet_key || ''} onChange={e => setFormData(p => ({ ...p, sheet_key: e.target.value }))} placeholder="orders" /></div>
                </div>
                <div className="space-y-2"><Label>Google Spreadsheet ID</Label><Input value={formData.spreadsheet_id || ''} onChange={e => setFormData(p => ({ ...p, spreadsheet_id: e.target.value }))} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Sheet Tab Name</Label><Input value={formData.sheet_name || ''} onChange={e => setFormData(p => ({ ...p, sheet_name: e.target.value }))} placeholder="Sheet1" /></div>
                  <div className="space-y-2"><Label>Refresh (minutes)</Label><Input type="number" value={formData.refresh_interval_minutes || 15} onChange={e => setFormData(p => ({ ...p, refresh_interval_minutes: parseInt(e.target.value) }))} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active || false} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save
                  </Button>
                  {editingConfig !== 'new' && (
                    <Button variant="destructive" onClick={() => deleteMutation.mutate(formData.sheet_key)}>
                      <Trash2 className="w-4 h-4 mr-2" />Delete
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground py-16">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Select a sheet to configure</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
