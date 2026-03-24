import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stepper } from './Stepper';
import { useNavigate } from 'react-router';
import apiClient from '@/services/api';
import { useAppDispatch } from '@/app/hooks';
import { loadUser } from '@/features/auth/authThunks';
import { useColleges } from '@/hooks/queries/useOnboarding';
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
      console.error('Selection failed:', error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='bg-accent'>
      <div className='max-w-120 mx-auto h-screen flex justify-center items-center'>
        <div className='w-full space-y-4 bg-white p-10 rounded-md'>
          <Stepper current='college' />

          <h2 className='text-xl font-semibold'>Select your college</h2>

          <Select
            value={collegeId ?? ''}
            onValueChange={setCollegeId}
            disabled={isLoading || submitting}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={isLoading ? 'Loading colleges...' : 'Select college'} />
            </SelectTrigger>
            <SelectContent>
              {collegeList.map((college) => (
                <SelectItem key={college.id} value={college.id.toString()}>
                  {college.name}
                </SelectItem>
              ))}
              <SelectItem value='OTHER'>Other</SelectItem>
            </SelectContent>
          </Select>

          {isOtherSelected && (
            <div className='space-y-3'>
              <Input
                placeholder='Enter college name'
                value={customCollegeName}
                onChange={(e) => setCustomCollegeName(e.target.value)}
              />
              <Input
                placeholder='Enter college address'
                value={customCollegeAddress}
                onChange={(e) => setCustomCollegeAddress(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                Your college will be reviewed and verified by an admin before appearing in the list.
              </p>
            </div>
          )}

          <Button
            variant='accent'
            className='mt-4 w-full'
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
