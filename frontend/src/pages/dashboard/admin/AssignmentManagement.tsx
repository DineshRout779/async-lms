import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, Play, Eye, Loader2, Edit3, BarChart2 } from 'lucide-react';
import apiClient from '@/services/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

/* ======================
   Types
====================== */

interface Assignment {
  id: number;
  name: string;
  course: string;
  college: string;
  collegeId: string;
  batch: string;
  submissionsCount: number;
  submissionsTotal: number;
  dueDate: string;
  rawDueDate?: string;
  status: 'Active' | 'Submitted' | 'Completed' | 'Pending' | 'Overdue';
}

/* ======================
   Static Data
====================== */

type Tab = 'Active' | 'Submitted' | 'Completed';

/* ======================
   Component
====================== */

export default function AssignmentManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch assignments on mount
  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: any[] }>('/college-assignments/manage')
      .then((res) => {
        const mapped = res.data.data.map((item) => ({
          id: item.id,
          name: item.title,
          course: item.course || 'N/A',
          college: item.college_name,
          collegeId: item.college_id,
          batch: item.batch || 'N/A',
          submissionsCount: 0,
          submissionsTotal: 0,
          dueDate: item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No Due Date',
          rawDueDate: item.due_date ? item.due_date.split('T')[0] : '',
          status: 'Active' as const, // Placeholder default to match 'Active' tab
        }));
        setAssignments(mapped);
      })
      .catch((err) => console.error('Failed to load assignments', err))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { label: string; value: Tab; dot?: string }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Submitted – Pending Evaluation', value: 'Submitted', dot: 'bg-amber-400' },
    { label: 'Completed', value: 'Completed' },
  ];

  // Derive unique colleges
  const uniqueColleges = Array.from(
    new Map(assignments.map((a) => [a.collegeId, a.college])).entries()
  );

  // Simple client-side filter
  const filtered = assignments.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCollege = collegeFilter === 'all' || a.collegeId === collegeFilter;
    // Add batch/domain filters here when implemented in DB
    return matchesSearch && matchesCollege;
  });

  const getStatusBadge = (status: Assignment['status']) => {
    switch (status) {
      case 'Active':
        return (
          <Badge className='bg-emerald-50 text-emerald-600 hover:bg-emerald-50 font-medium text-xs rounded-full px-3'>
            Active
          </Badge>
        );
      case 'Submitted':
        return (
          <Badge className='bg-amber-50 text-amber-600 hover:bg-amber-50 font-medium text-xs rounded-full px-3'>
            Submitted
          </Badge>
        );
      case 'Completed':
        return (
          <Badge className='bg-blue-50 text-blue-600 hover:bg-blue-50 font-medium text-xs rounded-full px-3'>
            Completed
          </Badge>
        );
      case 'Pending':
        return (
          <Badge className='bg-blue-50 text-blue-600 hover:bg-blue-50 font-medium text-xs'>
            Pending
          </Badge>
        );
      case 'Overdue':
        return (
          <Badge className='bg-red-50 text-red-600 hover:bg-red-50 font-medium text-xs'>
            Overdue
          </Badge>
        );
    }
  };

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      {/* Breadcrumb */}
      <div className='text-sm text-slate-500'>
        Dashboard / <span className='font-medium text-slate-700'>Assignment Management</span>
      </div>

      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold text-slate-900'>Assignment Management</h1>
          <p className='text-sm text-slate-500 mt-0.5'>Create, manage and track assignments</p>
        </div>
        <Button
          className='gap-2 bg-blue-600 hover:bg-blue-700'
          onClick={() => navigate('/dashboard/admin/create-assignment')}
        >
          <Plus className='w-4 h-4' />
          Create Assignment
        </Button>
      </div>

      {/* Filters Row */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <Input
            className='pl-9'
            placeholder='Search assignments...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={collegeFilter} onValueChange={setCollegeFilter}>
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder='All Colleges' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Colleges</SelectItem>
            {uniqueColleges.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className='w-[150px]'>
            <SelectValue placeholder='All Domains' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Domains</SelectItem>
            <SelectItem value='frontend'>Frontend</SelectItem>
            <SelectItem value='backend'>Backend</SelectItem>
            <SelectItem value='fullstack'>Full Stack</SelectItem>
          </SelectContent>
        </Select>

        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='All Batches' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Batches</SelectItem>
            <SelectItem value='a'>Batch A</SelectItem>
            <SelectItem value='b'>Batch B</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className='flex items-center gap-4 border-b border-slate-200 pb-0'>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className='border-none shadow-sm overflow-hidden'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='bg-slate-50/50'>
              <TableRow>
                <TableHead className='pl-6'>Assignment Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right pr-6'>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-40 text-center text-slate-500'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <Loader2 className='w-6 h-6 animate-spin text-blue-600' />
                      <p>Loading assignments...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-40 text-center text-slate-500'>
                    No assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((assignment) => (
                  <TableRow key={assignment.id} className='hover:bg-slate-50/50'>
                    <TableCell className='pl-6 font-medium text-slate-800 text-sm'>
                      {assignment.name}
                    </TableCell>
                    <TableCell className='text-slate-500 text-sm'>
                      {assignment.course}
                    </TableCell>
                    <TableCell className='text-slate-500 text-sm'>
                      {assignment.college}
                    </TableCell>
                    <TableCell className='text-slate-500 text-sm'>
                      {assignment.batch}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-semibold ${
                          assignment.submissionsCount === assignment.submissionsTotal
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {assignment.submissionsCount}/{assignment.submissionsTotal}
                      </span>
                    </TableCell>
                    <TableCell className='text-slate-500 text-sm'>
                      {assignment.dueDate}
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell className='text-right pr-6'>
                      <div className='flex items-center justify-end gap-3'>
                        {activeTab === 'Active' && (
                          <button
                            className='flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition font-medium'
                            onClick={() => {
                              navigate('/dashboard/admin/create-assignment', {
                                state: {
                                  editId: assignment.id,
                                  title: assignment.name,
                                  course: assignment.course === 'N/A' ? '' : assignment.course,
                                  collegeId: assignment.collegeId,
                                  deadline: assignment.rawDueDate || '',
                                  description: '', // Since description isn't in this table view, it'll start empty unless fetched
                                },
                              });
                            }}
                          >
                            <Edit3 className='w-3.5 h-3.5' />
                            Edit
                          </button>
                        )}
                        {activeTab === 'Submitted' && (
                          <>
                            <button className='flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition font-medium'>
                              <Play className='w-3.5 h-3.5' />
                              Run Evaluation
                            </button>
                            <button className='flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition font-medium'>
                              <Eye className='w-3.5 h-3.5' />
                              View Submissions
                            </button>
                          </>
                        )}
                        {activeTab === 'Completed' && (
                          <>
                            <button className='flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition font-medium'>
                              <Eye className='w-3.5 h-3.5' />
                              View
                            </button>
                            <button className='flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-700 transition font-medium'>
                              <BarChart2 className='w-3.5 h-3.5' />
                              Analytics
                            </button>
                          </>
                        )}
                      </div>
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
