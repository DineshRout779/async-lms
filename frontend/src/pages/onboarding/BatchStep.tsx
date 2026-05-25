import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BatchStep() {
  const [year, setYear] = useState<string>('1');
  const [degree, setDegree] = useState<string>('B.Tech');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleContinue = async () => {
    try {
      setLoading(true);
      await apiClient.post('/onboarding/batch', {
        degree: degree,
        year: parseInt(year),
      });

      navigate('/onboarding/program');
    } catch {
      // navigation does not occur — user stays on step
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
          <Stepper current='batch' />

          <div className="mb-8 mt-6">
            <h2 className='text-2xl font-bold text-[#344499]'>Select your batch</h2>
            <p className="text-[13px] text-slate-400 font-medium mt-1.5 leading-relaxed tracking-wide">Used for cohort tracking and leaderboard ranking</p>
          </div>

          <div className='space-y-5 w-full'>
            <div className='w-full'>
              <label className="text-xs font-bold text-[#344499] tracking-wide mb-1.5 block">
                Degree Program
              </label>
              <Select value={degree} onValueChange={setDegree}>
                <SelectTrigger className='w-full h-11 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 focus:ring-[#344499] focus:border-[#344499] shadow-sm'>
                  <SelectValue placeholder='Select Degree' />
                </SelectTrigger>
                <SelectContent className='w-full'>
                  <SelectItem value='B.Tech'>B.Tech</SelectItem>
                  <SelectItem value='BCA'>BCA</SelectItem>
                  <SelectItem value='M.Tech'>M.Tech</SelectItem>
                  <SelectItem value='BSC'>BSC</SelectItem>
                  <SelectItem value='BCOM'>BCOM</SelectItem>
                  <SelectItem value='BA'>BA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='w-full'>
              <label className="text-xs font-bold text-[#344499] tracking-wide mb-1.5 block">
                Academic year
              </label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className='w-full h-11 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 focus:ring-[#344499] focus:border-[#344499] shadow-sm'>
                  <SelectValue placeholder='Select Year' />
                </SelectTrigger>
                <SelectContent className='w-full'>
                  <SelectItem value='4'>2026-2027 (4th Year)</SelectItem>
                  <SelectItem value='3'>2025-2026 (3rd Year)</SelectItem>
                  <SelectItem value='2'>2024-2025 (2nd Year)</SelectItem>
                  <SelectItem value='1'>2023-2024 (1st Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-10 pt-4">
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
            disabled={loading}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>

      </div>
    </div>
  );
}
