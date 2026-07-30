import { useEffect, useMemo, useState } from 'react';
import { Pencil, Eye, Search, Loader2, ChevronLeft, ChevronRight, Trash2, Archive } from 'lucide-react';
import StudentProfileDialog from '@/components/common/StudentProfileDialog';
import FacilitatorProfileDialog from '@/components/common/FacilitatorProfileDialog';
import RecycleBinModal from '@/components/common/RecycleBinModal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import apiClient from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

type UserRole = 'student' | 'facilitator' | 'admin';
type ActiveTab = 'student' | 'facilitator';

interface College {
  id: string;
  name: string;
  short_code: string;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  degree?: string | null;
  year?: number | null;
  college_id?: string | null;
  college_name?: string | null;
  college_short_name?: string | null;
  enrolled_courses?: number;
  completed_subtopics?: number;
  total_subtopics?: number;
  progress_percent?: number;
  facilitator_college_ids?: string[];
  facilitator_college_names?: string[];
  is_verified: boolean;
  created_at: string;
}

interface CollegesResponse {
  success: boolean;
  data: College[];
}

interface EditForm {
  full_name: string;
  degree: string;
  year: string;
  college_id: string;
  facilitator_college_ids: string[];
}

const Users = () => {
  const currentUser = useAppSelector(selectUser);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('student');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [facilitatorProfileId, setFacilitatorProfileId] = useState<string | null>(null);
  const [isBinOpen, setIsBinOpen] = useState(false);
  const [form, setForm] = useState<EditForm>({
    full_name: '',
    degree: '',
    year: '',
    college_id: '',
    facilitator_college_ids: [],
  });

  const fetchUsers = async () => {
    try {
      const [usersRes, collegesRes] = await Promise.all([
        apiClient.get<UserRow[]>('/users'),
        apiClient.get<CollegesResponse>('/colleges'),
      ]);

      const currentId = String(currentUser?.id ?? '');
      setUsers(usersRes.data.filter((u) => String(u.id) !== currentId));
      setColleges(collegesRes.data?.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users
      .filter((u) => u.role === activeTab)
      .filter((u) => {
        if (!selectedCollegeId) return true;
        if (u.role === 'student') return u.college_id === selectedCollegeId;
        return u.facilitator_college_ids?.includes(selectedCollegeId) ?? false;
      })
      .filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
  }, [users, activeTab, searchQuery, selectedCollegeId]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredUsers, currentPage],
  );

  const studentCount = useMemo(
    () => users.filter((u) => u.role === 'student').length,
    [users],
  );
  const facilitatorCount = useMemo(
    () => users.filter((u) => u.role === 'facilitator').length,
    [users],
  );

  const openEditModal = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name || '',
      degree: user.degree || '',
      year: user.year ? String(user.year) : '',
      college_id: user.college_id || '',
      facilitator_college_ids: user.facilitator_college_ids || [],
    });
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditOpen(false);
  };

  const toggleFacilitatorCollege = (collegeId: string) => {
    setForm((prev) => ({
      ...prev,
      facilitator_college_ids: prev.facilitator_college_ids.includes(collegeId)
        ? prev.facilitator_college_ids.filter((id) => id !== collegeId)
        : [...prev.facilitator_college_ids, collegeId],
    }));
  };

  const saveUser = async () => {
    if (!editingUser) return;
    if (!form.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    try {
      setSaving(true);

      await apiClient.put(`/users/${editingUser.id}`, {
        full_name: form.full_name.trim(),
        degree: editingUser.role === 'student' ? form.degree || null : null,
        year:
          editingUser.role === 'student' && form.year
            ? Number(form.year)
            : null,
        college_id:
          editingUser.role === 'student' ? form.college_id || null : null,
      });

      if (editingUser.role === 'facilitator') {
        await apiClient.post('/colleges/assign-facilitator', {
          facilitator_id: editingUser.id,
          college_ids: form.facilitator_college_ids,
        });
      }

      toast.success('User updated successfully');
      closeEditModal();
      await fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/verify`, {
        is_verified: !currentStatus,
      });
      toast.success(
        `User ${!currentStatus ? 'verified' : 'unverified'} successfully`,
      );
      await fetchUsers();
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Failed to update verification status'),
      );
    }
  };

  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await apiClient.delete(`/users/${userToDelete.id}`);
      toast.success('User moved to recycle bin');
      setUserToDelete(null);
      await fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete user'));
    }
  };

  if (loading) {
    return (
      <div className='space-y-6 p-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <Skeleton className='h-10 w-96' />
          <Skeleton className='h-4 w-36' />
        </div>
        <div className='flex gap-2 mb-2'>
          <Skeleton className='h-9 w-36 rounded-md' />
          <Skeleton className='h-9 w-36 rounded-md' />
        </div>
        <Card className='border-none shadow-sm overflow-hidden'>
          <Table>
            <TableHeader className='bg-slate-50/50'>
              <TableRow>
                {[...Array(7)].map((_, i) => (
                  <TableHead key={i}><Skeleton className='h-3 w-20' /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className='bg-white'>
              {[...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className='space-y-1.5'>
                      <Skeleton className='h-3.5 w-32' />
                      <Skeleton className='h-3 w-40' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1.5'>
                      <Skeleton className='h-3.5 w-8' />
                      <Skeleton className='h-3 w-36' />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className='h-6 w-20 rounded-full' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-40' /></TableCell>
                  <TableCell><Skeleton className='h-6 w-14 rounded-full' /></TableCell>
                  <TableCell><Skeleton className='h-6 w-16 rounded-full' /></TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-1'>
                      <Skeleton className='h-8 w-8 rounded' />
                      <Skeleton className='h-8 w-8 rounded' />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6 animate-in fade-in duration-500'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <div className='relative w-full md:w-80'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <Input
              placeholder='Search by name or email...'
              className='border-slate-200 bg-white pl-10'
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className='h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 w-full sm:w-52'
            value={selectedCollegeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setSelectedCollegeId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value=''>All Colleges</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name}
              </option>
            ))}
          </select>
        </div>

        <div className='flex items-center gap-4'>
          <Button variant="outline" onClick={() => setIsBinOpen(true)} className="gap-2">
            <Archive className="h-4 w-4" />
            Recycle Bin
          </Button>
          <p className='text-sm font-medium text-slate-500'>
            Showing <span className='text-slate-900'>{filteredUsers.length}</span>{' '}
            {activeTab === 'student' ? 'students' : 'facilitators'}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as ActiveTab);
          setSelectedCollegeId('');
          setCurrentPage(1);
        }}
      >
        <TabsList className='bg-slate-100'>
          <TabsTrigger value='student'>Students ({studentCount})</TabsTrigger>
          <TabsTrigger value='facilitator'>
            Facilitators ({facilitatorCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='student'>
          <Card className='overflow-hidden border-none shadow-sm'>
            <Table>
              <TableHeader className='bg-slate-50/50'>
                <TableRow>
                  <TableHead className='font-bold uppercase'>Student</TableHead>
                  <TableHead className='font-bold uppercase'>College</TableHead>
                  <TableHead className='font-bold uppercase'>Courses</TableHead>
                  <TableHead className='font-bold uppercase'>
                    Progress
                  </TableHead>
                  <TableHead className='font-bold uppercase'>Batch</TableHead>
                  <TableHead className='font-bold uppercase'>Status</TableHead>
                  <TableHead className='text-right font-bold uppercase'>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='bg-white'>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} className='hover:bg-slate-50/60'>
                    <TableCell>
                      <p className='font-bold text-slate-900'>
                        {user.full_name}
                      </p>
                      <p className='text-xs text-slate-500'>{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className='text-sm text-slate-700'>
                        {user.college_name || 'N/A'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className='bg-slate-100 text-slate-700'>
                        {user.enrolled_courses || 0} enrolled
                      </Badge>
                    </TableCell>
                    <TableCell className='min-w-48'>
                      <div className='space-y-1'>
                        <div className='flex items-center justify-between text-xs text-slate-500'>
                          <span>
                            {user.completed_subtopics || 0}/
                            {user.total_subtopics || 0} subtopics
                          </span>
                          <span>{user.progress_percent || 0}%</span>
                        </div>
                        <Progress value={user.progress_percent || 0} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.year ? (
                        <Badge className='bg-blue-50 text-blue-700'>
                          Year {user.year}
                        </Badge>
                      ) : (
                        <span className='text-slate-400'>N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Badge
                          className={
                            user.is_verified
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }
                        >
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-[10px]'
                          onClick={() => handleVerify(user.id, user.is_verified)}
                        >
                          {user.is_verified ? 'Unverify' : 'Verify'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-500 hover:text-blue-600'
                        onClick={() => setProfileId(user.id)}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-500 hover:text-blue-600'
                        onClick={() => openEditModal(user)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-400 hover:text-red-600 hover:bg-red-50'
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className='p-16 text-center text-slate-400'>
                No students found.
              </div>
            )}
            {totalPages > 1 && (
              <div className='flex items-center justify-between border-t border-slate-100 px-4 py-3'>
                <p className='text-xs text-slate-500'>
                  Page {currentPage} of {totalPages} &mdash; {filteredUsers.length} total
                </p>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className='px-1 text-slate-400 text-sm'>…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={currentPage === p ? 'default' : 'outline'}
                          size='icon'
                          className='h-8 w-8 text-xs'
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='facilitator'>
          <Card className='overflow-hidden border-none shadow-sm'>
            <Table>
              <TableHeader className='bg-slate-50/50'>
                <TableRow>
                  <TableHead className='font-bold uppercase'>
                    Facilitator
                  </TableHead>
                  <TableHead className='font-bold uppercase'>
                    Assigned Colleges
                  </TableHead>
                  <TableHead className='font-bold uppercase'>Joined</TableHead>
                  <TableHead className='font-bold uppercase'>Status</TableHead>
                  <TableHead className='text-right font-bold uppercase'>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='bg-white'>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} className='hover:bg-slate-50/60'>
                    <TableCell>
                      <p className='font-bold text-slate-900'>
                        {user.full_name}
                      </p>
                      <p className='text-xs text-slate-500'>{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {user.facilitator_college_names &&
                        user.facilitator_college_names.length > 0 ? (
                          user.facilitator_college_names.map((name) => (
                            <Badge
                              key={`${user.id}-${name}`}
                              className='bg-emerald-50 text-emerald-700'
                            >
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className='text-sm text-slate-400'>
                            No colleges assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-sm text-slate-500'>
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Badge
                          className={
                            user.is_verified
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }
                        >
                          {user.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-[10px]'
                          onClick={() =>
                            handleVerify(user.id, user.is_verified)
                          }
                        >
                          {user.is_verified ? 'Unverify' : 'Verify'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-500 hover:text-blue-600'
                        onClick={() => setFacilitatorProfileId(user.id)}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-500 hover:text-blue-600'
                        onClick={() => openEditModal(user)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-slate-400 hover:text-red-600 hover:bg-red-50'
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className='p-16 text-center text-slate-400'>
                No facilitators found.
              </div>
            )}
            {totalPages > 1 && (
              <div className='flex items-center justify-between border-t border-slate-100 px-4 py-3'>
                <p className='text-xs text-slate-500'>
                  Page {currentPage} of {totalPages} &mdash; {filteredUsers.length} total
                </p>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className='px-1 text-slate-400 text-sm'>…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={currentPage === p ? 'default' : 'outline'}
                          size='icon'
                          className='h-8 w-8 text-xs'
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='full-name'>Full Name</Label>
                <Input
                  id='full-name'
                  value={form.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>

              {editingUser.role === 'student' && (
                <>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='degree'>Degree</Label>
                      <Input
                        id='degree'
                        value={form.degree}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setForm((prev) => ({
                            ...prev,
                            degree: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='year'>Batch Year</Label>
                      <Input
                        id='year'
                        type='number'
                        value={form.year}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setForm((prev) => ({ ...prev, year: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='college'>College</Label>
                    <select
                      id='college'
                      className='h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm'
                      value={form.college_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setForm((prev) => ({
                          ...prev,
                          college_id: e.target.value,
                        }))
                      }
                    >
                      <option value=''>Unassigned</option>
                      {colleges.map((college) => (
                        <option key={college.id} value={college.id}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editingUser.role === 'facilitator' && (
                <div className='space-y-2'>
                  <Label>Assigned Colleges</Label>
                  <small className='block mb-2 text-xs text-muted-foreground'>
                    Click to toggle
                  </small>
                  <div className='max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3'>
                    {colleges.map((college) => {
                      const isSelected = form.facilitator_college_ids.includes(
                        college.id,
                      );
                      return (
                        <button
                          key={college.id}
                          type='button'
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                          onClick={() => toggleFacilitatorCollege(college.id)}
                        >
                          {college.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={closeEditModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentProfileDialog
        studentId={profileId}
        apiPrefix='admin'
        onClose={() => setProfileId(null)}
      />

      <FacilitatorProfileDialog
        facilitatorId={facilitatorProfileId}
        onClose={() => setFacilitatorProfileId(null)}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <strong>{userToDelete?.full_name}</strong> to the Recycle Bin. 
              They will not be able to log in, but their progress is preserved. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Move to Bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecycleBinModal
        open={isBinOpen}
        onClose={() => setIsBinOpen(false)}
        apiPrefix="admin"
        onRestored={fetchUsers}
      />
    </div>
  );
};

export default Users;
