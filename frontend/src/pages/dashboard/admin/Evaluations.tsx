import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/services/api';

interface Submission {
  id: string;
  student_name: string;
  subject_short: string;
  task_name: string;
  type: 'Mini Project' | 'Code' | 'Design';
  submitted_at: string;
  status: 'PENDING' | 'CHANGES REQUESTED' | 'GRADED';
}

const Evaluations = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await apiClient.get<Submission[]>(
          '/admin/project-submissions'
        );
        setSubmissions(response.data);
      } catch {
        // submissions remains empty — empty state is shown below
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter((s) => s.status !== 'GRADED');

  const gradedSubmissions = submissions.filter((s) => s.status === 'GRADED');

  const visibleSubmissions =
    activeTab === 'pending' ? pendingSubmissions : gradedSubmissions;

  if (loading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      {/* Header & Tabs */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div className='bg-slate-100 p-1 rounded-lg flex gap-1'>
          <Button
            variant={activeTab === 'pending' ? 'secondary' : 'ghost'}
            size='sm'
            className={
              activeTab === 'pending' ? 'shadow-sm bg-white' : 'text-slate-500'
            }
            onClick={() => setActiveTab('pending')}
          >
            Pending Review ({pendingSubmissions.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'secondary' : 'ghost'}
            size='sm'
            className={
              activeTab === 'history' ? 'shadow-sm bg-white' : 'text-slate-500'
            }
            onClick={() => setActiveTab('history')}
          >
            Grading History ({gradedSubmissions.length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className='border-none shadow-sm overflow-hidden'>
        <Table>
          <TableHeader className='bg-slate-50/50'>
            <TableRow>
              <TableHead className='text-xs font-bold uppercase text-slate-500'>
                Student
              </TableHead>
              <TableHead className='text-xs font-bold uppercase text-slate-500'>
                Task
              </TableHead>
              <TableHead className='text-xs font-bold uppercase text-slate-500'>
                Type
              </TableHead>
              <TableHead className='text-xs font-bold uppercase text-slate-500'>
                Submitted
              </TableHead>
              <TableHead className='text-xs font-bold uppercase text-slate-500'>
                Status
              </TableHead>
              <TableHead className='text-xs font-bold uppercase text-slate-500 text-right'>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleSubmissions.map((sub) => (
              <TableRow key={sub.id} className='hover:bg-slate-50/50'>
                <TableCell>
                  <p className='font-bold text-slate-900'>{sub.student_name}</p>
                  <p className='text-xs text-slate-400'>{sub.subject_short}</p>
                </TableCell>

                <TableCell className='font-medium text-slate-700'>
                  {sub.task_name}
                </TableCell>

                <TableCell>
                  <Badge className='bg-blue-50 text-blue-600 border-none'>
                    {sub.type}
                  </Badge>
                </TableCell>

                <TableCell className='text-sm text-slate-500'>
                  {new Date(sub.submitted_at)
                    .toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    .replace(',', '')}
                </TableCell>

                <TableCell>
                  {sub.status === 'PENDING' && (
                    <StatusBadge
                      icon={Clock}
                      text='PENDING'
                      className='bg-blue-50 text-blue-600'
                    />
                  )}
                  {sub.status === 'CHANGES REQUESTED' && (
                    <StatusBadge
                      icon={AlertCircle}
                      text='CHANGES'
                      className='bg-orange-50 text-orange-600'
                    />
                  )}
                  {sub.status === 'GRADED' && (
                    <StatusBadge
                      icon={CheckCircle}
                      text='GRADED'
                      className='bg-emerald-50 text-emerald-600'
                    />
                  )}
                </TableCell>

                <TableCell className='text-right'>
                  <Button
                    variant='link'
                    className='text-blue-600 font-bold hover:no-underline'
                    onClick={() => navigate(`/admin/evaluate/${sub.id}`)}
                  >
                    {sub.status === 'GRADED' ? 'View' : 'Grade Now'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {visibleSubmissions.length === 0 && (
          <div className='p-20 text-center'>
            <p className='text-slate-400'>
              {activeTab === 'pending'
                ? 'No submissions pending review.'
                : 'No grading history available.'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Evaluations;

/* ======================
   Small Helper
====================== */

function StatusBadge({
  icon: Icon,
  text,
  className,
}: {
  icon: any;
  text: string;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md w-fit text-[10px] font-bold ${className}`}
    >
      <Icon className='w-3.5 h-3.5' />
      {text}
    </div>
  );
}
