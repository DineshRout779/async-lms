import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

export const CreateCourseModal = ({ open, onOpenChange, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const handleSave = async () => {
    try {
      const res = await apiClient.post('/subjects', formData);
      if (res.status === 201) {
        onSuccess();
        onOpenChange(false);
        toast.success('Subject Created!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-125 p-8'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold'>
            Create New Course
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6 mt-4'>
          <Input
            placeholder='Course Title'
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            placeholder='Slug (e.g., python)'
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
          <textarea
            className='w-full p-3 border rounded-md min-h-25'
            placeholder='Description'
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <div className='flex justify-end gap-4'>
            <Button variant='ghost' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className='bg-[#2e3c85]' onClick={handleSave}>
              Create Course
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
