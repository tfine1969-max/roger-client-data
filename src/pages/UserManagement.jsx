import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShieldAlert, UserPlus, Users } from 'lucide-react';

const ROLES = ['Administrator', 'Advisor', 'Staff'];

const roleBadgeClass = {
  Administrator: 'bg-primary/10 text-primary border-primary/20',
  Advisor:       'bg-gold/10 text-gold-600 border-gold/20',
  Staff:         'bg-slate-100 text-slate-600 border-slate-200',
};

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Staff');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  if (user?.role !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">Only Administrators can manage users.</p>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg({ type: 'success', text: `Invitation sent to ${inviteEmail.trim()}` });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      setInviteMsg({ type: 'error', text: err?.message || 'Failed to send invitation' });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          User Management
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage Wealth Works staff accounts and roles.
        </p>
      </div>

      {/* Invite */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Invite New Staff Member
        </h2>
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="staff@wealthworks.co.za"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 min-w-48"
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
        {inviteMsg && (
          <p className={`text-sm ${inviteMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Users list */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-slate-400 text-sm">Loading users…</div>
        ) : users.map(u => (
          <div key={u.id} className="flex items-center gap-4 px-6 py-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{u.full_name || '—'}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            {u.id === user?.id ? (
              <Badge className={roleBadgeClass[u.role]}>{u.role}</Badge>
            ) : (
              <Select value={u.role} onValueChange={val => handleRoleChange(u.id, val)}>
                <SelectTrigger className="w-36 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}