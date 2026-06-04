import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { usePublishedSubjects } from '@/hooks/queries/useOnboarding';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProgramStep() {
  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // React Query — cached, shared with MyCourses if already fetched
  const { data: subjects = [], isLoading } = usePublishedSubjects();

  useEffect(() => {
    apiClient.get('/users/subjects').then((res) => {
      const saved = res.data.data;
      if (saved?.length > 0) setSelected(saved[0].id.toString());
    }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    if (!selected) return;

    try {
      setSubmitting(true);
      await apiClient.post('/onboarding/subjects', {
        subjectIds: [selected],
      });
      navigate('/onboarding/confirm');
    } catch {
      // navigation does not occur — user stays on step
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
    >
      <div className='w-full max-w-[480px] bg-white p-8 sm:px-12 sm:py-10 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col min-h-[500px]'>
        
        <div className="flex-1">
          <Stepper current='program' />

          <div className="mb-8 mt-6">
            <h2 className='text-2xl font-bold text-[#344499]'>Select your program</h2>
            <p className="text-[13px] text-slate-400 font-medium mt-1.5 leading-relaxed tracking-wide">Choose your learning track</p>
          </div>

          <div className='space-y-5 w-full'>
            <div className='w-full'>
              <label className="text-[13px] font-semibold text-[#344499] tracking-wide mb-1.5 block">
                Program / Course
              </label>
              <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
                <SelectTrigger className='w-full h-11 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 focus:ring-[#344499] focus:border-[#344499] shadow-sm'>
                  <SelectValue placeholder={isLoading ? 'Loading programs...' : 'Select your program'} />
                </SelectTrigger>
                <SelectContent className='w-full'>
                  {subjects.length > 0 ? (
                    subjects.map((sub: { id: number; name: string }) => (
                       <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                    ))
                  ) : (
                    <>
                       <SelectItem value='a5f1dc34-297c-47b2-841f-fd1ecf3303d8'>Full Stack Web Development</SelectItem>
                       <SelectItem value='b5f1dc34-297c-47b2-841f-fd1ecf3303d9'>Data Science &amp; Machine Learning</SelectItem>
                       <SelectItem value='c5f1dc34-297c-47b2-841f-fd1ecf3303d0'>Cloud Computing &amp; DevOps</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-[#fffbeb] border-l-[3px] border-[#f59e0b] p-3.5 rounded-r-md mt-8 shadow-sm">
              <p className="text-[11px] font-medium text-slate-800 tracking-wide">You can change this after onboarding</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-10 pt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            type="button"
            className="bg-[#f8faff] text-[#344499] hover:bg-[#eff4ff] hover:text-[#2c3983] px-9 h-11 text-[14px] font-semibold tracking-wide rounded-lg transition-colors"
          >
            Back
          </Button>
          <Button
            type="button"
            className="bg-[#344499] hover:bg-[#2c3983] text-white px-9 h-11 text-[14px] font-semibold tracking-wide rounded-lg shadow-md transition-colors"
            disabled={submitting || !selected}
            onClick={handleContinue}
          >
            {submitting ? 'Saving...' : 'Continue'}
          </Button>
        </div>

      </div>
    </div>
  );
}
