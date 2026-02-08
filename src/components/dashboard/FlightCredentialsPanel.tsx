import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plane, Plus, Pencil, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';

interface FlightCredential {
  id: string;
  provider: string;
  display_name: string;
  api_key: string;
  api_secret: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

const FLIGHT_PROVIDERS = [
  { id: 'amadeus', name: 'Amadeus', description: 'Global distribution system for flights' },
  { id: 'sabre', name: 'Sabre', description: 'Travel technology company' },
  { id: 'travelport', name: 'Travelport', description: 'Apollo, Galileo, Worldspan GDS' },
  { id: 'duffel', name: 'Duffel', description: 'Modern flight booking API' },
  { id: 'kiwi', name: 'Kiwi.com', description: 'Flight search and booking' },
  { id: 'skyscanner', name: 'Skyscanner', description: 'Flight comparison API' },
  { id: 'google_flights', name: 'Google Flights (QPX)', description: 'Google flight search' },
  { id: 'custom', name: 'Custom Provider', description: 'Other flight API provider' },
];

export const FlightCredentialsPanel = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<FlightCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<FlightCredential | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    provider: '',
    display_name: '',
    api_key: '',
    api_secret: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    is_active: true,
    is_preferred: false,
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('flight_credentials')
        .select('*')
        .order('is_preferred', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials((data || []) as FlightCredential[]);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load flight credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (credential?: FlightCredential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        provider: credential.provider,
        display_name: credential.display_name,
        api_key: credential.api_key,
        api_secret: credential.api_secret || '',
        environment: credential.environment,
        is_active: credential.is_active,
        is_preferred: credential.is_preferred,
      });
    } else {
      setEditingCredential(null);
      setFormData({
        provider: '',
        display_name: '',
        api_key: '',
        api_secret: '',
        environment: 'sandbox',
        is_active: true,
        is_preferred: false,
      });
    }
    setDialogOpen(true);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = FLIGHT_PROVIDERS.find(p => p.id === providerId);
    setFormData(prev => ({
      ...prev,
      provider: providerId,
      display_name: provider?.name || '',
    }));
  };

  const handleSave = async () => {
    if (!formData.provider || !formData.display_name || !formData.api_key) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // If setting as preferred, unset other preferred first
      if (formData.is_preferred && !editingCredential?.is_preferred) {
        await supabase
          .from('flight_credentials')
          .update({ is_preferred: false })
          .eq('is_preferred', true);
      }

      if (editingCredential) {
        const { error } = await supabase
          .from('flight_credentials')
          .update({
            display_name: formData.display_name,
            api_key: formData.api_key,
            api_secret: formData.api_secret || null,
            environment: formData.environment,
            is_active: formData.is_active,
            is_preferred: formData.is_preferred,
          })
          .eq('id', editingCredential.id);

        if (error) throw error;
        toast.success('Credentials updated successfully');
      } else {
        const { error } = await supabase
          .from('flight_credentials')
          .insert({
            provider: formData.provider,
            display_name: formData.display_name,
            api_key: formData.api_key,
            api_secret: formData.api_secret || null,
            environment: formData.environment,
            is_active: formData.is_active,
            is_preferred: formData.is_preferred,
            created_by: user?.id,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('This flight provider is already configured');
            return;
          }
          throw error;
        }
        toast.success('Flight partner added successfully');
      }

      setDialogOpen(false);
      fetchCredentials();
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast.error('Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete these credentials?')) return;

    try {
      const { error } = await supabase
        .from('flight_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Credentials deleted');
      fetchCredentials();
    } catch (error) {
      console.error('Error deleting credentials:', error);
      toast.error('Failed to delete credentials');
    }
  };

  const togglePreferred = async (id: string, currentState: boolean) => {
    try {
      // If setting as preferred, unset other preferred first
      if (!currentState) {
        await supabase
          .from('flight_credentials')
          .update({ is_preferred: false })
          .eq('is_preferred', true);
      }

      const { error } = await supabase
        .from('flight_credentials')
        .update({ is_preferred: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(!currentState ? 'Set as preferred partner' : 'Removed preferred status');
      fetchCredentials();
    } catch (error) {
      console.error('Error updating preferred status:', error);
      toast.error('Failed to update');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('flight_credentials')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Partner ${!currentState ? 'activated' : 'deactivated'}`);
      fetchCredentials();
    } catch (error) {
      console.error('Error toggling credentials:', error);
      toast.error('Failed to update');
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  const existingProviders = credentials.map(c => c.provider);
  const availableProviders = FLIGHT_PROVIDERS.filter(
    p => !existingProviders.includes(p.id) || editingCredential?.provider === p.id
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Flight Partner Credentials
          </CardTitle>
          <CardDescription>
            Configure API credentials for your preferred flight booking partners
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Plane className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">No flight partners configured</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Add your flight booking API credentials (Amadeus, Sabre, Duffel, etc.) to enable automated flight booking.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Partner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className={`flex items-center justify-between p-4 rounded-lg border bg-card ${
                  credential.is_preferred ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Plane className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {credential.display_name}
                      </span>
                      {credential.is_preferred && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Preferred
                        </Badge>
                      )}
                      <Badge 
                        variant={credential.environment === 'production' ? 'default' : 'secondary'}
                      >
                        {credential.environment}
                      </Badge>
                      {!credential.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>API Key: {credential.api_key.substring(0, 12)}...</span>
                      {credential.api_secret && (
                        <span className="flex items-center gap-1">
                          Secret: {showSecrets[credential.id] ? credential.api_secret : maskSecret(credential.api_secret)}
                          <button
                            onClick={() => toggleShowSecret(credential.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {showSecrets[credential.id] ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={credential.is_preferred ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => togglePreferred(credential.id, credential.is_preferred)}
                    title={credential.is_preferred ? 'Remove preferred' : 'Set as preferred'}
                  >
                    <Star className={`w-4 h-4 ${credential.is_preferred ? 'fill-current' : ''}`} />
                  </Button>
                  <Switch
                    checked={credential.is_active}
                    onCheckedChange={() => toggleActive(credential.id, credential.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(credential)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(credential.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? 'Edit' : 'Add'} Flight Partner
            </DialogTitle>
            <DialogDescription>
              {editingCredential 
                ? `Update your ${editingCredential.display_name} API credentials`
                : 'Add API credentials for a flight booking partner'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingCredential && (
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select flight partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex flex-col">
                          <span>{provider.name}</span>
                          <span className="text-xs text-muted-foreground">{provider.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="e.g., Amadeus Production"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="Enter your API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_secret">API Secret (optional)</Label>
              <Input
                id="api_secret"
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData(prev => ({ ...prev, api_secret: e.target.value }))}
                placeholder="Enter your API secret if required"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value: 'sandbox' | 'production') => 
                  setFormData(prev => ({ ...prev, environment: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production (Live)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_preferred">Preferred Partner</Label>
                <p className="text-xs text-muted-foreground">
                  Use this partner first when searching for flights
                </p>
              </div>
              <Switch
                id="is_preferred"
                checked={formData.is_preferred}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_preferred: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this partner
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCredential ? 'Update' : 'Add Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
