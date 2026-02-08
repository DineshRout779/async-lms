import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Landmark, Rocket } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { loadUser } from '@/features/auth/authThunks';
import toast from 'react-hot-toast';

interface College {
  id: string;
  name: string;
}

export default function FacilitatorOnboarding() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await apiClient.get('/colleges');
        setColleges(res.data.data || res.data);
      } catch (err) {
        toast.error('Failed to load colleges');
      } finally {
        setLoading(false);
      }
    };
    fetchColleges();
  }, []);

  const toggleCollege = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one college');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/onboarding/facilitator-colleges', {
        college_ids: selectedIds,
      });
      toast.success('Onboarding complete!');
      await dispatch(loadUser());
      navigate('/pending-verification');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-background flex flex-col items-center justify-center p-6'>
      <div className='w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'>
        <div className='flex items-center gap-3 mb-8'>
          <div className='h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg'>
            <GraduationCap className='h-7 w-7' />
          </div>
          <div>
            <h1 className='text-2xl font-bold'>Facilitator Onboarding</h1>
            <p className='text-sm text-muted-foreground'>
              Step 1: Assign your colleges
            </p>
          </div>
        </div>

        <div className='bg-card border rounded-2xl p-6 shadow-sm space-y-6'>
          <div className='space-y-1.5'>
            <h2 className='text-lg font-semibold flex items-center gap-2'>
              <Landmark className='h-5 w-5 text-primary' />
              Select Managed Colleges
            </h2>
            <p className='text-sm text-muted-foreground'>
              Choose the colleges you will be managing. You can select multiple.
            </p>
          </div>

          <ScrollArea className='h-[300px] border rounded-lg p-4 bg-muted/30'>
            {loading ? (
              <div className='flex items-center justify-center h-full'>
                <p className='text-sm animate-pulse'>Loading colleges...</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {colleges.map((college) => (
                  <div
                    key={college.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
                      selectedIds.includes(college.id)
                        ? 'bg-primary/5 border-primary shadow-sm'
                        : ''
                    }`}
                  >
                    <input
                      type='checkbox'
                      id={college.id}
                      checked={selectedIds.includes(college.id)}
                      onChange={() => toggleCollege(college.id)}
                      className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                    />
                    <label
                      htmlFor={college.id}
                      className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1'
                    >
                      {college.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Button
            className='w-full py-6 text-lg rounded-xl shadow-xl hover:shadow-primary/25 transition-all group'
            onClick={handleSubmit}
            disabled={loading || isSubmitting || selectedIds.length === 0}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                Finish Setup
                <Rocket className='ml-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform' />
              </>
            )}
          </Button>
        </div>

        <p className='text-center text-xs text-muted-foreground'>
          Once assigned, an administrator will verify your profile within 24-48
          hours.
        </p>
      </div>
    </div>
  );
}
