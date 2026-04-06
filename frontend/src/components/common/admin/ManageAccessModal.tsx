import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';

export const ManageAccessModal = ({
  open,
  onOpenChange,
  courseId,
  courseName,
}: any) => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchAccess();
  }, [open]);

  const fetchAccess = async () => {
    setLoading(true);
    try {
      // Calls the new assignment endpoint
      const res = await apiClient.get(`/colleges/assignment/${courseId}`);
      if (res.data.success) setColleges(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollege = async (collegeId: string) => {
    try {
      await apiClient.post(`/colleges/toggle-assignment`, {
        courseId,
        collegeId,
      });
      // Optimistic UI update
      setColleges((prev) =>
        prev.map((c) =>
          c.id === collegeId ? { ...c, assigned: !c.assigned } : c
        )
      );
    } catch {
      // optimistic toggle already applied — no UI revert needed
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-137.5 p-8'>
        <h2 className='text-2xl font-bold text-[#1e293b]'>{courseName}</h2>
        <p className='text-sm text-slate-500 mb-4'>
          Manage institutional access for this course.
        </p>
        <div className='space-y-3 mt-4 max-h-96 overflow-y-auto pr-2'>
          {loading ? (
            <div className='text-center py-4 text-slate-400'>Loading...</div>
          ) : (
            colleges.map((c) => (
              <div
                key={c.id}
                className='flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors'
              >
                <div>
                  <p className='font-bold text-slate-800'>{c.name}</p>
                  <p className='text-xs text-slate-400 uppercase tracking-wider'>
                    {c.short_code}
                  </p>
                </div>
                <Switch
                  checked={c.assigned}
                  onCheckedChange={() => toggleCollege(c.id)}
                />
              </div>
            ))
          )}
        </div>
        <Button
          className='w-full mt-6 bg-black hover:bg-slate-800 h-12 rounded-xl'
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};
