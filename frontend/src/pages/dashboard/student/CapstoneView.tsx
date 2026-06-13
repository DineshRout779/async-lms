import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  Loader2,
  XCircle,
  Trophy,
  CheckCircle2,
  Link2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

interface CapstoneDetail {
  id: string;
  title: string;
  instructions?: string | null;
  max_score: number;
  submission_link?: string | null;
  submitted_at?: string | null;
  is_approved?: boolean | null;
}

export default function CapstoneView() {
  const { projectId } = useParams();
  const [capstone, setCapstone] = useState<CapstoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchCapstone = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await apiClient.get<{
          success: boolean;
          data: CapstoneDetail;
        }>(`/students/capstone/${projectId}`);
        const data = res.data.data;
        setCapstone(data);
        if (data.submission_link) setLink(data.submission_link);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCapstone();
  }, [projectId]);

  const handleSubmit = async () => {
    if (!link.trim()) {
      toast.error('Please enter a submission link');
      return;
    }
    try {
      new URL(link.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post<{
        success: boolean;
        data: { submission_link: string; submitted_at: string };
      }>(`/students/capstone/${projectId}/submit`, {
        submission_link: link.trim(),
      });
      setCapstone((prev) => (prev ? { ...prev, ...res.data.data } : prev));
      toast.success('Capstone submitted! +20 XP');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit capstone'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-amber-500' />
      </div>
    );
  }

  if (error || !capstone) {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center'>
        <XCircle className='h-12 w-12 text-red-400' />
        <p className='text-lg font-semibold text-slate-700'>
          Failed to load capstone project
        </p>
        <p className='text-sm text-slate-500'>Please try refreshing the page.</p>
      </div>
    );
  }

  const isSubmitted = Boolean(capstone.submission_link);

  return (
    <div className='mx-auto max-w-4xl space-y-8 p-6 md:p-10'>
      {/* Header */}
      <header className='space-y-3'>
        <div className='flex items-start gap-3'>
          <Trophy className='h-7 w-7 text-amber-500 shrink-0 mt-1' />
          <h1 className='text-3xl font-extrabold tracking-tight text-slate-900'>
            {capstone.title}
          </h1>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge className='bg-amber-50 text-amber-700 border border-amber-200'>
            Capstone Project
          </Badge>
          <Badge className='bg-slate-100 text-slate-600 border border-slate-200'>
            +{capstone.max_score} XP
          </Badge>
          {isSubmitted && (
            <Badge className='bg-emerald-50 text-emerald-700 border border-emerald-200'>
              <CheckCircle2 className='h-3 w-3 mr-1' />
              Submitted
            </Badge>
          )}
          {capstone.is_approved && (
            <Badge className='bg-green-100 text-green-700 border border-green-200'>
              Approved
            </Badge>
          )}
        </div>
      </header>

      {/* Instructions */}
      <Card className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
        <div className='bg-amber-50 px-6 py-4'>
          <p className='text-xs font-semibold uppercase tracking-widest text-amber-600'>
            Project Instructions
          </p>
          <p className='text-sm text-slate-600 mt-0.5'>
            Read carefully before starting
          </p>
        </div>
        <div className='bg-white px-6 py-8'>
          {capstone.instructions ? (
            <div className='prose prose-slate max-w-none lg:prose-lg'>
              {/^<[a-z][\s\S]*>/i.test(capstone.instructions.trimStart()) ? (
                <div dangerouslySetInnerHTML={{ __html: capstone.instructions }} />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {capstone.instructions}
                </ReactMarkdown>
              )}
            </div>
          ) : (
            <p className='italic text-slate-400'>No instructions provided.</p>
          )}
        </div>
      </Card>

      {/* Submission */}
      <Card className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
        <div className='bg-slate-50 px-6 py-4'>
          <p className='text-xs font-semibold uppercase tracking-widest text-slate-400'>
            Your Submission
          </p>
          <p className='text-sm text-slate-600 mt-0.5'>
            {isSubmitted
              ? 'Already submitted — submit again to update your link'
              : 'Paste the link to your completed project'}
          </p>
        </div>
        <div className='bg-white px-6 py-8 space-y-4'>
          {isSubmitted && (
            <div className='flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
              <span className='text-emerald-700 font-medium'>
                Submitted on{' '}
                {new Date(capstone.submitted_at!).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          <div className='flex gap-3'>
            <div className='relative flex-1'>
              <Link2 className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
              <Input
                type='url'
                placeholder='https://github.com/your-capstone-project'
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className='pl-9'
              />
            </div>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              className='bg-amber-500 hover:bg-amber-600 shrink-0'
            >
              {isSubmitted ? 'Update' : 'Submit'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
