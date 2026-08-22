import { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, Trash2, X, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import apiClient from '@/services/api';

interface DeletedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  deleted_at: string;
  deleted_by_name?: string | null;
}

interface RecycleBinModalProps {
  open: boolean;
  onClose: () => void;
  apiPrefix: 'admin' | 'facilitator';
  onRestored: () => void;
}

export default function RecycleBinModal({
  open,
  onClose,
  apiPrefix,
  onRestored,
}: RecycleBinModalProps) {
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const endpointPrefix = apiPrefix === 'admin' ? '/users' : '/facilitator/students';

  const fetchBin = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: DeletedUser[] }>(
        `${endpointPrefix}/bin`
      );
      setUsers(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBin();
      setSearchQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = purgeDate.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
  };

  const handleRestore = async (id: string) => {
    try {
      setProcessingId(id);
      await apiClient.post(`${endpointPrefix}/${id}/restore`);
      toast.success('User restored successfully');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      onRestored();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to restore user'));
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure? This will instantly destroy all of their submissions and progress FOREVER. This cannot be undone.')) {
      return;
    }
    try {
      setProcessingId(id);
      await apiClient.delete(`${endpointPrefix}/${id}/permanent`);
      toast.success('User permanently deleted');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete permanently'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className='sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Trash2 className="h-5 w-5 text-red-500" />
            Recycle Bin
          </DialogTitle>
          <div className='relative w-full sm:w-64 sm:mr-6'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              placeholder='Search by name or email...'
              className='h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>
        <div className='flex-1 overflow-auto -mx-6 px-6 py-2'>
          {loading ? (
            <div className='py-12 flex justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-slate-300' />
            </div>
          ) : users.length === 0 ? (
            <div className='py-12 text-center text-slate-500'>
              The recycle bin is empty.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className='py-12 text-center text-slate-500'>
              No matching users found.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Deleted On</TableHead>
                    <TableHead className='text-center'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                       <TableCell>
                        <p className='font-medium text-slate-900'>{user.full_name}</p>
                        <p className='text-xs text-slate-500'>{user.email}</p>
                        {user.deleted_by_name && (
                          <p className='text-[10px] text-slate-400 mt-1 italic'>
                            Deleted by {user.deleted_by_name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className='text-sm text-slate-600'>
                          {new Date(user.deleted_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </div>
                        {(() => {
                          const days = getDaysRemaining(user.deleted_at);
                          const isCritical = days <= 7;
                          return (
                            <div className='mt-1'>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                isCritical 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                                {isCritical ? '⚠️ ' : ''}{days} {days === 1 ? 'day' : 'days'} left
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 mr-2'
                          disabled={processingId === user.id}
                          onClick={() => handleRestore(user.id)}
                        >
                          {processingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                          Restore
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 text-red-600 hover:text-red-700 hover:bg-red-50'
                          disabled={processingId === user.id}
                          onClick={() => handlePermanentDelete(user.id)}
                        >
                          {processingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                          Destroy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
