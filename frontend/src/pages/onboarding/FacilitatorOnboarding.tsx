import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Landmark, Rocket } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { loadUser } from '@/features/auth/authThunks';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import Logo from '@/components/common/Logo';
import OnboardingExit from '@/components/common/OnboardingExit';

interface College {
  id: string;
  name: string;
}

export default function FacilitatorOnboarding() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomCollege, setShowCustomCollege] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCity, setCustomCity] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await apiClient.get('/colleges');
        setColleges(res.data.data || res.data);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load colleges'));
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
    if (selectedIds.length === 0 && !showCustomCollege) {
      toast.error('Please select at least one college or add a custom one');
      return;
    }

    if (showCustomCollege && (!customName.trim() || !customCity.trim())) {
      toast.error('Please provide custom college name and city');
      return;
    }

    try {
      setIsSubmitting(true);
      let finalCollegeIds = [...selectedIds];

      // Create custom college if provided
      if (showCustomCollege) {
        const name = customName.trim();
        const city = customCity.trim();
        const words = name.split(/\s+/);
        const shortCode =
          words.length > 1
            ? words
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .substring(0, 5)
            : name.substring(0, 5).toUpperCase();

        const collegeRes = await apiClient.post('/colleges', {
          name,
          city,
          short_code: shortCode,
          state: '',
        });
        const newCollegeId = collegeRes.data.data.id;
        finalCollegeIds.push(newCollegeId);
      }

      await apiClient.post('/onboarding/facilitator-colleges', {
        college_ids: finalCollegeIds,
      });
      toast.success('Onboarding complete!');
      await dispatch(loadUser());
      navigate('/pending-verification');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Submission failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className='min-h-screen w-full relative bg-cover bg-center overflow-x-hidden flex flex-col items-center justify-center p-3.5 sm:p-6 py-8 sm:py-12'
      style={{
        backgroundImage: 'url("/bg-students.jpg")',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Blue tinted overlay */}
      <div className='absolute inset-0 bg-[#344499]/75 backdrop-blur-[2px]' />

      <OnboardingExit />

      <div className='flex flex-col items-center mb-4 sm:mb-6 relative z-10'>
        <Logo className='h-12 w-12 sm:h-14 sm:w-14 mb-2' />
        <span className='text-white font-bold text-base sm:text-lg tracking-wider'>
          CodeGuru
        </span>
      </div>

      <div className='relative z-10 w-full max-w-lg space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-w-0'>
        <div className='flex items-center gap-3 mb-4 sm:mb-8'>
          <div className='h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shrink-0'>
            <GraduationCap className='h-6 w-6 sm:h-7 sm:w-7' />
          </div>
          <div className='min-w-0 flex-1'>
            <h1 className='text-xl sm:text-2xl font-bold text-white tracking-tight'>
              Facilitator Onboarding
            </h1>
            <p className='text-xs sm:text-sm text-slate-200'>
              Step 1: Assign your colleges
            </p>
          </div>
        </div>

        <div className='bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6 min-w-0'>
          <div className='space-y-1'>
            <h2 className='text-base sm:text-lg font-semibold flex items-center gap-2 text-slate-800'>
              <Landmark className='h-4 sm:h-5 w-4 sm:h-5 text-primary shrink-0' />
              Select Managed Colleges
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground'>
              Choose the colleges you will be managing. You can select multiple.
            </p>
          </div>

          <ScrollArea className='h-[200px] sm:h-[250px] border border-slate-200/80 rounded-xl p-3 sm:p-4 bg-muted/30'>
            {loading ? (
              <div className='flex items-center justify-center h-full'>
                <p className='text-xs sm:text-sm text-slate-500 animate-pulse'>Loading colleges...</p>
              </div>
            ) : (
              <div className='space-y-2 sm:space-y-3'>
                {colleges.map((college) => (
                  <div
                    key={college.id}
                    className={`flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted/50 ${
                      selectedIds.includes(college.id)
                        ? 'bg-primary/5 border-primary shadow-xs'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <input
                      type='checkbox'
                      id={college.id}
                      checked={selectedIds.includes(college.id)}
                      onChange={() => toggleCollege(college.id)}
                      className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0'
                    />
                    <label
                      htmlFor={college.id}
                      className='text-xs sm:text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1'
                    >
                      {college.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className='space-y-3 sm:space-y-4'>
            {!showCustomCollege ? (
              <button
                type='button'
                onClick={() => setShowCustomCollege(true)}
                className='text-xs font-semibold text-primary hover:underline flex items-center gap-1 min-h-[36px]'
              >
                + My college is not listed
              </button>
            ) : (
              <div className='p-3.5 sm:p-4 border border-dashed border-slate-300 rounded-xl bg-muted/20 space-y-3 animate-in zoom-in-95 duration-200'>
                <div className='flex items-center justify-between'>
                  <p className='text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    Add Custom College
                  </p>
                  <button
                    type='button'
                    onClick={() => setShowCustomCollege(false)}
                    className='text-xs text-destructive hover:underline min-h-[28px]'
                  >
                    Cancel
                  </button>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <label className='text-[10px] sm:text-[11px] font-bold text-muted-foreground'>
                      College Name
                    </label>
                    <input
                      type='text'
                      placeholder='e.g. Stanford University'
                      className='w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]'
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] sm:text-[11px] font-bold text-muted-foreground'>
                      City
                    </label>
                    <input
                      type='text'
                      placeholder='e.g. Palo Alto'
                      className='w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]'
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            className='w-full py-3.5 sm:py-6 text-base sm:text-lg font-bold rounded-xl shadow-xl hover:shadow-primary/25 transition-all group min-h-[48px]'
            onClick={handleSubmit}
            disabled={
              loading ||
              isSubmitting ||
              (selectedIds.length === 0 && !showCustomCollege)
            }
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                Finish Setup
                <Rocket className='ml-2 h-4 sm:h-5 w-4 sm:w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform' />
              </>
            )}
          </Button>
        </div>

        <p className='text-center text-xs text-slate-200 px-2'>
          Once assigned, an administrator will verify your profile within 24-48
          hours.
        </p>
      </div>
    </div>
  );
}
