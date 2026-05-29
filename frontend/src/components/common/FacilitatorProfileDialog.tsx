import { useEffect, useState } from 'react';
import { Loader2, Building2, BookOpen, CalendarDays, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/services/api';

interface College {
  id: string;
  name: string;
  short_code: string;
}

interface Subject {
  id: string;
  name: string;
}

interface FacilitatorProfile {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  created_at: string;
  colleges: College[];
  subjects: Subject[];
}

interface Props {
  facilitatorId: string | null;
  onClose: () => void;
}

export default function FacilitatorProfileDialog({ facilitatorId, onClose }: Props) {
  const [profile, setProfile] = useState<FacilitatorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facilitatorId) return;
    setProfile(null);
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: FacilitatorProfile }>(`/admin/facilitators/${facilitatorId}`)
      .then((res) => setProfile(res.data.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [facilitatorId]);

  const initials =
    profile?.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?';

  return (
    <Dialog open={!!facilitatorId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Facilitator Profile</DialogTitle>
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
              <div className='w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0'>
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
                  {profile.is_verified ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </div>

            {/* Joined */}
            <div className='flex items-start gap-2 rounded-lg bg-slate-50 p-3'>
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

            {/* Stats */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm'>
                <Building2 size={18} className='text-blue-500' />
                <p className='text-lg font-bold text-slate-900'>{profile.colleges.length}</p>
                <p className='text-[10px] text-slate-400 uppercase tracking-wide'>Colleges</p>
              </div>
              <div className='flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm'>
                <BookOpen size={18} className='text-indigo-500' />
                <p className='text-lg font-bold text-slate-900'>{profile.subjects.length}</p>
                <p className='text-[10px] text-slate-400 uppercase tracking-wide'>Subjects</p>
              </div>
            </div>

            {/* Colleges */}
            <div>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1'>
                <ShieldCheck size={12} /> Assigned Colleges
              </p>
              {profile.colleges.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {profile.colleges.map((c) => (
                    <div key={c.id} className='rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5'>
                      <p className='text-sm font-semibold text-slate-800'>{c.short_code}</p>
                      <p className='text-[11px] text-slate-500'>{c.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-slate-400'>No colleges assigned.</p>
              )}
            </div>

            {/* Subjects */}
            <div>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1'>
                <BookOpen size={12} /> Subjects
              </p>
              {profile.subjects.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {profile.subjects.map((s) => (
                    <Badge key={s.id} className='bg-indigo-50 text-indigo-700'>
                      {s.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-slate-400'>No subjects assigned.</p>
              )}
            </div>
          </div>
        )}

        {!loading && !profile && facilitatorId && (
          <p className='text-center text-sm text-slate-400 py-8'>Failed to load profile.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
