import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, MapPin, MoreHorizontal, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import apiClient from '@/services/api';
import DeleteCollegeDialog from '@/components/common/admin/DeleteCollegeDialog';
import CollegeFormDialog from '@/components/common/admin/CollegeFormDialog';
import CollegeDetailSheet from '@/components/common/admin/CollegeDetailSheet';

/* ======================
   Types (API aligned)
====================== */

export interface College {
  id: string;
  name: string;
  short_code: string;
  city: string;
  state: string;
  is_verified: boolean;
  created_at: string;
}

/* ======================
   Component
====================== */

export default function AdminColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  /* ======================
     Fetch Colleges
  ====================== */

  const fetchColleges = useCallback(async () => {
    let isMounted = true;

    try {
      setLoading(true);
      const res = await apiClient.get<{ data: College[] }>('/colleges');
      if (isMounted) {
        setColleges(res.data.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load colleges'));
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  /* ======================
     Helpers
  ====================== */

  const getInitials = useMemo(
    () => (name: string) =>
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [],
  );

  /* ======================
     Render
  ====================== */

  return (
    <div className='space-y-4 sm:space-y-6 min-w-0 animate-in fade-in duration-300'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg sm:text-xl font-bold text-slate-900 tracking-tight'>Colleges</h2>
          <p className='text-xs sm:text-sm text-slate-500'>Manage registered educational institutions</p>
        </div>
        <Button
          className='gap-2 bg-blue-600 hover:bg-blue-700 min-h-[40px] rounded-xl font-semibold shadow-xs shrink-0'
          disabled={loading}
          onClick={() => {
            setEditingCollege(null);
            setFormOpen(true);
          }}
        >
          <Plus className='w-4 h-4' /> Add College
        </Button>
      </div>

      {/* Table */}
      <Card className='border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white min-w-0'>
        <CardContent className='p-0'>
          <div className='overflow-x-auto custom-scrollbar w-full min-w-0'>
            <Table className='min-w-[560px] text-xs sm:text-sm'>
              <TableHeader className='bg-slate-50 border-b border-slate-100'>
                <TableRow>
                  <TableHead className='pl-4 sm:pl-6 py-3.5'>College</TableHead>
                  <TableHead className='py-3.5'>Location</TableHead>
                  <TableHead className='py-3.5'>Status</TableHead>
                  <TableHead className='w-14 text-right pr-4 sm:pr-6 py-3.5' />
                </TableRow>
              </TableHeader>

              <TableBody className='divide-y divide-slate-100'>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='h-64 text-center'>
                      <Loader2 className='w-8 h-8 animate-spin text-blue-600 mx-auto' />
                    </TableCell>
                  </TableRow>
                ) : colleges.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='h-64 text-center text-slate-400 text-xs sm:text-sm'
                    >
                      No colleges found.
                    </TableCell>
                  </TableRow>
                ) : (
                  colleges.map((college) => (
                    <TableRow
                      key={college.id}
                      className='hover:bg-slate-50/60 transition-colors'
                    >
                      <TableCell className='pl-4 sm:pl-6 py-3.5'>
                        <div className='flex items-center gap-3 sm:gap-4 min-w-0'>
                          <div className='w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100'>
                            {getInitials(college.name)}
                          </div>
                          <span className='font-semibold text-slate-800 text-xs sm:text-sm truncate'>
                            {college.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className='py-3.5 whitespace-nowrap'>
                        <div className='flex items-center gap-1.5 text-slate-500 text-xs sm:text-sm'>
                          <MapPin className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                          <span>{college.city || '—'}</span>
                        </div>
                      </TableCell>

                      <TableCell className='py-3.5 whitespace-nowrap'>
                        <Badge
                          className={
                            college.is_verified
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 font-semibold text-[11px]'
                              : 'bg-orange-50 text-orange-700 border-orange-200/60 font-semibold text-[11px]'
                          }
                        >
                          {college.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </TableCell>

                      <TableCell className='text-right pr-4 sm:pr-6 py-3.5'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg'
                              aria-label='College actions'
                            >
                              <MoreHorizontal className='w-4 h-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='rounded-xl shadow-lg border border-slate-200'>
                            <DropdownMenuItem onClick={() => setDetailId(college.id)} className='cursor-pointer'>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCollege(college);
                                setFormOpen(true);
                              }}
                              className='cursor-pointer'
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer'
                              onClick={() => setDeleteId(college.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <CollegeFormDialog
        open={formOpen}
        college={editingCollege}
        onClose={() => {
          setFormOpen(false);
          setEditingCollege(null);
        }}
        onSuccess={fetchColleges}
      />

      {/* Delete Dialog */}
      {deleteId && (
        <DeleteCollegeDialog
          open={!!deleteId}
          collegeId={deleteId}
          onClose={() => setDeleteId(null)}
          onSuccess={fetchColleges}
        />
      )}

      {/* College Detail Sheet */}
      <CollegeDetailSheet
        collegeId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
