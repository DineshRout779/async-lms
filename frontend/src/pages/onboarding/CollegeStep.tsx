import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { Info } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { loadUser } from '@/features/auth/authThunks';
import { useColleges } from '@/hooks/queries/useOnboarding';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CollegeStep() {
  const [submitting, setSubmitting] = useState(false);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [customCollegeAddress, setCustomCollegeAddress] = useState('');

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isOtherSelected = collegeId === 'OTHER';

  // React Query — cached, no manual loading state needed
  const { data: collegeList = [], isLoading } = useColleges();

  // Pre-fill previously selected college once list is loaded
  useEffect(() => {
    if (!collegeList.length) return;
    dispatch(loadUser())
      .unwrap()
      .then((freshUser) => {
        if (freshUser?.college_id) {
          const existing = collegeList.find(
            (c) => c.id.toString() === freshUser.college_id!.toString(),
          );
          if (existing) setCollegeId(existing.id.toString());
        }
      })
      .catch(() => {});
  }, [collegeList, dispatch]);

  const handleContinue = async () => {
    if (!collegeId) return;
    try {
      setSubmitting(true);
      let finalCollegeId = collegeId;

      if (collegeId === 'OTHER') {
        const name = customCollegeName.trim();
        const city = customCollegeAddress.trim();
        const words = name.split(/\s+/);
        const shortCode = words.length > 1 
          ? words.map(w => w[0]).join('').toUpperCase().substring(0, 5)
          : name.substring(0, 5).toUpperCase();

        const createRes = await apiClient.post('/colleges', {
          name,
          city,
          short_code: shortCode,
          state: '',
        });
        // FIX: access nested data object from backend response
        finalCollegeId = createRes.data.data.id;
      }

      const res = await apiClient.post('/onboarding/college', {
        college_id: finalCollegeId,
      });

      if (res.status === 200 || res.status === 201) {
        navigate(`/onboarding/${res.data.next_step}`);
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Failed to save college choice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
    >
      <div className='w-full max-w-[480px] bg-white p-5 sm:px-12 sm:py-10 rounded-xl sm:rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col min-h-[350px] sm:min-h-[500px]'>
        
        <div className="flex-1">
          <Stepper current='college' />

          <div className="mb-5 sm:mb-8 mt-4 sm:mt-6">
            <h2 className='text-base sm:text-2xl font-bold text-[#344499]'>Select your college</h2>
            <p className="text-[8px] sm:text-[13px] text-slate-400 font-medium mt-0.5 sm:mt-1.5 leading-relaxed tracking-wide">Required for mapping batches and cohorts.</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
            <label className="text-[9px] sm:text-[13px] font-semibold text-[#344499] tracking-wide">College name</label>
            <Select value={collegeId || ''} onValueChange={setCollegeId} disabled={isLoading || submitting}>
              <SelectTrigger className='w-full h-8 sm:h-11 text-[9px] sm:text-[13px] text-slate-500 bg-white border border-slate-200 focus:ring-[#344499] focus:border-[#344499] shadow-sm'>
                <SelectValue
                  placeholder={isLoading ? 'Loading colleges...' : 'Search or select your college'}
                />
              </SelectTrigger>
              <SelectContent>
                {collegeList?.map((college) => (
                  <SelectItem key={college.id} value={college.id.toString()}>
                    {college.name}
                  </SelectItem>
                ))}
                <SelectItem value='OTHER'>Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2.5">
               <Info className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-[#344499]" />
               <button type="button" onClick={() => setCollegeId('OTHER')} className="text-[8px] sm:text-[11px] font-bold tracking-wide text-[#344499] hover:underline">
                 My college is not listed
               </button>
            </div>
          </div>

          {/* Show when "Other" is selected */}
          {isOtherSelected && (
             <div className='space-y-3 sm:space-y-4 mb-4 sm:mb-6 border-t border-slate-100 pt-4 sm:pt-6 mt-4 sm:mt-6'>
              <div className="space-y-1 sm:space-y-1.5">
                 <label className="text-[9px] sm:text-[13px] font-semibold text-[#344499] tracking-wide">Enter college name</label>
                 <Input
                   className="h-8 sm:h-11 border-slate-200 text-[10px] sm:text-sm shadow-sm"
                   placeholder='e.g. Stanford University'
                   value={customCollegeName}
                   onChange={(e) => setCustomCollegeName(e.target.value)}
                 />
              </div>

              <div className="space-y-1 sm:space-y-1.5">
                 <label className="text-[9px] sm:text-[13px] font-semibold text-[#344499] tracking-wide">Enter college address (City)</label>
                 <Input
                   className="h-8 sm:h-11 border-slate-200 text-[10px] sm:text-sm shadow-sm"
                   placeholder='e.g. Stanford, California'
                   value={customCollegeAddress}
                   onChange={(e) => setCustomCollegeAddress(e.target.value)}
                 />
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center mt-6 sm:mt-8 pt-2 sm:pt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            type="button"
            className="bg-[#f8faff] text-[#344499] hover:bg-[#eff4ff] hover:text-[#2c3983] px-6 sm:px-9 h-8 sm:h-11 text-[10px] sm:text-[14px] font-semibold tracking-wide rounded-md sm:rounded-lg transition-colors"
          >
            Back
          </Button>
          <Button
            type="button"
            className="bg-[#344499] hover:bg-[#2c3983] text-white px-6 sm:px-9 h-8 sm:h-11 text-[10px] sm:text-[14px] font-semibold tracking-wide rounded-md sm:rounded-lg shadow-md transition-colors"
            disabled={
              isLoading ||
              submitting ||
              !collegeId ||
              (isOtherSelected && (!customCollegeName || !customCollegeAddress))
            }
            onClick={handleContinue}
          >
            {submitting ? 'Saving...' : 'Continue'}
          </Button>
        </div>

      </div>
    </div>
  );
}
