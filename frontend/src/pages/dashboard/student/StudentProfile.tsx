import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Flame,
  Star,
  Award,
  Trophy,
  Zap,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '@/services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  degree?: string | null;
  year?: string | null;
  college_name?: string | null;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  badge_count: number;
}

interface UserBadge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  awarded_at: string;
}

interface ActivityEntry {
  source: string;
  points: number;
  created_at: string;
}

interface MyRank {
  rank: number;
  total_points: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatSource(source: string) {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^Capstone .+/, 'Capstone Submission');
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudentProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get<{ success: boolean; data: UserProfile }>('/users/profile'),
      apiClient.get<{ success: boolean; data: UserBadge[] }>('/users/badges'),
      apiClient.get<{ success: boolean; data: ActivityEntry[] }>(
        '/users/activity',
      ),
      apiClient.get<{
        success: boolean;
        data: { leaderboard: unknown[]; my_rank: MyRank | null };
      }>('/students/leaderboard/overall?limit=1'),
    ]).then(([profileRes, badgesRes, activityRes, rankRes]) => {
      if (profileRes.status === 'fulfilled')
        setProfile(profileRes.value.data.data);
      if (badgesRes.status === 'fulfilled')
        setBadges(badgesRes.value.data.data);
      if (activityRes.status === 'fulfilled')
        setActivity(activityRes.value.data.data);
      if (rankRes.status === 'fulfilled')
        setMyRank(rankRes.value.data.data.my_rank);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
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

  const subtitle = [
    profile.degree,
    profile.year ? `Batch ${profile.year}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className='p-6 max-w-5xl mx-auto space-y-6'>
      {/* ── Hero Card ───────────────────────────────────────────────────────── */}
      <Card className='p-8'>
        <div className='flex flex-col sm:flex-row items-start gap-6'>
          <Avatar className='h-24 w-24 shrink-0 border-4 border-slate-100'>
            <AvatarFallback className='bg-indigo-100 text-indigo-700 text-2xl font-bold'>
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className='flex-1 min-w-0'>
            <h1 className='text-3xl font-bold text-slate-900 truncate'>
              {profile.full_name}
            </h1>
            {subtitle && (
              <p className='text-muted-foreground mt-0.5'>{subtitle}</p>
            )}
            {profile.college_name && (
              <p className='text-sm text-slate-500'>{profile.college_name}</p>
            )}
            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              <Badge variant='secondary' className='capitalize'>
                {profile.role}
              </Badge>
              <span className='text-xs text-slate-400 flex items-center gap-1'>
                <Calendar className='h-3 w-3' /> Member since {memberSince}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Stats Strip ─────────────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
        <StatCard
          icon={<Star className='h-5 w-5 text-amber-500' />}
          value={profile.total_points.toLocaleString()}
          label='Total XP'
          color='text-amber-600'
        />
        <StatCard
          icon={<Flame className='h-5 w-5 text-orange-500' />}
          value={String(1)}
          label='Current Streak'
          color='text-orange-600'
        />
        <StatCard
          icon={<TrendingUp className='h-5 w-5 text-purple-500' />}
          value={
            profile.longest_streak > 0 ? `${profile.longest_streak}d` : '—'
          }
          label='Best Streak'
          color='text-purple-600'
        />
        <StatCard
          icon={<Trophy className='h-5 w-5 text-indigo-500' />}
          value={myRank ? `#${myRank.rank}` : '—'}
          label='Global Rank'
          color='text-indigo-600'
        />
        <StatCard
          icon={<Award className='h-5 w-5 text-rose-500' />}
          value={String(profile.badge_count)}
          label='Badges'
          color='text-rose-600'
        />
      </div>

      {/* ── Badges ──────────────────────────────────────────────────────────── */}
      {badges.length > 0 && (
        <section>
          <h2 className='text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2'>
            <Award className='h-5 w-5 text-rose-500' />
            Earned Badges
          </h2>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
            {badges.map((b) => (
              <Card
                key={b.id}
                className='p-4 flex flex-col items-center text-center gap-2'
              >
                <div className='h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl'>
                  {b.icon ?? '🏅'}
                </div>
                <p className='text-sm font-semibold text-slate-800 leading-tight'>
                  {b.name}
                </p>
                {b.description && (
                  <p className='text-xs text-slate-500 line-clamp-2'>
                    {b.description}
                  </p>
                )}
                <p className='text-xs text-slate-400'>
                  {timeAgo(b.awarded_at)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Activity ──────────────────────────────────────────────────── */}
      <section>
        <h2 className='text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2'>
          <Zap className='h-5 w-5 text-amber-500' />
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <Card className='p-8 text-center text-slate-400'>
            No activity recorded yet.
          </Card>
        ) : (
          <Card className='divide-y divide-slate-100'>
            {activity.map((entry, i) => (
              <div
                key={i}
                className='flex items-center justify-between px-5 py-3'
              >
                <div className='flex items-center gap-3'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500 shrink-0' />
                  <span className='text-sm text-slate-700'>
                    {formatSource(entry.source)}
                  </span>
                </div>
                <div className='flex items-center gap-4 shrink-0'>
                  <span className='text-sm font-semibold text-amber-600'>
                    +{entry.points} XP
                  </span>
                  <span className='text-xs text-slate-400 hidden sm:block'>
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

// ── StatCard sub-component ─────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <Card className='p-4 flex flex-col items-center text-center gap-1'>
      {icon}
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className='text-xs text-muted-foreground uppercase tracking-wide'>
        {label}
      </p>
    </Card>
  );
}
