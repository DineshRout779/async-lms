import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, Users, Award, Medal, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useOverallLeaderboard,
  useWeeklyLeaderboard,
  useCollegeLeaderboard,
} from '@/hooks/queries/useLeaderboard';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  email?: string;
  college_name?: string;
  total_points: number;
  rank: number;
}

interface MyRank {
  rank: number;
  total_points: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className='h-5 w-5 text-yellow-500' />;
  if (rank === 2) return <Medal className='h-5 w-5 text-slate-400' />;
  if (rank === 3) return <Medal className='h-5 w-5 text-amber-600' />;
  return <span className='text-sm font-bold text-slate-500'>#{rank}</span>;
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const LeaderboardTable = ({
  data = [],
  myRank,
  isLoading,
}: {
  data?: LeaderboardEntry[];
  myRank?: MyRank | null;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600' />
          <p className='text-slate-500'>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <Trophy className='mx-auto mb-4 h-16 w-16 text-slate-300' />
          <p className='text-slate-500'>No data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {myRank && (
        <Card className='border-2 border-indigo-500 bg-linear-to-r from-indigo-50 to-purple-50 p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white'>
                {getRankIcon(myRank.rank)}
              </div>
              <div>
                <p className='text-sm font-medium text-slate-700'>Your Rank</p>
                <p className='text-2xl font-bold text-indigo-600'>#{myRank.rank}</p>
              </div>
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium text-slate-700'>Total Points</p>
              <p className='text-2xl font-bold text-slate-900'>{myRank.total_points}</p>
            </div>
          </div>
        </Card>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        {data.slice(0, 3).map((entry, index) => (
          <Card
            key={entry.user_id}
            className={`p-6 text-center ${
              index === 0
                ? 'border-2 border-yellow-400 bg-linear-to-b from-yellow-50 to-white'
                : index === 1
                ? 'border-2 border-slate-400 bg-linear-to-b from-slate-50 to-white'
                : 'border-2 border-amber-400 bg-linear-to-b from-amber-50 to-white'
            }`}
          >
            <div className='mb-4 flex justify-center'>{getRankIcon(entry.rank)}</div>
            <Avatar className='mx-auto mb-3 h-16 w-16'>
              <AvatarFallback className='bg-indigo-100 text-indigo-700'>
                {getInitials(entry.full_name)}
              </AvatarFallback>
            </Avatar>
            <h3 className='mb-1 font-bold text-slate-900'>{entry.full_name}</h3>
            {entry.college_name && (
              <p className='mb-2 text-xs text-slate-500'>{entry.college_name}</p>
            )}
            <p className='text-2xl font-bold text-indigo-600'>
              {entry.total_points}
              <span className='ml-1 text-sm text-slate-500'>pts</span>
            </p>
          </Card>
        ))}
      </div>

      {data.length > 3 && (
        <Card className='overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'>Rank</th>
                  <th className='px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'>Student</th>
                  {data[0]?.college_name && (
                    <th className='px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'>College</th>
                  )}
                  <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600'>Points</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 bg-white'>
                {data.slice(3).map((entry) => (
                  <tr key={entry.user_id} className='transition-colors hover:bg-slate-50'>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <span className='text-sm font-medium text-slate-700'>#{entry.rank}</span>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarFallback className='bg-indigo-100 text-indigo-700'>
                            {getInitials(entry.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className='font-medium text-slate-900'>{entry.full_name}</p>
                      </div>
                    </td>
                    {entry.college_name && (
                      <td className='whitespace-nowrap px-6 py-4 text-sm text-slate-600'>
                        {entry.college_name}
                      </td>
                    )}
                    <td className='whitespace-nowrap px-6 py-4 text-right'>
                      <span className='font-semibold text-indigo-600'>{entry.total_points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState<'overall' | 'weekly' | 'college'>('overall');

  const { data: overall, isLoading: loadingOverall } = useOverallLeaderboard();
  const { data: weekly, isLoading: loadingWeekly } = useWeeklyLeaderboard();
  const { data: college, isLoading: loadingCollege } = useCollegeLeaderboard();

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <Trophy className='h-8 w-8 text-indigo-600' />
            <h1 className='text-3xl font-bold text-slate-900'>Leaderboard</h1>
          </div>
          <p className='text-slate-600'>Compete with fellow students and climb to the top!</p>
        </div>

        <div className='mb-8 grid gap-4 md:grid-cols-3'>
          <Card className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='rounded-full bg-indigo-100 p-3'>
                <TrendingUp className='h-6 w-6 text-indigo-600' />
              </div>
              <div>
                <p className='text-sm text-slate-600'>Overall Rank</p>
                <p className='text-2xl font-bold text-slate-900'>
                  {overall?.my_rank ? `#${overall.my_rank.rank}` : '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='rounded-full bg-green-100 p-3'>
                <Award className='h-6 w-6 text-green-600' />
              </div>
              <div>
                <p className='text-sm text-slate-600'>This Week</p>
                <p className='text-2xl font-bold text-slate-900'>
                  {weekly?.my_rank ? `#${weekly.my_rank.rank}` : '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='rounded-full bg-purple-100 p-3'>
                <Users className='h-6 w-6 text-purple-600' />
              </div>
              <div>
                <p className='text-sm text-slate-600'>College Rank</p>
                <p className='text-2xl font-bold text-slate-900'>
                  {college?.my_rank ? `#${college.my_rank.rank}` : '-'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className='mb-6 grid w-full grid-cols-3'>
            <TabsTrigger value='overall'>
              <Trophy className='mr-2 h-4 w-4' />Overall
            </TabsTrigger>
            <TabsTrigger value='weekly'>
              <TrendingUp className='mr-2 h-4 w-4' />This Week
            </TabsTrigger>
            <TabsTrigger value='college'>
              <Users className='mr-2 h-4 w-4' />My College
            </TabsTrigger>
          </TabsList>

          <TabsContent value='overall'>
            <LeaderboardTable data={overall?.leaderboard} myRank={overall?.my_rank} isLoading={loadingOverall} />
          </TabsContent>
          <TabsContent value='weekly'>
            <LeaderboardTable data={weekly?.leaderboard} myRank={weekly?.my_rank} isLoading={loadingWeekly} />
          </TabsContent>
          <TabsContent value='college'>
            <LeaderboardTable data={college?.leaderboard} myRank={college?.my_rank} isLoading={loadingCollege} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
