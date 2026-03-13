import { useEffect, useState } from 'react';
import { Search, Filter, Eye, MoreHorizontal, Loader2 } from 'lucide-react';
import StudentProfileDialog from '@/components/common/StudentProfileDialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import apiClient from '@/services/api';

// Defined based on your actual API response
interface Student {
  id: string;
  full_name: string;
  email: string;
  degree: string;
  batch: number;
  joined_date: string;
  role: 'student';
  college_name: string;
  college_short_name: string;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await apiClient.get<Student[]>('/admin/all-students');
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Explicitly type the filter callback
  const filteredStudents = students.filter(
    (s: Student) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      {/* Filters Header */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div className='relative w-full md:w-96'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <Input
            placeholder='Search student by name or email...'
            className='pl-10 bg-white border-slate-200'
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
          />
        </div>
        <div className='flex items-center gap-3 w-full md:w-auto'>
          <Button variant='outline' className='bg-white'>
            <Filter className='w-4 h-4 mr-2' /> All Colleges
          </Button>
          <p className='text-sm text-slate-500 font-medium whitespace-nowrap'>
            Showing{' '}
            <span className='text-slate-900'>{filteredStudents.length}</span>{' '}
            students
          </p>
        </div>
      </div>

      {/* Students Table */}
      <Card className='border-none shadow-sm overflow-hidden'>
        <Table>
          <TableHeader className='bg-slate-50/50'>
            <TableRow>
              <TableHead className='font-bold text-slate-700 uppercase'>
                Student Name
              </TableHead>
              <TableHead className='font-bold text-slate-700 uppercase'>
                College
              </TableHead>
              <TableHead className='font-bold text-slate-700 uppercase'>
                Batch
              </TableHead>
              <TableHead className='font-bold text-slate-700 uppercase'>
                Joined Date
              </TableHead>
              <TableHead className='font-bold text-slate-700 text-right uppercase'>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='bg-white'>
            {filteredStudents.map((student) => (
              <TableRow key={student.id} className='hover:bg-slate-50/50'>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0'>
                      {student.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className='min-w-0'>
                      <p className='font-bold text-slate-900 truncate'>
                        {student.full_name}
                      </p>
                      <p className='text-xs text-slate-500 truncate'>
                        {student.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className='font-bold text-slate-900 uppercase'>
                    {student.college_short_name || 'N/A'}
                  </p>
                  <p className='text-xs text-slate-400 truncate max-w-45'>
                    {student.college_name}
                  </p>
                </TableCell>
                <TableCell>
                  <span className='px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold'>
                    Year {student.batch}
                  </span>
                </TableCell>
                <TableCell className='text-slate-500 text-sm whitespace-nowrap'>
                  {new Date(student.joined_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-slate-400 hover:text-blue-600'
                      onClick={() => setProfileId(student.id)}
                    >
                      <Eye className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-slate-400'
                    >
                      <MoreHorizontal className='w-4 h-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredStudents.length === 0 && (
          <div className='p-20 text-center'>
            <p className='text-slate-400'>
              No students found matching your search.
            </p>
          </div>
        )}
      </Card>

      <StudentProfileDialog
        studentId={profileId}
        apiPrefix='admin'
        onClose={() => setProfileId(null)}
      />
    </div>
  );
};

export default Students;
