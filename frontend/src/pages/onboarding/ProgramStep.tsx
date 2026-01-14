import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

interface Subject {
  id: number;
  name: string;
}

export default function SubjectStep() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    apiClient.get('/subjects').then((res) => setSubjects(res.data.data));
  }, []);

  const toggleSubject = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    try {
      setLoading(true);
      await apiClient.post('/onboarding/subjects', { subjectIds: selected });
      navigate(`/dashboard/${user?.role}`); // Onboarding complete!
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-md mx-auto h-screen flex justify-center items-center px-6'>
      <div className='w-full space-y-6'>
        <Stepper current='subject' />
        <div className='text-center'>
          <h2 className='text-xl font-semibold'>What do you want to learn?</h2>
          <p className='text-sm text-muted-foreground'>
            Select at least one subject
          </p>
        </div>

        <div className='grid grid-cols-1 gap-3'>
          {subjects.map((subject) => {
            const isSelected = selected.includes(subject.id);
            return (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.id)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className='font-medium'>{subject.name}</span>
                {isSelected && <Check className='h-5 w-5 text-primary' />}
              </button>
            );
          })}
        </div>

        <Button
          className='w-full'
          size='lg'
          onClick={handleContinue}
          disabled={loading || selected.length === 0}
        >
          {loading ? 'Finalizing...' : 'Finish Onboarding'}
        </Button>
      </div>
    </div>
  );
}
