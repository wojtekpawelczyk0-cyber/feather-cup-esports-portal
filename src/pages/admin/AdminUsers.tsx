import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type AppRole = 'owner' | 'admin' | 'commentator' | 'support';

interface UserWithRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  email?: string;
}

const roleLabels: Record<AppRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-red-500/20 text-red-400' },
  admin: { label: 'Admin', color: 'bg-orange-500/20 text-orange-400' },
  commentator: { label: 'Komentator', color: 'bg-blue-500/20 text-blue-400' },
  support: { label: 'Support', color: 'bg-green-500/20 text-green-400' },
};

const AdminUsers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRoles, setUserRoles] = useState<UserWithRole[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    email: '',
    role: 'support' as AppRole,
  });

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (data || []).map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const rolesWithProfiles = (data || []).map((r: any) => ({
        ...r,
        profile: profilesMap.get(r.user_id) || null,
      }));

      setUserRoles(rolesWithProfiles as UserWithRole[]);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRole = async () => {
    if (!newRole.email.trim()) {
      toast({ title: 'Podaj email użytkownika', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Find user by email in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('display_name', newRole.email.trim())
        .maybeSingle();

      // If not found by name, try to find in auth (this requires admin access)
      // For now, we'll just show an error
      if (!profileData) {
        toast({ 
          title: 'Użytkownik nie znaleziony', 
          description: 'Upewnij się, że użytkownik ma konto na stronie',
          variant: 'destructive' 
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profileData.user_id,
          role: newRole.role,
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({ title: 'Ten użytkownik ma już tę rolę', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Rola dodana!' });
      setIsDialogOpen(false);
      setNewRole({ email: '', role: 'support' });
      fetchUserRoles();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę rolę?')) return;

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Rola usunięta' });
      fetchUserRoles();
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
          <h1 className="text-3xl font-bold text-foreground">Użytkownicy i Role</h1>
          <p className="text-muted-foreground">Zarządzaj uprawnieniami użytkowników</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj rolę
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Dodaj rolę użytkownikowi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nick użytkownika</Label>
                <Input
                  value={newRole.email}
                  onChange={(e) => setNewRole({ ...newRole, email: e.target.value })}
                  placeholder="Wpisz nick użytkownika"
                />
              </div>
              <div className="space-y-2">
                <Label>Rola</Label>
                <Select
                  value={newRole.role}
                  onValueChange={(v) => setNewRole({ ...newRole, role: v as AppRole })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="commentator">Komentator</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
                <Button variant="hero" onClick={addRole} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Dodaj
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-muted-foreground font-medium">Użytkownik</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Rola</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Data dodania</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {userRoles.map((ur) => (
              <tr key={ur.id} className="border-b border-border/50 hover:bg-secondary/20">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {ur.profile?.avatar_url ? (
                        <img src={ur.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground">
                      {ur.profile?.display_name || 'Nieznany'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    roleLabels[ur.role].color
                  )}>
                    {roleLabels[ur.role].label}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {new Date(ur.created_at).toLocaleDateString('pl-PL')}
                </td>
                <td className="p-4">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRole(ur.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {userRoles.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Brak ról użytkowników</p>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
