import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

export default function DeleteCollegeDialog({
  open,
  onClose,
  collegeId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  collegeId: string;
  onSuccess: () => void;
}) {
  const handleDelete = async () => {
    try {
      await apiClient.delete(`/colleges/${collegeId}`);
      toast.success('College deleted');
      onSuccess();
    } catch {
      toast.error('Failed to delete college');
    } finally {
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this college?
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className='flex justify-end gap-3 mt-4'>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
