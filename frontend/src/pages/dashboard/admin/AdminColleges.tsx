import { useEffect, useState } from 'react';
import {
  Plus,
  MapPin,
  Users,
  BookOpen,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

interface College {
  id: number;
  name: string;
  short_code: string;
  type: 'Barabari' | 'Normal';
  location: string;
  student_count: number;
  course_count: number;
  status: 'active' | 'inactive';
}

export default function AdminColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await apiClient.get('/colleges');
      setColleges(response.data.data);
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
      toast.error('Could not load colleges');
    } finally {
      setLoading(false);
    }
  };

  // Logic to filter data locally based on the Tabs
  const filteredColleges = colleges.filter((c) =>
    filter === 'all' ? true : c.type.toLowerCase() === filter
  );

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <Tabs
          defaultValue='all'
          onValueChange={setFilter}
          className='w-full sm:w-auto'
        >
          <TabsList className='bg-slate-100/50 p-1'>
            <TabsTrigger value='all' className='px-6'>
              All Types
            </TabsTrigger>
            <TabsTrigger value='barabari' className='px-6'>
              Barabari
            </TabsTrigger>
            <TabsTrigger value='normal' className='px-6'>
              Normal
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button className='bg-[#2563eb] hover:bg-blue-700 font-bold gap-2'>
          <Plus className='w-4 h-4' /> Add College
        </Button>
      </div>

      <Card className='border-none shadow-sm overflow-hidden'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='bg-slate-50/50'>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 pl-6'>
                  College Name
                </TableHead>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500'>
                  Code
                </TableHead>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500'>
                  Type
                </TableHead>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500'>
                  Location
                </TableHead>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500'>
                  Stats
                </TableHead>
                <TableHead className='py-4 font-bold text-[11px] uppercase tracking-wider text-slate-500'>
                  Status
                </TableHead>
                <TableHead className='py-4 w-12.5'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-64 text-center'>
                    <div className='flex flex-col items-center gap-2 text-slate-400'>
                      <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
                      <p className='text-sm font-medium'>
                        Fetching colleges...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredColleges.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='h-64 text-center text-slate-500'
                  >
                    No colleges found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredColleges.map((college) => (
                  <TableRow
                    key={college.id}
                    className='group hover:bg-slate-50/50'
                  >
                    <TableCell className='py-4 pl-6'>
                      <div className='flex items-center gap-4'>
                        <div className='w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-blue-50 text-blue-600 border border-blue-100'>
                          {getInitials(college.name)}
                        </div>
                        <span className='font-bold text-slate-700 text-sm'>
                          {college.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-slate-500 font-medium text-sm'>
                      {college.short_code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          college.type === 'Barabari'
                            ? 'bg-orange-50 text-orange-600 border-orange-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }
                      >
                        {college.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1.5 text-slate-500 text-sm'>
                        <MapPin className='w-3.5 h-3.5' /> {college.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-4 text-slate-500'>
                        <div className='flex items-center gap-1.5'>
                          <Users className='w-3.5 h-3.5' />
                          <span className='text-sm font-medium'>
                            {college.student_count || 0}
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <BookOpen className='w-3.5 h-3.5' />
                          <span className='text-sm font-medium'>
                            {college.course_count || 0}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          college.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }
                      >
                        {college.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='w-4 h-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem>Manage Courses</DropdownMenuItem>
                          <DropdownMenuItem className='text-red-600'>
                            Deactivate
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
    </div>
  );
}
