import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { Info } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface College {
  id: number | string;
  name: string;
}

export default function CollegeStep() {
  const [collegeList, setCollegeList] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [customCollegeAddress, setCustomCollegeAddress] = useState('');

  const navigate = useNavigate();
  const isOtherSelected = collegeId === 'OTHER';

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/colleges');
        setCollegeList(res.data.data || res.data);
      } catch (error) {
        console.error('Failed to fetch colleges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchColleges();
  }, []);

  const handleContinue = async () => {
    if (!collegeId) return;

    try {
      setLoading(true);
      let finalCollegeId = collegeId;

      if (collegeId === 'OTHER') {
        const createRes = await apiClient.post('/colleges', {
          name: customCollegeName,
          city: customCollegeAddress,
          short_code: customCollegeName.substring(0, 5).toUpperCase(),
          state: 'Unknown',
        });
        finalCollegeId = createRes.data.id;
      }

      const res = await apiClient.post('/onboarding/college', {
        college_id: finalCollegeId,
      });

      if (res.status === 200 || res.status === 201) {
        navigate(`/onboarding/${res.data.next_step}`);
      }
    } catch (error: any) {
      console.error(
        'Selection failed:',
        error.response?.data?.message || error.message
      );
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
          <Stepper current='college' />

          <div className="mb-8 mt-6">
            <h2 className='text-2xl font-bold text-[#344499]'>Select your college</h2>
            <p className="text-[13px] text-slate-400 font-medium mt-1.5 leading-relaxed tracking-wide">Required for mapping batches and cohorts</p>
          </div>

          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-[#344499] tracking-wide">College name</label>
            <Select onValueChange={setCollegeId} disabled={loading}>
              <SelectTrigger className='w-full h-11 text-[13px] text-slate-500 bg-white border border-slate-200 focus:ring-[#344499] focus:border-[#344499] shadow-sm'>
                <SelectValue
                  placeholder={loading ? 'Loading colleges...' : 'Search or select your college'}
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
            <div className="flex items-center gap-1.5 mt-2.5">
               <Info className="h-3.5 w-3.5 text-[#344499]" />
               <button type="button" onClick={() => setCollegeId('OTHER')} className="text-[11px] font-bold tracking-wide text-[#344499] hover:underline">
                 My college is not listed
               </button>
            </div>
          </div>

          {/* Show when "Other" is selected */}
          {isOtherSelected && (
             <div className='space-y-4 mb-6 border-t border-slate-100 pt-6 mt-6'>
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#344499] tracking-wide">Enter college name</label>
                 <Input
                   className="h-11 border-slate-200 text-sm shadow-sm"
                   placeholder='e.g. Stanford University'
                   value={customCollegeName}
                   onChange={(e) => setCustomCollegeName(e.target.value)}
                 />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#344499] tracking-wide">Enter college address (City)</label>
                 <Input
                   className="h-11 border-slate-200 text-sm shadow-sm"
                   placeholder='e.g. Stanford, California'
                   value={customCollegeAddress}
                   onChange={(e) => setCustomCollegeAddress(e.target.value)}
                 />
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center mt-8 pt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            type="button"
            className="bg-[#f8faff] text-[#344499] hover:bg-[#eff4ff] hover:text-[#2c3983] px-9 h-11 text-[14px] font-extrabold tracking-wide rounded-lg transition-colors"
          >
            Back
          </Button>
          <Button
            type="button"
            className="bg-[#344499] hover:bg-[#2c3983] text-white px-9 h-11 text-[14px] font-extrabold tracking-wide rounded-lg shadow-md transition-colors"
            disabled={
              loading ||
              !collegeId ||
              (isOtherSelected && (!customCollegeName || !customCollegeAddress))
            }
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>

      </div>
    </div>
  );
}
