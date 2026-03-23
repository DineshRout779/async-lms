import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { Home } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { useState, useEffect } from 'react';
import apiClient from '@/services/api';

interface StudentProfile {
  college_name: string;
  year: number;
}

interface Subject {
  name: string;
}

export default function ConfirmStep() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
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
      } catch (err) {
        console.error('Failed to load profile for confirmation', err);
      }
    };
    fetchData();
  }, []);

  // Format batch safely
  const formatBatch = (year: number) => {
    if (!year) return 'N/A';
    if (year === 1) return '2024-2025';
    if (year === 2) return '2023-2024';
    if (year === 3) return '2022-2023';
    if (year === 4) return '2021-2022';
    return `${year}th Year`;
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      // Wait for 600ms to mock saving to DB
      await new Promise(r => setTimeout(r, 600));
      navigate('/onboarding/success');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
      style={{ fontFamily: "'Noto Sans', sans-serif" }}
    >
      <div className='w-full max-w-[480px] bg-white p-8 sm:px-12 sm:py-10 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col min-h-[500px]'>
        
        <div className="flex-1">
          <Stepper current='confirm' />

          <div className="mb-8 mt-6 text-center">
            <h2 className='text-[22px] font-extrabold text-[#344499]'>Review your details</h2>
            <p className="text-[12px] text-slate-400 font-medium mt-1.5 tracking-wide">Please verify your information before proceeding</p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            {/* Personal Information */}
            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[13px] font-extrabold text-[#344499] tracking-wide">Personal Information</h3>
                <Home className="w-4 h-4 text-slate-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-400 font-medium">Name</span>
                  <span className="text-[12px] text-slate-800 font-semibold">{user?.full_name || 'John Doe'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-400 font-medium">Email</span>
                  <span className="text-[12px] text-slate-800 font-semibold">{user?.email || 'john.doe@example.com'}</span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="p-5 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[13px] font-extrabold text-[#344499] tracking-wide">Academic Information</h3>
                <Home className="w-4 h-4 text-slate-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-400 font-medium">College</span>
                  <span className="text-[12px] text-slate-800 font-semibold">{profile ? profile.college_name : 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-400 font-medium">Program</span>
                  <span className="text-[12px] text-slate-800 font-semibold">{subjects.length > 0 ? subjects.map(s => s.name).join(', ') : 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-400 font-medium">Batch</span>
                  <span className="text-[12px] text-slate-800 font-semibold">{profile ? formatBatch(profile.year) : 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <Button
            type="button"
            className="w-full bg-[#344499] hover:bg-[#2c3983] text-white h-11 text-[14px] font-extrabold tracking-wide rounded-lg shadow-md transition-colors"
            disabled={loading}
            onClick={handleConfirm}
          >
            Confirm & Save
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/onboarding/college')}
            type="button"
            className="w-full border-slate-300 text-[#344499] hover:bg-slate-50 h-11 text-[13px] font-extrabold tracking-wide rounded-lg transition-colors"
          >
            Edit details
          </Button>
        </div>

      </div>
    </div>
  );
}
