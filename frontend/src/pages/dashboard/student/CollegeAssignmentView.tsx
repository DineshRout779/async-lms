import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft,
  Calendar,
  Download,
  FileText,
  Link2,
  Loader2,
  ArrowRight,
  Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import type { CollegeAssignment } from '@/utils/types';

export default function CollegeAssignmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignment, setAssignment] = useState<CollegeAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [solution, setSolution] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: CollegeAssignment }>(
        `/college-assignments/${id}`
      );
      const data = res.data.data;
      setAssignment(data);
      
      if (data.submission_link) {
        setSolution(data.submission_link);
        setActiveTab('link');
      } else if ((data as any).submission_file_url) {
        setActiveTab('upload');
      }
    } catch {
      toast.error('Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (activeTab === 'link' && !solution.trim()) {
      toast.error('Please enter a submission link');
      return;
    }

    if (activeTab === 'upload' && !selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      
      if (activeTab === 'link') {
        formData.append('submission_link', solution.trim());
      } else if (selectedFile) {
        formData.append('submission_file', selectedFile);
      }

      await apiClient.post(`/college-assignments/${id}/submit`, formData);

      toast.success('Assignment submitted successfully!');
      setSelectedFile(null);
      fetchAssignment();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to submit assignment';
      toast.error(msg);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className='p-10 text-center'>
        <p className='text-slate-500'>Assignment not found.</p>
        <Button variant='ghost' onClick={() => navigate(-1)} className='mt-4'>
          Go Back
        </Button>
      </div>
    );
  }

  const isSubmitted = Boolean(assignment.submission_link || (assignment as any).submission_file_url);
  const assignmentData = assignment as any;

  return (
    <div className='min-h-screen bg-[#F8FAFC] p-6 md:p-12 animate-in fade-in duration-500'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className='flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm mb-4'
        >
          <ChevronLeft className='w-4 h-4' />
          Back to Assignments
        </button>

        {/* Hero Card */}
        <Card className='border-none rounded-[2rem] p-8 md:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='px-4 py-1 bg-[#E0F2FE] text-[#0369A1] text-[10px] font-black tracking-widest uppercase rounded-full'>
                {assignment.course || 'GENERAL'}
              </span>
              <span
                className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                  isSubmitted
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]'
                }`}
              >
                {isSubmitted ? 'COMPLETED' : 'PENDING'}
              </span>
            </div>
            <h1 className='text-4xl font-black text-[#1E293B] tracking-tight capitalize'>
              {assignment.title}
            </h1>
            <div className='flex items-center gap-2 text-slate-400 font-bold text-sm'>
              <Calendar className='w-4 h-4 text-[#6366F1]' />
              <span>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}</span>
            </div>
          </div>
          <button className='p-4 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100'>
            <Download className='w-5 h-5' />
          </button>
        </Card>

        {/* Two Column Section */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Left: Assignment Brief */}
          <div className='lg:col-span-7 space-y-6'>
            <Card className='border-none rounded-[2rem] p-10 shadow-sm h-full'>
              <div className='space-y-10'>
                <div className='space-y-4'>
                  <h2 className='text-xl font-black text-[#1E293B]'>Assignment Brief</h2>
                  <div className='prose prose-sm max-w-none text-[#64748B] font-medium leading-7'>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {assignment.description || 'No description provided.'}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className='pt-8 border-t border-slate-50'>
                  {assignmentData.instruction_file_url ? (
                    <a 
                      href={assignmentData.instruction_file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className='flex items-center gap-3 text-[#6366F1] font-black text-sm hover:underline hover:gap-4 transition-all'
                    >
                      <FileText className='w-5 h-5' />
                      Download Requirements {assignmentData.instruction_file_name?.toLowerCase().includes('pdf') ? 'PDF' : 'Document'}
                    </a>
                  ) : (
                    <button 
                      disabled
                      className='flex items-center gap-3 text-slate-300 font-black text-sm cursor-not-allowed'
                    >
                      <FileText className='w-5 h-5' />
                      No Requirements Document Attached
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Submit Assignment */}
          <div className='lg:col-span-5 space-y-6'>
            <Card className='border-none rounded-[2rem] p-10 shadow-sm space-y-8'>
              <h2 className='text-xl font-black text-[#1E293B]'>Submit Assignment</h2>

              {/* Tabs Switcher */}
              <div className='bg-[#F1F5F9] p-1.5 rounded-2xl flex'>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    activeTab === 'upload'
                      ? 'bg-[#1E293B] text-white shadow-lg'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    activeTab === 'link'
                      ? 'bg-[#1E293B] text-white shadow-lg'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  Link / URL
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-[2rem] p-12 text-center space-y-4 transition-all group cursor-pointer ${
                    selectedFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-[#CBD5E1] hover:border-[#6366F1] hover:bg-slate-50/50'
                  }`}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                  />
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 ${
                    selectedFile ? 'bg-emerald-100' : 'bg-[#EEF2FF]'
                  }`}>
                    <Upload className={`w-6 h-6 ${selectedFile ? 'text-emerald-600' : 'text-[#6366F1]'}`} />
                  </div>
                  <div className='space-y-1'>
                    <p className='text-sm font-bold text-[#1E293B]'>
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className='text-xs text-[#94A3B8] font-medium'>
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, ZIP, or RAR (Max 10MB)'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='relative'>
                    <Link2 className='absolute left-4 top-4 w-5 h-5 text-[#6366F1]' />
                    <textarea
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      placeholder='https://github.com/your-project'
                      className='w-full rounded-2xl border-2 border-[#F1F5F9] px-12 py-4 text-sm font-medium focus:border-[#6366F1] outline-none transition-all placeholder:text-[#CBD5E1] min-h-[140px] resize-none'
                    />
                  </div>
                  <p className='text-xs text-[#94A3B8] italic px-2'>
                    Provide your codebase or live demo link.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || (activeTab === 'upload' && !selectedFile) || (activeTab === 'link' && !solution.trim())}
                className='w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-100 disabled:opacity-50 disabled:shadow-none bg-[#7489C6] hover:bg-[#5E73AF] text-white'
              >
                {submitting ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>
                    Submit Assignment
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </Button>
              
              {isSubmitted && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest pt-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   Submission Received
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
