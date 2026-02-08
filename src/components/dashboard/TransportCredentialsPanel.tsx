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
import { Car, Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TransportCredential {
  id: string;
  provider: 'uber' | 'lyft';
  client_id: string;
  client_secret: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const TransportCredentialsPanel = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<TransportCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<TransportCredential | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    provider: 'uber' as 'uber' | 'lyft',
    client_id: '',
    client_secret: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    is_active: true,
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials((data || []) as TransportCredential[]);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load transport credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (credential?: TransportCredential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        provider: credential.provider,
        client_id: credential.client_id,
        client_secret: credential.client_secret,
        environment: credential.environment,
        is_active: credential.is_active,
      });
    } else {
      setEditingCredential(null);
      setFormData({
        provider: 'uber',
        client_id: '',
        client_secret: '',
        environment: 'sandbox',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.client_secret) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingCredential) {
        // Update existing
        const { error } = await supabase
          .from('transport_credentials')
          .update({
            client_id: formData.client_id,
            client_secret: formData.client_secret,
            environment: formData.environment,
            is_active: formData.is_active,
          })
          .eq('id', editingCredential.id);

        if (error) throw error;
        toast.success('Credentials updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('transport_credentials')
          .insert({
            provider: formData.provider,
            client_id: formData.client_id,
            client_secret: formData.client_secret,
            environment: formData.environment,
            is_active: formData.is_active,
            created_by: user?.id,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error(`${formData.provider.charAt(0).toUpperCase() + formData.provider.slice(1)} credentials already exist`);
            return;
          }
          throw error;
        }
        toast.success('Credentials added successfully');
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
        .from('transport_credentials')
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

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('transport_credentials')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Credentials ${!currentState ? 'activated' : 'deactivated'}`);
      fetchCredentials();
    } catch (error) {
      console.error('Error toggling credentials:', error);
      toast.error('Failed to update credentials');
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getProviderLogo = (provider: string) => {
    return provider === 'uber' ? '🚗' : '🩷';
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  const existingProviders = credentials.map(c => c.provider);
  const availableProviders = (['uber', 'lyft'] as const).filter(
    p => !existingProviders.includes(p) || editingCredential?.provider === p
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Transport API Credentials
          </CardTitle>
          <CardDescription>
            Configure Uber and Lyft API credentials for automated ride booking
          </CardDescription>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          disabled={availableProviders.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">No transport credentials configured</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Add your Uber or Lyft API credentials to enable automated ride booking for approved travel requests.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Provider
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                    {getProviderLogo(credential.provider)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">
                        {credential.provider}
                      </span>
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
                      <span>Client ID: {credential.client_id.substring(0, 12)}...</span>
                      <span className="flex items-center gap-1">
                        Secret: {showSecrets[credential.id] ? credential.client_secret : maskSecret(credential.client_secret)}
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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

            {credentials.some(c => c.environment === 'sandbox') && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Sandbox Mode Active</p>
                  <p className="text-muted-foreground">
                    Some credentials are in sandbox mode. Rides will be simulated and not actually booked.
                    Switch to production mode after testing to enable real ride booking.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? 'Edit' : 'Add'} Transport Credentials
            </DialogTitle>
            <DialogDescription>
              {editingCredential 
                ? `Update your ${editingCredential.provider} API credentials`
                : 'Add API credentials for Uber or Lyft to enable automated ride booking'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingCredential && (
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: 'uber' | 'lyft') => 
                    setFormData(prev => ({ ...prev, provider: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {getProviderLogo(provider)} {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={formData.client_id}
                onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                placeholder="Enter your API Client ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData(prev => ({ ...prev, client_secret: e.target.value }))}
                placeholder="Enter your API Client Secret"
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
                  <SelectItem value="sandbox">
                    Sandbox (Testing)
                  </SelectItem>
                  <SelectItem value="production">
                    Production (Live)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use sandbox for testing. Switch to production when ready for real bookings.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this provider for booking
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
              {saving ? 'Saving...' : editingCredential ? 'Update' : 'Add Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
