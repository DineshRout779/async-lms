import { useEffect, useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function FacilitatorUsersSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-52' />
        <Skeleton className='h-4 w-80' />
      </div>
      <div className='flex gap-3'>
        <Skeleton className='h-9 w-64' />
        <Skeleton className='h-9 w-44' />
      </div>
      <div className='rounded-xl border border-slate-200 overflow-hidden bg-white'>
        <div className='grid grid-cols-6 gap-4 px-4 py-3 border-b'>
          {[...Array(6)].map((_, i) => <Skeleton key={i} className='h-3 w-full' />)}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className='grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100 items-center'>
            <div className='flex items-center gap-3 col-span-2'>
              <Skeleton className='h-8 w-8 rounded-full shrink-0' />
              <div className='space-y-1.5 flex-1'>
                <Skeleton className='h-3.5 w-28' />
                <Skeleton className='h-3 w-36' />
              </div>
            </div>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-2 w-full rounded-full' />
            <Skeleton className='h-7 w-16 rounded' />
          </div>
        ))}
      </div>
    </div>
  );
}
import StudentProfileDialog from '@/components/common/StudentProfileDialog';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import apiClient from '@/services/api';

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  degree?: string | null;
  batch?: number | null;
  college_name?: string | null;
  college_short_name?: string | null;
  enrolled_courses?: number;
  progress_percent?: number;
  joined_date: string;
}

const FacilitatorStudents = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [profileId, setProfileId] = useState<string | null>(null);

  const colleges = useMemo(() => {
    const seen = new Map<string, string>();
    students.forEach((s) => {
      if (s.college_name && s.college_short_name) {
        seen.set(s.college_name, s.college_short_name);
      }
    });
    return Array.from(seen.entries()).map(([name, short]) => ({ name, short }));
  }, [students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<StudentRow[]>('/facilitator/students');
      setStudents(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load students'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        (selectedCollege === 'all' || s.college_name === selectedCollege) &&
        (s.full_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)),
    );
  }, [students, searchQuery, selectedCollege]);

  if (loading) return <FacilitatorUsersSkeleton />;

  return (
    <div className='space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold text-[#1e2653]'>
          Student Management
        </h1>
        <p className='text-slate-500 text-sm'>
          Viewing all students enrolled in your assigned colleges.
        </p>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <div className='relative w-full sm:w-80'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <Input
              placeholder='Search students by name or email...'
              className='border-slate-200 bg-white pl-10'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {colleges.length > 1 && (
            <Select value={selectedCollege} onValueChange={setSelectedCollege}>
              <SelectTrigger className='w-full sm:w-56 border-slate-200 bg-white'>
                <SelectValue placeholder='All Colleges' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Colleges</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.short} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <p className='text-sm font-medium text-slate-500'>
          Total Students:{' '}
          <span className='text-slate-900'>{filteredStudents.length}</span>
        </p>
      </div>

      <Card className='overflow-hidden border-none shadow-sm'>
        <Table>
          <TableHeader className='bg-slate-50/50'>
            <TableRow>
              <TableHead className='font-bold uppercase text-xs'>
                Student
              </TableHead>
              <TableHead className='font-bold uppercase text-xs'>
                College
              </TableHead>
              <TableHead className='font-bold uppercase text-xs'>
                Degree/Batch
              </TableHead>
              <TableHead className='font-bold uppercase text-xs'>
                Courses
              </TableHead>
              <TableHead className='font-bold uppercase text-xs'>
                Overall Progress
              </TableHead>
              <TableHead className='text-right font-bold uppercase text-xs'>
                Joined
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='bg-white'>
            {filteredStudents.map((student) => (
              <TableRow
                key={student.id}
                className='hover:bg-slate-50/60 transition-colors'
              >
                <TableCell>
                  <div>
                    <p className='font-bold text-slate-900'>
                      {student.full_name}
                    </p>
                    <p className='text-xs text-slate-500'>{student.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex flex-col'>
                    <span className='font-semibold text-slate-700'>
                      {student.college_short_name || 'N/A'}
                    </span>
                    <span className='text-[10px] text-slate-400 truncate max-w-37.5'>
                      {student.college_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex flex-col gap-1'>
                    <span className='text-xs text-slate-600 font-medium'>
                      {student.degree || 'N/A'}
                    </span>
                    {student.batch && (
                      <Badge
                        variant='outline'
                        className='w-fit text-[10px] h-5 bg-blue-50/50 text-blue-600 border-blue-100'
                      >
                        Batch {student.batch}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className='bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none'>
                    {student.enrolled_courses || 0} subjects
                  </Badge>
                </TableCell>
                <TableCell className='min-w-45'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between text-[10px] font-bold uppercase tracking-wider'>
                      <span className='text-slate-400'>Progress</span>
                      <span className='text-indigo-600'>
                        {student.progress_percent || 0}%
                      </span>
                    </div>
                    <Progress
                      value={student.progress_percent || 0}
                      className='h-1.5 bg-indigo-50'
                    />
                  </div>
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-1'>
                    <button
                      onClick={() => setProfileId(student.id)}
                      className='p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors'
                    >
                      <Eye className='w-4 h-4' />
                    </button>
                    <p className='text-xs text-slate-500'>
                      {new Date(student.joined_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredStudents.length === 0 && (
          <div className='py-20 text-center'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4'>
              <Search className='w-6 h-6 text-slate-400' />
            </div>
            <p className='text-slate-500 font-medium'>
              No students found matching your search.
            </p>
          </div>
        )}
      </Card>

      <StudentProfileDialog
        studentId={profileId}
        apiPrefix='facilitator'
        onClose={() => setProfileId(null)}
      />
    </div>
  );
};

export default FacilitatorStudents;
