import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, KeyRound, User } from 'lucide-react';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AdminSettings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: UserProfile }>('/users/profile')
      .then((res) => setProfile(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPw.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    try {
      setChangingPw(true);
      await apiClient.put('/users/password', {
        current_password: currentPw,
        new_password: newPw,
      });
      toast.success('Password updated successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <p className='text-slate-500'>Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div className='p-8 max-w-2xl mx-auto space-y-6'>
      <h1 className='text-2xl font-bold text-slate-900'>Profile & Settings</h1>

      {/* Account Info */}
      <Card className='overflow-hidden rounded-2xl'>
        <div className='bg-slate-50 px-6 py-4 flex items-center gap-2 border-b'>
          <User className='h-4 w-4 text-slate-500' />
          <p className='text-sm font-semibold text-slate-700'>Account Details</p>
        </div>
        <div className='p-6 flex items-center gap-6'>
          <Avatar className='h-20 w-20 border-4 border-slate-100 shrink-0'>
            <AvatarFallback className='bg-indigo-100 text-indigo-700 text-xl font-bold'>
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className='flex-1 space-y-1'>
            <h2 className='text-xl font-bold text-slate-900'>{profile.full_name}</h2>
            <p className='text-slate-500 text-sm'>{profile.email}</p>
            <p className='text-slate-400 text-xs'>
              Member since{' '}
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <div className='pt-1'>
              <Badge className='bg-indigo-100 text-indigo-700 gap-1'>
                <ShieldCheck className='h-3 w-3' />
                Administrator
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className='overflow-hidden rounded-2xl'>
        <div className='bg-slate-50 px-6 py-4 flex items-center gap-2 border-b'>
          <KeyRound className='h-4 w-4 text-slate-500' />
          <p className='text-sm font-semibold text-slate-700'>Change Password</p>
        </div>
        <div className='p-6 space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium text-slate-700'>Current Password</label>
            <Input
              type='password'
              placeholder='Enter current password'
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium text-slate-700'>New Password</label>
            <Input
              type='password'
              placeholder='Min. 6 characters'
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium text-slate-700'>Confirm New Password</label>
            <Input
              type='password'
              placeholder='Repeat new password'
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </div>
          <Button
            onClick={handleChangePassword}
            loading={changingPw}
            className='w-full bg-indigo-600 hover:bg-indigo-700'
          >
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminSettings;
