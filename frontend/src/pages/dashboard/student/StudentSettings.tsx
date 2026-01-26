import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function StudentSettings() {
  return (
    <div className='p-8 max-w-4xl mx-auto space-y-8'>
      <h1 className='text-3xl font-bold'>Settings</h1>

      <Card className='p-6 space-y-6'>
        <div className='flex items-center gap-4 mb-4'>
          <div className='h-12 w-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold'>
            AJ
          </div>
          <div>
            <p className='font-medium text-blue-600 cursor-pointer'>
              Change Profile Photo
            </p>
            <p className='text-xs text-muted-foreground'>
              JPG, GIF or PNG. Max size 800K
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label>FULL NAME</Label>
            <Input defaultValue='Alex Johnson' />
          </div>
          <div className='space-y-2'>
            <Label>EMAIL ADDRESS</Label>
            <Input defaultValue='alex.johnson@example.com' disabled />
          </div>
        </div>
      </Card>

      <Card className='p-6 space-y-6'>
        <h3 className='font-bold flex items-center gap-2'>🛡️ Security</h3>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>CURRENT PASSWORD</Label>
              <Input type='password' value='********' />
            </div>
            <div className='space-y-2'>
              <Label>NEW PASSWORD</Label>
              <Input type='password' placeholder='Enter new password' />
            </div>
          </div>
          {/* <div className='flex items-center justify-between p-4 border rounded-lg'>
            <div>
              <p className='font-medium'>Two-Factor Authentication (2FA)</p>
              <p className='text-sm text-muted-foreground'>
                Add an extra layer of security
              </p>
            </div>
            <Switch />
          </div> */}
        </div>
      </Card>

      <div className='flex justify-end gap-4'>
        <Button variant='ghost'>Cancel Changes</Button>
        <Button className='bg-[#1e293b]'>Save Preferences</Button>
      </div>
    </div>
  );
}
