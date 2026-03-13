import { useEffect, useState } from 'react';
import { Loader2, BookOpen, Flame, Star, CheckCircle2, Building2, GraduationCap, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import apiClient from '@/services/api';

interface SubjectRow {
  id: string;
  name: string;
  completed_subtopics: number;
  total_subtopics: number;
  progress_percent: number;
}

interface StudentStats {
  enrolled_subjects: number;
  completed_subtopics: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
}

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  created_at: string;
  degree: string | null;
  batch: number | null;
  college_name: string | null;
  college_short_name: string | null;
  stats: StudentStats;
  subjects: SubjectRow[];
}

interface Props {
  studentId: string | null;
  apiPrefix: 'admin' | 'facilitator';
  onClose: () => void;
}

export default function StudentProfileDialog({ studentId, apiPrefix, onClose }: Props) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setProfile(null);
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: StudentProfile }>(`/${apiPrefix}/students/${studentId}`)
      .then((res) => setProfile(res.data.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [studentId, apiPrefix]);

  const initials = profile?.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?';

  return (
    <Dialog open={!!studentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='h-7 w-7 animate-spin text-blue-500' />
          </div>
        )}

        {!loading && profile && (
          <div className='space-y-5'>
            {/* Header */}
            <div className='flex items-center gap-4'>
              <div className='w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0'>
                {initials}
              </div>
              <div className='min-w-0'>
                <p className='font-bold text-lg text-slate-900 truncate'>{profile.full_name}</p>
                <p className='text-sm text-slate-500 truncate'>{profile.email}</p>
                <Badge
                  className={`mt-1 text-[10px] ${
                    profile.is_verified
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  {profile.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>

            {/* Info grid */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex items-start gap-2 rounded-lg bg-slate-50 p-3'>
                <Building2 size={15} className='text-slate-400 mt-0.5 shrink-0' />
                <div>
                  <p className='text-[10px] font-semibold uppercase text-slate-400 tracking-wider'>College</p>
                  <p className='text-sm font-semibold text-slate-800'>
                    {profile.college_short_name || 'N/A'}
                  </p>
                  <p className='text-[11px] text-slate-500 leading-tight'>{profile.college_name}</p>
                </div>
              </div>
              <div className='flex items-start gap-2 rounded-lg bg-slate-50 p-3'>
                <GraduationCap size={15} className='text-slate-400 mt-0.5 shrink-0' />
                <div>
                  <p className='text-[10px] font-semibold uppercase text-slate-400 tracking-wider'>Degree</p>
                  <p className='text-sm font-semibold text-slate-800'>{profile.degree || 'N/A'}</p>
                  {profile.batch && (
                    <p className='text-[11px] text-slate-500'>Batch {profile.batch}</p>
                  )}
                </div>
              </div>
              <div className='flex items-start gap-2 rounded-lg bg-slate-50 p-3 col-span-2'>
                <CalendarDays size={15} className='text-slate-400 mt-0.5 shrink-0' />
                <div>
                  <p className='text-[10px] font-semibold uppercase text-slate-400 tracking-wider'>Joined</p>
                  <p className='text-sm font-semibold text-slate-800'>
                    {new Date(profile.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              {[
                { icon: BookOpen, label: 'Subjects', value: profile.stats.enrolled_subjects, color: 'text-blue-500' },
                { icon: CheckCircle2, label: 'Completed', value: profile.stats.completed_subtopics, color: 'text-emerald-500' },
                { icon: Star, label: 'XP Points', value: profile.stats.total_points, color: 'text-yellow-500' },
                { icon: Flame, label: 'Streak', value: `${profile.stats.current_streak}d`, color: 'text-orange-500' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className='flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm'>
                  <Icon size={18} className={color} />
                  <p className='text-lg font-bold text-slate-900'>{value}</p>
                  <p className='text-[10px] text-slate-400 uppercase tracking-wide'>{label}</p>
                </div>
              ))}
            </div>

            {/* Enrolled subjects */}
            {profile.subjects.length > 0 && (
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>
                  Enrolled Subjects
                </p>
                <div className='space-y-2.5'>
                  {profile.subjects.map((s) => (
                    <div key={s.id} className='space-y-1'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='font-medium text-slate-700 truncate max-w-[70%]'>{s.name}</span>
                        <span className='text-xs font-bold text-indigo-600'>{s.progress_percent}%</span>
                      </div>
                      <Progress value={s.progress_percent} className='h-1.5 bg-indigo-50' />
                      <p className='text-[10px] text-slate-400'>
                        {s.completed_subtopics} / {s.total_subtopics} subtopics
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.subjects.length === 0 && (
              <p className='text-center text-sm text-slate-400 py-4'>
                No subjects enrolled yet.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
