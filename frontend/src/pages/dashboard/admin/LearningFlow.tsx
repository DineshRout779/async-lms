import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  FileText,
  Layout,
  //   Search,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';

// --- Types & Interfaces ---

interface Subtopic {
  id: string; // UUID
  title: string;
  slug: string;
}

interface Topic {
  id: string; // UUID
  title: string;
  subtopics: Subtopic[];
}

interface Subject {
  id: string; // UUID
  name: string;
  slug: string;
  description: string;
}

interface SubjectDetailResponse {
  success: boolean;
  name: string;
  description: string;
  data: Topic[]; // The structure array
}

interface SubjectListResponse {
  success: boolean;
  data: Subject[];
}

const LearningFlow: React.FC = () => {
  // States with explicit types
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [structure, setStructure] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingStructure, setFetchingStructure] = useState<boolean>(false);

  // 1. Initial Load: Get all subjects
  useEffect(() => {
    const fetchSubjects = async (): Promise<void> => {
      try {
        const res = await apiClient.get<SubjectListResponse>('/subjects');
        if (res.data.success) {
          setSubjects(res.data.data);
          // Default to first subject if available
          if (res.data.data.length > 0) {
            handleSubjectChange(res.data.data[0].slug);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subjects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // 2. Fetch specific hierarchy when a subject is selected
  const handleSubjectChange = async (slug: string): Promise<void> => {
    setFetchingStructure(true);
    try {
      const res = await apiClient.get<SubjectDetailResponse>(
        `/subjects/${slug}`
      );
      if (res.data.success) {
        setSelectedSubject({ slug, name: res.data.name });
        setStructure(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch structure', err);
    } finally {
      setFetchingStructure(false);
    }
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    handleSubjectChange(e.target.value);
  };

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-slate-50'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='flex min-h-screen gap-6 bg-[#F8FAFC] p-8'>
      {/* Main Builder Content */}
      <div className='flex-1 space-y-6'>
        <header className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-1 flex items-center gap-3 text-indigo-600'>
            <Layout className='h-5 w-5' />
            <h1 className='text-lg font-bold'>Learning Flow Builder</h1>
          </div>
          <p className='text-sm text-slate-500'>
            Design the curriculum structure
          </p>
        </header>

        {fetchingStructure ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-slate-300' />
          </div>
        ) : (
          selectedSubject && (
            <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='mb-8 flex items-center justify-between'>
                <div>
                  <h2 className='text-xl font-bold text-slate-900'>
                    {selectedSubject.name}
                  </h2>
                  <span className='font-mono text-xs uppercase text-slate-400'>
                    {selectedSubject.slug}
                  </span>
                </div>
                <Button className='border border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50'>
                  <Plus className='mr-2 h-4 w-4' /> Add New Unit
                </Button>
              </div>

              {/* Units (Topics from DB) */}
              <div className='space-y-6'>
                {structure.map((topic: Topic, index: number) => (
                  <div
                    key={topic.id}
                    className='overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30'
                  >
                    <div className='flex items-center justify-between border-b border-slate-100 bg-white p-4'>
                      <div className='flex items-center gap-3'>
                        <ChevronDown className='h-4 w-4 text-slate-400' />
                        <span className='font-semibold text-slate-800'>
                          Unit {index + 1}: {topic.title}
                        </span>
                      </div>
                      <div className='flex items-center gap-3 text-slate-300'>
                        <ArrowUp className='h-4 w-4 cursor-pointer hover:text-slate-600' />
                        <ArrowDown className='h-4 w-4 cursor-pointer hover:text-slate-600' />
                        <div className='mx-1 h-4 w-px bg-slate-200' />
                        <Trash2 className='h-4 w-4 cursor-pointer hover:text-red-500' />
                      </div>
                    </div>

                    {/* Content Steps (Subtopics from DB) */}
                    <div className='space-y-3 p-4'>
                      {topic.subtopics.map((sub: Subtopic) => (
                        <div
                          key={sub.id}
                          className='flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm'
                        >
                          <div className='flex items-center gap-4'>
                            <div className='rounded-lg bg-slate-50 p-2'>
                              <FileText className='h-5 w-5 text-slate-400' />
                            </div>
                            <div>
                              <p className='text-sm font-bold text-slate-700'>
                                {sub.title}
                              </p>
                              <div className='mt-0.5 flex items-center gap-2'>
                                <span className='rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500'>
                                  TEXT
                                </span>
                                <span className='text-[10px] font-bold uppercase text-red-500'>
                                  • Mandatory
                                </span>
                              </div>
                            </div>
                          </div>
                          <Trash2 className='h-4 w-4 cursor-pointer text-slate-300 hover:text-red-400' />
                        </div>
                      ))}
                      <button className='w-full rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-400 transition-all hover:border-indigo-300 hover:text-indigo-500'>
                        + Add Content Step
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Right Sidebar: Configuration */}
      <div className='w-80'>
        <Card className='sticky top-8 border-slate-200 p-6 shadow-sm'>
          <div className='mb-6 flex items-center gap-2 text-slate-800'>
            <Settings className='h-4 w-4' />
            <h3 className='font-bold'>Flow Configuration</h3>
          </div>

          <div className='space-y-6'>
            {/* Subject Dropdown */}
            <div>
              <label className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
                Editing Course
              </label>
              <select
                className='mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                value={selectedSubject?.slug || ''}
                onChange={handleSelectChange}
              >
                {subjects.map((s: Subject) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* College Assignment */}
            {/* <div>
              <label className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
                Apply to Colleges
              </label>
              <div className='relative mt-2'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  type='text'
                  placeholder='Search college...'
                  className='w-full rounded-lg border border-slate-200 p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                />
              </div>
            </div> */}

            <Button className='w-full rounded-xl bg-[#0F172A] py-6 text-white transition-colors hover:bg-slate-800'>
              Save & Apply
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LearningFlow;
