import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

const FacilitatorUsers = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<StudentRow[]>('/facilitator/students');
      setStudents(res.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
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
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [students, searchQuery]);

  if (loading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
      </div>
    );
  }

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
        <div className='relative w-full md:w-96'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <Input
            placeholder='Search students by name or email...'
            className='border-slate-200 bg-white pl-10'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                    <span className='text-[10px] text-slate-400 truncate max-w-[150px]'>
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
                <TableCell className='min-w-[180px]'>
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
                  <p className='text-xs text-slate-500'>
                    {new Date(student.joined_date).toLocaleDateString('en-GB')}
                  </p>
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
    </div>
  );
};

export default FacilitatorUsers;
