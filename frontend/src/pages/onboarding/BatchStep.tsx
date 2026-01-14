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
    <div className='max-w-md mx-auto h-screen flex justify-center items-center px-6'>
      <div className='w-full space-y-6'>
        <Stepper current='batch' />

        <h2 className='text-xl font-semibold text-center'>Academic Details</h2>

        <div className='space-y-4 w-full'>
          {/* Degree Select */}
          <div className='w-full'>
            <label className='text-sm font-medium mb-1.5 block'>
              Degree Program
            </label>
            <Select value={degree} onValueChange={setDegree}>
              {/* Added w-full here */}
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select Degree' />
              </SelectTrigger>
              {/* Content will match trigger width */}
              <SelectContent className='w-full'>
                <SelectItem value='B.Tech'>B.Tech</SelectItem>
                <SelectItem value='BCA'>BCA</SelectItem>
                <SelectItem value='M.Tech'>M.Tech</SelectItem>
                <SelectItem value='MCA'>MCA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year Select */}
          <div className='w-full'>
            <label className='text-sm font-medium mb-1.5 block'>
              Current Year
            </label>
            <Select value={year} onValueChange={setYear}>
              {/* Added w-full here */}
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select Year' />
              </SelectTrigger>
              <SelectContent className='w-full'>
                <SelectItem value='1'>1st Year</SelectItem>
                <SelectItem value='2'>2nd Year</SelectItem>
                <SelectItem value='3'>3rd Year</SelectItem>
                <SelectItem value='4'>4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className='mt-6 w-full'
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
