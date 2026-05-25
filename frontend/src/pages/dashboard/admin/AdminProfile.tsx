import { useState } from 'react';
import { UserCircle, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { loadUser } from '@/features/auth/authThunks';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

const AdminProfile = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);

  const [nameForm, setNameForm] = useState({ full_name: currentUser?.full_name || '' });
  const [savingName, setSavingName] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveName = async () => {
    if (!nameForm.full_name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      setSavingName(true);
      await apiClient.put(`/users/${currentUser?.id}`, { full_name: nameForm.full_name.trim() });
      dispatch(loadUser());
      toast.success('Name updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update name'));
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
      toast.error('All password fields are required');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    try {
      setSavingPw(true);
      await apiClient.put('/users/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  };

  const initials = currentUser?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'A';

  return (
    <div className='max-w-2xl mx-auto space-y-6 p-6 animate-in fade-in duration-500'>
      {/* Avatar + info */}
      <Card className='border-none shadow-sm'>
        <CardContent className='pt-6 flex items-center gap-5'>
          <div className='h-16 w-16 rounded-full bg-[#1e2653] flex items-center justify-center text-white text-xl font-bold shrink-0'>
            {initials}
          </div>
          <div>
            <p className='text-lg font-bold text-slate-900'>{currentUser?.full_name}</p>
            <p className='text-sm text-slate-500'>{currentUser?.email}</p>
            <Badge className='mt-1 bg-blue-50 text-blue-700 capitalize'>
              {currentUser?.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit name */}
      <Card className='border-none shadow-sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base flex items-center gap-2'>
            <UserCircle className='h-4 w-4 text-slate-500' />
            Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='full-name'>Full Name</Label>
            <Input
              id='full-name'
              value={nameForm.full_name}
              onChange={(e) => setNameForm({ full_name: e.target.value })}
            />
          </div>
          <div className='space-y-2'>
            <Label>Email</Label>
            <Input value={currentUser?.email || ''} disabled />
          </div>
          <Button onClick={handleSaveName} disabled={savingName}>
            {savingName ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Saving...</> : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Change password */}
      <Card className='border-none shadow-sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Lock className='h-4 w-4 text-slate-500' />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='current-pw'>Current Password</Label>
            <Input
              id='current-pw'
              type='password'
              value={pwForm.current_password}
              onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-pw'>New Password</Label>
            <Input
              id='new-pw'
              type='password'
              value={pwForm.new_password}
              onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='confirm-pw'>Confirm New Password</Label>
            <Input
              id='confirm-pw'
              type='password'
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPw} variant='outline'>
            {savingPw ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Updating...</> : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfile;
