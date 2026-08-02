import { useEffect, useState } from 'react';
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
import { getErrorMessage } from '@/lib/utils';

export const CreateCourseModal = ({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: any) => {
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    description: editData?.description || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({
      name: editData?.name || '',
      description: editData?.description || '',
    });
  }, [open, editData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = editData
        ? await apiClient.put(`/subjects/${editData.id}`, formData)
        : await apiClient.post('/subjects', formData);
      if (res.status === 201 || res.status === 200) {
        toast.success(editData ? 'Subject Updated!' : 'Subject Created!');
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save subject'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className='sm:max-w-125 p-8'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold'>
            {editData ? 'Edit Course' : 'Create New Course'}
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6 mt-4'>
          <Input
            placeholder='Course Title'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <textarea
            className='w-full p-3 border rounded-md min-h-25'
            placeholder='Description'
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <div className='flex justify-end gap-4'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className='bg-[#2e3c85]'
              onClick={handleSave}
              loading={isSaving}
            >
              {editData ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
