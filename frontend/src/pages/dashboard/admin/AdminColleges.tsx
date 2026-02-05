import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, MapPin, MoreHorizontal, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
    } catch {
      toast.error('Failed to load colleges');
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
    []
  );

  /* ======================
     Render
  ====================== */

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <h2 className='text-lg font-bold text-slate-900'>Colleges</h2>
        <Button
          className='gap-2 bg-blue-600 hover:bg-blue-700'
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
      <Card className='border-none shadow-sm overflow-hidden'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='bg-slate-50/50'>
              <TableRow>
                <TableHead className='pl-6'>College</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-12' />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-64 text-center'>
                    <Loader2 className='w-8 h-8 animate-spin text-blue-600 mx-auto' />
                  </TableCell>
                </TableRow>
              ) : colleges.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='h-64 text-center text-slate-500'
                  >
                    No colleges found.
                  </TableCell>
                </TableRow>
              ) : (
                colleges.length > 0 &&
                colleges.map((college) => (
                  <TableRow
                    key={college.id}
                    className='hover:bg-slate-50/50 cursor-default'
                  >
                    <TableCell className='pl-6'>
                      <div className='flex items-center gap-4'>
                        <div className='w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs'>
                          {getInitials(college.name)}
                        </div>
                        <span className='font-bold text-slate-700 text-sm'>
                          {college.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className='text-slate-500'>
                      {college.short_code}
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center gap-1.5 text-slate-500 text-sm'>
                        <MapPin className='w-3.5 h-3.5' />
                        {college.city}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={
                          college.is_verified
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-orange-50 text-orange-600'
                        }
                      >
                        {college.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label='College actions'
                          >
                            <MoreHorizontal className='w-4 h-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {/* TODO: Show Details */}
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCollege(college);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-red-600'
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
    </div>
  );
}
