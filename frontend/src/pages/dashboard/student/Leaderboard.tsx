import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function Leaderboard() {
  const topThree = [
    { name: 'Elena Rodriguez', rank: 2, xp: 4890, img: '/elena.png' },
    {
      name: 'Arjun Mehta',
      rank: 1,
      xp: 5240,
      img: '/arjun.png',
      champion: true,
    },
    { name: 'David Chen', rank: 3, xp: 4620, img: '/david.png' },
  ];

  return (
    <div className='p-8 space-y-8 bg-slate-50 min-h-screen'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>Global Leaderboard</h1>
          <p className='text-muted-foreground'>
            Top performers across all colleges this semester
          </p>
        </div>
        <div className='flex gap-4'>
          <Card className='p-4 text-center'>
            <p className='text-xs'>TOTAL XP</p>
            <p className='font-bold'>1,250</p>
          </Card>
          <Card className='p-4 text-center'>
            <p className='text-xs'>STREAK</p>
            <p className='font-bold'>🔥 12</p>
          </Card>
          <Card className='p-4 text-center'>
            <p className='text-xs'>RANK</p>
            <p className='font-bold'>#42</p>
          </Card>
        </div>
      </div>

      {/* Podium Section */}
      <div className='bg-[#1e293b] rounded-3xl p-12 flex justify-center items-end gap-12 text-white'>
        {topThree.map((user) => (
          <div key={user.rank} className='flex flex-col items-center space-y-4'>
            <div
              className={`relative ${user.rank === 1 ? 'scale-125 mb-8' : ''}`}
            >
              {user.rank === 1 && (
                <span className='absolute -top-6 left-1/2 -translate-x-1/2 text-2xl'>
                  👑
                </span>
              )}
              <Avatar className='h-20 w-20 border-4 border-yellow-500'>
                <AvatarImage src={user.img} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <Badge className='absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800'>
                {user.rank}
              </Badge>
            </div>
            <div className='text-center'>
              <p className='font-bold'>{user.name}</p>
              <Badge
                variant='secondary'
                className='bg-yellow-500/20 text-yellow-500'
              >
                {user.xp} XP
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RANK</TableHead>
              <TableHead>STUDENT NAME</TableHead>
              <TableHead>COURSE</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>PROGRESS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Map your data here */}
            <TableRow className='bg-blue-50/50 border-l-4 border-blue-600'>
              <TableCell className='font-bold'>#42</TableCell>
              <TableCell className='flex items-center gap-2'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage src='/me.png' />
                </Avatar>
                You{' '}
                <Badge variant='outline' className='text-green-600 bg-green-50'>
                  TOP 2%
                </Badge>
              </TableCell>
              <TableCell>Computer Science</TableCell>
              <TableCell className='font-bold'>1,250</TableCell>
              <TableCell>45%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
