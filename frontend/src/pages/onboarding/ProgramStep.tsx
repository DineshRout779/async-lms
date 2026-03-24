import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { usePublishedSubjects } from '@/hooks/queries/useOnboarding';

export default function SubjectStep() {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  // React Query — cached, shared with MyCourses if already fetched
  const { data: subjects = [], isLoading } = usePublishedSubjects();

  const toggleSubject = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    try {
      setSubmitting(true);
      await apiClient.post('/onboarding/subjects', { subjectIds: selected });
      navigate(`/dashboard/${user?.role}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='bg-accent'>
      <div className='max-w-120 mx-auto h-screen flex justify-center items-center'>
        <div className='w-full space-y-4 bg-white p-10 rounded-md'>
          <Stepper current='subject' />

          <div>
            <h2 className='text-xl font-semibold'>What do you want to learn?</h2>
            <p className='text-sm text-muted-foreground'>Select at least one subject</p>
          </div>

          {isLoading ? (
            <div className='flex justify-center py-6'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-3'>
              {subjects.map((subject) => {
                const isSelected = selected.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={cn(
                      'flex items-center cursor-pointer justify-between p-4 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <span className='font-medium'>{subject.name}</span>
                    {isSelected && <Check className='h-5 w-5 text-accent' />}
                  </button>
                );
              })}
            </div>
          )}

          <div className='flex gap-2'>
            <Button
              variant='ghost'
              className='flex-1'
              onClick={() => navigate('/onboarding/batch')}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              variant='accent'
              className='flex-1'
              onClick={handleContinue}
              disabled={submitting || selected.length === 0}
            >
              {submitting ? 'Finalizing...' : 'Finish Onboarding'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
