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
    } catch (error) {
      console.error('Batch update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-accent'>
      <div className='max-w-120 mx-auto h-screen flex justify-center items-center'>
        <div className='w-full space-y-4 bg-white p-10 rounded-md'>
          <Stepper current='batch' />

          <h2 className='text-xl font-semibold'>Academic Details</h2>

          <div className='space-y-4 w-full'>
            <div className='w-full'>
              <label className='text-sm font-medium mb-1.5 block'>
                Degree Program
              </label>
              <Select value={degree} onValueChange={setDegree}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select Degree' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='B.Tech'>B.Tech</SelectItem>
                  <SelectItem value='BCA'>BCA</SelectItem>
                  <SelectItem value='M.Tech'>M.Tech</SelectItem>
                  <SelectItem value='MCA'>MCA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='w-full'>
              <label className='text-sm font-medium mb-1.5 block'>
                Current Year
              </label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select Year' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>1st Year</SelectItem>
                  <SelectItem value='2'>2nd Year</SelectItem>
                  <SelectItem value='3'>3rd Year</SelectItem>
                  <SelectItem value='4'>4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex gap-2 mt-4'>
            <Button
              variant='ghost'
              className='flex-1'
              onClick={() => navigate('/onboarding/college')}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant='accent'
              className='flex-1'
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
