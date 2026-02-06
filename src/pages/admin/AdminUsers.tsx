import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Shield, Key, Mail, UserPlus, Ban, CheckCircle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type AppRole = 'owner' | 'admin' | 'commentator' | 'support' | 'map_veto';

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

interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  banned_at: string;
  banned_until: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  ban?: UserBan | null;
}

const roleLabels: Record<AppRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-red-500/20 text-red-400' },
  admin: { label: 'Admin', color: 'bg-orange-500/20 text-orange-400' },
  commentator: { label: 'Komentator', color: 'bg-blue-500/20 text-blue-400' },
  support: { label: 'Support', color: 'bg-green-500/20 text-green-400' },
  map_veto: { label: 'Map Veto', color: 'bg-purple-500/20 text-purple-400' },
};

const AdminUsers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRoles, setUserRoles] = useState<UserWithRole[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [banDuration, setBanDuration] = useState('1d');
  const [banReason, setBanReason] = useState('');
  const [newRole, setNewRole] = useState({
    email: '',
    role: 'support' as AppRole,
  });
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'bans'>('roles');
  const [banHistory, setBanHistory] = useState<UserBan[]>([]);
  const [banProfiles, setBanProfiles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchUserRoles();
    fetchAllUsers();
    fetchBanHistory();
  }, []);

  const fetchBanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .order('banned_at', { ascending: false });

      if (error) throw error;

      setBanHistory(data || []);

      // Get profiles for banned users
      const userIds = new Set<string>();
      (data || []).forEach((b: any) => {
        userIds.add(b.user_id);
        userIds.add(b.banned_by);
      });

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', Array.from(userIds));

        const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || 'Nieznany']));
        setBanProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error fetching ban history:', error);
    }
  };

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list_users' },
      });

      if (error) throw error;
      setAllUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const addRole = async () => {
    if (!newRole.email.trim()) {
      toast({ title: 'Podaj email użytkownika', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('display_name', newRole.email.trim())
        .maybeSingle();

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

  const updatePassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({ title: 'Podaj nowe hasło', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Hasło musi mieć minimum 6 znaków', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'update_password',
          userId: selectedUser.id,
          password: newPassword 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Hasło zmienione!' });
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta akcja jest nieodwracalna!')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete_user', userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Użytkownik usunięty' });
      fetchAllUsers();
      fetchUserRoles();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const banUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      let banUntil: Date;
      const now = new Date();

      switch (banDuration) {
        case '1h':
          banUntil = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '1d':
          banUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          banUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          banUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'permanent':
          banUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          banUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'ban_user',
          userId: selectedUser.id,
          banUntil: banUntil.toISOString(),
          reason: banReason || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Użytkownik zbanowany!' });
      setIsBanDialogOpen(false);
      setBanDuration('1d');
      setBanReason('');
      setSelectedUser(null);
      fetchAllUsers();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const unbanUser = async (userId: string) => {
    if (!confirm('Czy na pewno chcesz odbanować tego użytkownika?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'unban_user', userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Użytkownik odbanowany' });
      fetchAllUsers();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Podaj email i hasło', variant: 'destructive' });
      return;
    }

    if (newUser.password.length < 6) {
      toast({ title: 'Hasło musi mieć minimum 6 znaków', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'create_user',
          email: newUser.email,
          password: newUser.password,
          displayName: newUser.displayName || newUser.email.split('@')[0],
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Użytkownik utworzony!' });
      setIsCreateUserDialogOpen(false);
      setNewUser({ email: '', password: '', displayName: '' });
      fetchAllUsers();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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
        <div className="flex gap-2">
          {activeTab === 'users' && (
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="glass">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nowy użytkownik
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Utwórz nowego użytkownika</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hasło</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Min. 6 znaków"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nick (opcjonalnie)</Label>
                    <Input
                      value={newUser.displayName}
                      onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                      placeholder="Nick użytkownika"
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={() => setIsCreateUserDialogOpen(false)}>Anuluj</Button>
                    <Button variant="hero" onClick={createUser} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Utwórz
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'roles' && (
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
                        <SelectItem value="map_veto">Map Veto</SelectItem>
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
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'roles' ? 'hero' : 'ghost'}
          onClick={() => setActiveTab('roles')}
        >
          <Shield className="w-4 h-4 mr-2" />
          Role
        </Button>
        <Button
          variant={activeTab === 'users' ? 'hero' : 'ghost'}
          onClick={() => setActiveTab('users')}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Wszyscy użytkownicy
        </Button>
        <Button
          variant={activeTab === 'bans' ? 'hero' : 'ghost'}
          onClick={() => setActiveTab('bans')}
        >
          <History className="w-4 h-4 mr-2" />
          Historia banów
        </Button>
      </div>

      {activeTab === 'roles' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Użytkownik</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group roles by user
                const groupedByUser = userRoles.reduce((acc, ur) => {
                  const userId = ur.user_id;
                  if (!acc[userId]) {
                    acc[userId] = {
                      user_id: userId,
                      profile: ur.profile,
                      roles: [],
                    };
                  }
                  acc[userId].roles.push({ id: ur.id, role: ur.role, created_at: ur.created_at });
                  return acc;
                }, {} as Record<string, { user_id: string; profile: UserWithRole['profile']; roles: { id: string; role: AppRole; created_at: string }[] }>);

                const groupedUsers = Object.values(groupedByUser);

                if (groupedUsers.length === 0) {
                  return (
                    <tr>
                      <td colSpan={3} className="text-center text-muted-foreground py-12">
                        Brak ról użytkowników
                      </td>
                    </tr>
                  );
                }

                return groupedUsers.map((user) => {
                  // Find roles this user doesn't have yet
                  const existingRoles = user.roles.map(r => r.role);
                  const availableRoles = (['owner', 'admin', 'commentator', 'support'] as AppRole[])
                    .filter(r => !existingRoles.includes(r));

                  return (
                    <tr key={user.user_id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                            {user.profile?.avatar_url ? (
                              <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-semibold text-foreground">
                            {user.profile?.display_name || 'Nieznany'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {user.roles.map((r) => (
                            <div key={r.id} className="flex items-center gap-1 group">
                              <span className={cn(
                                'px-3 py-1 rounded-full text-xs font-semibold',
                                roleLabels[r.role].color
                              )}>
                                {roleLabels[r.role].label}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={() => removeRole(r.id)}
                                title="Usuń tę rolę"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {availableRoles.length > 0 && (
                            <Select
                              onValueChange={async (role) => {
                                setSaving(true);
                                try {
                                  const { error } = await supabase
                                    .from('user_roles')
                                    .insert({ user_id: user.user_id, role: role as AppRole });
                                  if (error) throw error;
                                  toast({ title: 'Rola dodana!' });
                                  fetchUserRoles();
                                } catch (error: any) {
                                  toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              <SelectTrigger className="w-auto h-7 px-2 text-xs border-dashed">
                                <Plus className="w-3 h-3 mr-1" />
                                Dodaj rolę
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {roleLabels[r].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end text-xs text-muted-foreground">
                          {user.roles.length} {user.roles.length === 1 ? 'rola' : user.roles.length < 5 ? 'role' : 'ról'}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Ostatnie logowanie</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Data rejestracji</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{user.email}</span>
                      {user.ban && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-destructive/20 text-destructive">
                          Zbanowany do {new Date(user.ban.banned_until).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleString('pl-PL')
                      : 'Nigdy'}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {user.ban ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unbanUser(user.id)}
                          title="Odbanuj"
                          className="text-green-500"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsBanDialogOpen(true);
                          }}
                          title="Zbanuj"
                          className="text-orange-500"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsPasswordDialogOpen(true);
                        }}
                        title="Zmień hasło"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUser(user.id)}
                        className="text-destructive"
                        title="Usuń użytkownika"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Brak użytkowników</p>
          )}
        </div>
      )}

      {activeTab === 'bans' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Użytkownik</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Zbanowany przez</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Powód</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Data bana</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Do kiedy</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {banHistory.map((ban) => {
                const isActive = new Date(ban.banned_until) > new Date();
                return (
                  <tr key={ban.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-4">
                      <span className="font-semibold text-foreground">
                        {banProfiles.get(ban.user_id) || 'Nieznany'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {banProfiles.get(ban.banned_by) || 'Nieznany'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {ban.reason || '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(ban.banned_at).toLocaleString('pl-PL')}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(ban.banned_until).toLocaleString('pl-PL')}
                    </td>
                    <td className="p-4">
                      {isActive ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-destructive/20 text-destructive">
                          Aktywny
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                          Wygasły
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {banHistory.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Brak historii banów</p>
          )}
        </div>
      )}

      {/* Ban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Zbanuj użytkownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">
              Użytkownik: <strong>{selectedUser?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label>Czas trwania bana</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 godzina</SelectItem>
                  <SelectItem value="1d">1 dzień</SelectItem>
                  <SelectItem value="7d">7 dni</SelectItem>
                  <SelectItem value="30d">30 dni</SelectItem>
                  <SelectItem value="permanent">Permanentny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Powód (opcjonalnie)</Label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Podaj powód bana"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => {
                setIsBanDialogOpen(false);
                setBanReason('');
              }}>Anuluj</Button>
              <Button variant="destructive" onClick={banUser} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Zbanuj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Zmień hasło użytkownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">
              Użytkownik: <strong>{selectedUser?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label>Nowe hasło</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 znaków"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => {
                setIsPasswordDialogOpen(false);
                setNewPassword('');
              }}>Anuluj</Button>
              <Button variant="hero" onClick={updatePassword} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Zmień hasło
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
