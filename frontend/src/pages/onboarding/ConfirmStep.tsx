import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { Home } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { loadUser } from '@/features/auth/authThunks';
import { useState, useEffect } from 'react';
import apiClient from '@/services/api';

interface StudentProfile {
  college_name: string;
  year: number;
  current_academic_year: string;
}

interface Subject {
  name: string;
}

export default function ConfirmStep() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, subRes] = await Promise.all([
          apiClient.get('/users/profile'),
          apiClient.get('/users/subjects'),
        ]);
        setProfile(profRes.data.data);
        setSubjects(subRes.data.data);
      } catch {
        // profile/subjects remain null — page renders with fallback values
      }
    };
    fetchData();
  }, []);


  const handleConfirm = async () => {
    try {
      setLoading(true);
      // Refresh user from backend so onboarding_step = 'done' is in Redux
      await dispatch(loadUser()).unwrap();
      navigate('/onboarding/success');
    } catch {
      // loadUser rejected — PrivateRoute will redirect based on token state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
    >
      <div className='w-full max-w-[480px] bg-white p-5 sm:px-12 sm:py-10 rounded-xl sm:rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col min-h-[350px] sm:min-h-[500px]'>
        <div className='flex-1'>
          <Stepper current='confirm' />

          <div className='mb-5 sm:mb-8 mt-4 sm:mt-6 text-center'>
            <h2 className='text-base sm:text-2xl font-bold text-[#344499]'>
              Review your details
            </h2>
            <p className='text-[8px] sm:text-[13px] text-slate-400 font-medium mt-0.5 sm:mt-1.5 tracking-wide'>
              Please verify your information before proceeding
            </p>
          </div>

          <div className='border border-slate-200 rounded-lg sm:rounded-xl overflow-hidden mb-5 sm:mb-8'>
            {/* Personal Information */}
            <div className='p-3 sm:p-5 border-b border-slate-200 bg-white'>
              <div className='flex justify-between items-center mb-2 sm:mb-4'>
                <h3 className='text-[9px] sm:text-[13px] font-semibold text-[#344499] tracking-wide'>
                  Personal Information
                </h3>
                <Home className='w-2.5 h-2.5 sm:w-4 sm:h-4 text-slate-500' />
              </div>
              <div className='space-y-1.5 sm:space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-[8px] sm:text-[12px] text-slate-400 font-medium'>
                    Name
                  </span>
                  <span className='text-[8px] sm:text-[12px] text-slate-800 font-semibold'>
                    {user?.full_name || 'John Doe'}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-[8px] sm:text-[12px] text-slate-400 font-medium'>
                    Email
                  </span>
                  <span className='text-[8px] sm:text-[12px] text-slate-800 font-semibold'>
                    {user?.email || 'john.doe@example.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className='p-3 sm:p-5 bg-white'>
              <div className='flex justify-between items-center mb-2 sm:mb-4'>
                <h3 className='text-[9px] sm:text-[13px] font-semibold text-[#344499] tracking-wide'>
                  Academic Information
                </h3>
                <Home className='w-2.5 h-2.5 sm:w-4 sm:h-4 text-slate-500' />
              </div>
              <div className='space-y-1.5 sm:space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-[8px] sm:text-[12px] text-slate-400 font-medium'>
                    College
                  </span>
                  <span className='text-[8px] sm:text-[12px] text-slate-800 font-semibold text-right'>
                    {profile ? profile.college_name : 'Loading...'}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-[8px] sm:text-[12px] text-slate-400 font-medium'>
                    Program
                  </span>
                  <span className='text-[8px] sm:text-[12px] text-slate-800 font-semibold text-right'>
                    {subjects.length > 0
                      ? subjects.map((s) => s.name).join(', ')
                      : 'Loading...'}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-[8px] sm:text-[12px] text-slate-400 font-medium'>
                    Batch
                  </span>
                  <span className='text-[8px] sm:text-[12px] text-slate-800 font-semibold text-right'>
                    {profile ? (profile.current_academic_year || 'N/A') : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className='flex flex-col gap-2 sm:gap-3 mt-2 sm:mt-4'>
          <Button
            type='button'
            className='w-full bg-[#344499] hover:bg-[#2c3983] text-white h-8 sm:h-11 text-[10px] sm:text-[14px] font-semibold tracking-wide rounded-md sm:rounded-lg shadow-md transition-colors'
            disabled={loading}
            onClick={handleConfirm}
          >
            Confirm & Save
          </Button>
          <Button
            variant='outline'
            onClick={() => navigate('/onboarding/college')}
            type='button'
            className='w-full border-slate-300 text-[#344499] hover:bg-slate-50 hover:text-blue-900 h-8 sm:h-11 text-[9px] sm:text-[13px] font-semibold tracking-wide rounded-md sm:rounded-lg transition-colors'
          >
            Edit details
          </Button>
        </div>
      </div>
    </div>
  );
}
