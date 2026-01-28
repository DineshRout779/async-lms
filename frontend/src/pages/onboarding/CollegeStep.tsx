import { useState, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Define a type for the college data
interface College {
  id: number | string;
  name: string;
}

export default function CollegeStep() {
  const [collegeList, setCollegeList] = useState<College[]>([]); // State for API data
  const [loading, setLoading] = useState(true);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [customCollegeAddress, setCustomCollegeAddress] = useState('');

  const navigate = useNavigate();
  const isOtherSelected = collegeId === 'OTHER';

  // Fetch colleges from the backend
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        setLoading(true);
        // Assuming your controller returns { data: [...] }
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

      // Scenario: User is adding a new college
      if (collegeId === 'OTHER') {
        const createRes = await apiClient.post('/colleges', {
          name: customCollegeName,
          city: customCollegeAddress, // mapping address to city for now
          short_code: customCollegeName.substring(0, 5).toUpperCase(), // placeholder
          state: 'Unknown',
        });

        // The backend returns the new college object including the generated UUID
        finalCollegeId = createRes.data.id;
      }

      // Final Step: Update the User's onboarding progress with the college ID [cite: 9]
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
    <div className='max-w-md mx-auto h-screen flex justify-center items-center'>
      <div className='w-full space-y-4'>
        <Stepper current='college' />

        <h2 className='text-xl font-semibold'>Select your college</h2>

        <Select onValueChange={setCollegeId} disabled={loading}>
          <SelectTrigger className='w-full'>
            <SelectValue
              placeholder={loading ? 'Loading colleges...' : 'Select college'}
            />
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

        {/* Show when "Other" is selected */}
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
          </div>
        )}

        <Button
          className='mt-4 w-full'
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
  );
}
