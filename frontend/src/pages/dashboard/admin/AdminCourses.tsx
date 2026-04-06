import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import type { Subject } from '@/utils/types';
import {
  Search,
  Plus,
  MoreVertical,
  BookOpen,
  Layers,
  Loader2,
  Edit2,
  Trash2,
  Globe,
  Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCourseModal } from '@/components/common/admin/CreateCourseModal';
import { ManageAccessModal } from '@/components/common/admin/ManageAccessModal';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchSubjects, deleteSubject } from '@/features/subjects/subjectSlice';

export default function AdminCourses() {
  const dispatch = useAppDispatch();
  const { items: courses, status } = useAppSelector((state) => state.subjects);
  const loading = status === 'loading';

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Subject | null>(null);

  useEffect(() => {
    dispatch(fetchSubjects());
  }, [dispatch]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await dispatch(deleteSubject(id)).unwrap();
      toast.success('Course deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete course. Please try again.'));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchSubjects());
  };

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className='p-8 space-y-6 bg-[#f8fafc] min-h-screen'>
      <div className='flex justify-between items-center'>
        <div className='relative w-full max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
          <Input
            placeholder='Search courses...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 bg-white border-slate-200 h-11'
          />
        </div>
        <Button
          onClick={() => {
            setSelectedCourse(null);
            setIsCreateModalOpen(true);
          }}
          className='bg-[#2e3c85] hover:bg-[#25316d] text-white gap-2'
        >
          <Plus className='w-5 h-5' /> Create Course
        </Button>
      </div>

      {loading ? (
        <div className='flex justify-center py-20'>
          <Loader2 className='animate-spin text-slate-400' />
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className='border py-0 border-slate-200 overflow-hidden bg-white rounded-xl shadow-sm'
            >
              <div
                className={`h-1.5 w-full ${
                  course.is_published ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
              <CardHeader className='p-6 pb-4 space-y-4'>
                <div className='flex justify-between items-start'>
                  <div className='flex gap-2'>
                    <Badge
                      variant='secondary'
                      className='font-bold text-[10px] uppercase'
                    >
                      {course.slug}
                    </Badge>
                    {/* Publication Status UI */}
                    {course.is_published ? (
                      <Badge className='bg-green-50 text-green-700 border-green-200 flex gap-1 items-center text-[10px]'>
                        <Globe className='w-3 h-3' /> Published
                      </Badge>
                    ) : (
                      <Badge className='bg-amber-50 text-amber-700 border-amber-200 flex gap-1 items-center text-[10px]'>
                        <Lock className='w-3 h-3' /> Draft
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger className='text-slate-400 hover:text-slate-600 focus:outline-none'>
                      <MoreVertical className='w-5 h-5' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-40'>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsCreateModalOpen(true);
                        }}
                        className='gap-2 cursor-pointer'
                      >
                        <Edit2 className='w-4 h-4' /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(course.id)}
                        className='gap-2 text-red-600 cursor-pointer focus:text-red-600'
                      >
                        <Trash2 className='w-4 h-4' /> Delete Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <h3 className='text-[20px] font-bold text-[#1e293b] truncate'>
                    {course.name}
                  </h3>
                  <p className='text-[14px] text-[#64748b] line-clamp-2 mt-1'>
                    {course.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className='p-6 pt-2 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4 text-[#64748b]'>
                    <span className='flex items-center gap-1.5 text-xs font-medium'>
                      <BookOpen className='w-4 h-4' /> {course.units_count}{' '}
                      Units
                    </span>
                    <span className='flex items-center gap-1.5 text-xs font-medium'>
                      <Layers className='w-4 h-4' /> {course.topics_count}{' '}
                      Lessons
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsAccessModalOpen(true);
                    }}
                    className='text-[#3b49a2] font-bold text-xs hover:underline'
                  >
                    Manage Access
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateCourseModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleRefresh}
        editData={selectedCourse}
      />

      {selectedCourse && (
        <ManageAccessModal
          open={isAccessModalOpen}
          onOpenChange={setIsAccessModalOpen}
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
        />
      )}
    </div>
  );
}
