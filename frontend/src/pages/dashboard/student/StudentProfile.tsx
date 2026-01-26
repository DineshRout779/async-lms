import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';

export default function StudentProfile() {
  const skills = [
    { label: 'Frontend Dev', value: 85 },
    { label: 'Backend Logic', value: 60 },
    { label: 'Database', value: 40 },
  ];

  return (
    <div className='p-8 max-w-6xl mx-auto space-y-6'>
      <Card className='p-8 flex items-center justify-between'>
        <div className='flex items-center gap-6'>
          <div className='relative'>
            <Avatar className='h-24 w-24 border-4 border-slate-100'>
              <AvatarImage src='/alex.png' />
            </Avatar>
            <button className='absolute bottom-0 right-0 bg-slate-800 text-white p-1 rounded-full text-xs'>
              edit
            </button>
          </div>
          <div>
            <h1 className='text-3xl font-bold'>Alex Johnson</h1>
            <p className='text-muted-foreground'>
              Computer Science • Batch 2024
            </p>
            <div className='flex gap-2 mt-2'>
              <Badge variant='secondary'>LEVEL 12</Badge>
              <Badge className='bg-yellow-100 text-yellow-700'>
                GOLD MEMBER
              </Badge>
            </div>
          </div>
        </div>
        <div className='flex gap-8 text-center'>
          <div>
            <p className='text-2xl font-bold'>2,450</p>
            <p className='text-xs text-muted-foreground'>TOTAL XP</p>
          </div>
          <div>
            <p className='text-2xl font-bold'>12</p>
            <p className='text-xs text-muted-foreground'>STREAK</p>
          </div>
          <div>
            <p className='text-2xl font-bold'>4</p>
            <p className='text-xs text-muted-foreground'>BADGES</p>
          </div>
        </div>
      </Card>

      <div className='grid grid-cols-3 gap-6'>
        <div className='col-span-2 grid grid-cols-2 gap-4'>
          <h3 className='col-span-2 font-bold text-lg'>Earned Badges</h3>
          {['HTML Starter', '7-Day Streak', 'Quiz Master', 'First Project'].map(
            (badge) => (
              <Card key={badge} className='p-4 flex items-center gap-4'>
                <div className='h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center'>
                  🏆
                </div>
                <div>
                  <p className='font-semibold'>{badge}</p>
                </div>
              </Card>
            )
          )}
        </div>

        <Card className='p-6 space-y-6'>
          <h3 className='font-bold'>Skills Profile</h3>
          {skills.map((skill) => (
            <div key={skill.label} className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>{skill.label}</span>
                <span>{skill.value}%</span>
              </div>
              <Progress value={skill.value} className='h-2' />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
