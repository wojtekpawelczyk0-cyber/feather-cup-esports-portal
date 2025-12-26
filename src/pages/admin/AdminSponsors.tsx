import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  is_active: boolean;
}

const AdminSponsors = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website_url: '',
    tier: 'standard',
    is_active: true,
  });

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSponsors((data || []) as Sponsor[]);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (sponsor?: Sponsor) => {
    if (sponsor) {
      setEditingSponsor(sponsor);
      setFormData({
        name: sponsor.name,
        logo_url: sponsor.logo_url || '',
        website_url: sponsor.website_url || '',
        tier: sponsor.tier || 'standard',
        is_active: sponsor.is_active,
      });
    } else {
      setEditingSponsor(null);
      setFormData({
        name: '',
        logo_url: '',
        website_url: '',
        tier: 'standard',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const saveSponsor = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Podaj nazwę sponsora', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const sponsorData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || null,
        website_url: formData.website_url.trim() || null,
        tier: formData.tier,
        is_active: formData.is_active,
      };

      if (editingSponsor) {
        const { error } = await supabase
          .from('sponsors')
          .update(sponsorData)
          .eq('id', editingSponsor.id);
        if (error) throw error;
        toast({ title: 'Sponsor zaktualizowany!' });
      } else {
        const { error } = await supabase.from('sponsors').insert(sponsorData);
        if (error) throw error;
        toast({ title: 'Sponsor dodany!' });
      }

      setIsDialogOpen(false);
      fetchSponsors();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego sponsora?')) return;

    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sponsor usunięty' });
      fetchSponsors();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (sponsor: Sponsor) => {
    try {
      const { error } = await supabase
        .from('sponsors')
        .update({ is_active: !sponsor.is_active })
        .eq('id', sponsor.id);
      if (error) throw error;
      fetchSponsors();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sponsorzy</h1>
          <p className="text-muted-foreground">Zarządzaj sponsorami turnieju</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj sponsora
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingSponsor ? 'Edytuj sponsora' : 'Nowy sponsor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nazwa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nazwa sponsora"
                />
              </div>
              <div className="space-y-2">
                <Label>URL logo</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Strona WWW</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Input
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  placeholder="standard, gold, platinum"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktywny</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
                <Button variant="hero" onClick={saveSponsor} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingSponsor ? 'Zapisz' : 'Dodaj'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sponsors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{sponsor.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openDialog(sponsor)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteSponsor(sponsor.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <h3 className="font-bold text-foreground mb-1">{sponsor.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{sponsor.tier}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={sponsor.is_active}
                  onCheckedChange={() => toggleActive(sponsor)}
                />
                <span className="text-sm text-muted-foreground">
                  {sponsor.is_active ? 'Aktywny' : 'Nieaktywny'}
                </span>
              </div>
              {sponsor.website_url && (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {sponsors.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Brak sponsorów</p>
        </div>
      )}
    </div>
  );
};

export default AdminSponsors;
