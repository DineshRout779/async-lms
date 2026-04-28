import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Code2, Download, Eye, FileText, ListChecks,
  Loader2, MonitorPlay, Save, Sparkles, Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import type { AiExercise, AiLesson, AiQuizQuestion } from '@/features/aiCurriculum/types';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import { AI_ACTIONS, getLessonMeta, type SidebarTab } from './types';

// ─── Tab strip ────────────────────────────────────────────────────────────────

function SidebarTabStrip({ activeTab, onTab, quizCount, hasExercise }: {
  activeTab: SidebarTab;
  onTab: (t: SidebarTab) => void;
  quizCount: number;
  hasExercise: boolean;
}) {
  const tabs: { id: SidebarTab; label: string; icon: React.ElementType; activeColor: string }[] = [
    { id: 'video',    label: 'Video',                                    icon: MonitorPlay, activeColor: 'text-red-500 border-red-400' },
    { id: 'content',  label: 'Content',                                  icon: FileText,    activeColor: 'text-blue-500 border-blue-400' },
    { id: 'exercise', label: hasExercise ? 'Exercise' : 'Exercise',      icon: Code2,       activeColor: 'text-indigo-500 border-indigo-400' },
    { id: 'quiz',     label: quizCount > 0 ? `Quiz (${quizCount})` : 'Quiz', icon: ListChecks, activeColor: 'text-orange-500 border-orange-400' },
  ];
  return (
    <div className='flex border-b border-slate-100 -mx-4 px-1'>
      {tabs.map(({ id, label, icon: Icon, activeColor }) => (
        <button key={id} onClick={() => onTab(id)}
          className={`flex items-center gap-1 px-2 py-2 text-[10px] font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === id ? `${activeColor} border-current` : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Icon className='w-3 h-3' />{label}
        </button>
      ))}
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

export function RightSidebar({
  selectedLesson,
  canEdit,
  onUpdateLesson,
}: {
  selectedLesson: AiLesson | null;
  canEdit: boolean;
  onUpdateLesson: (id: string, data: Partial<AiLesson>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Partial<AiLesson>>({});
  const [saving, setSaving] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('video');
  const [contentPreview, setContentPreview] = useState(false);

  useEffect(() => {
    if (selectedLesson) {
      setDraft({ ...selectedLesson });
      setDirty(false);
      setContentPreview(false);
      setSidebarTab(getLessonMeta(selectedLesson).tab);
    }
  }, [selectedLesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<AiLesson>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    try {
      await onUpdateLesson(selectedLesson.id, draft);
      setDirty(false);
      toast.success('Lesson saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAiAction = async (instruction: string, label: string) => {
    if (!selectedLesson) return;
    setAiAction(label);
    try {
      const res = await aiCurriculumApi.regenerateLesson(selectedLesson.id, instruction);
      const updated = res.data.data;
      setDraft((d) => ({ ...d, ...updated }));
      await onUpdateLesson(selectedLesson.id, updated);
      setDirty(false);
      toast.success(`${label} applied`);
    } catch {
      toast.error('AI action failed');
    } finally {
      setAiAction(null);
    }
  };

  const handleDownloadMarkdown = () => {
    const content = draft.explanation ?? '';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(draft.title ?? 'lesson').replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update({ explanation: ev.target?.result as string });
    reader.readAsText(file);
    e.target.value = '';
  };

  const quizQuestions = useMemo<AiQuizQuestion[]>(
    () => Array.isArray(draft.quiz_questions) ? (draft.quiz_questions as AiQuizQuestion[]) : [],
    [draft.quiz_questions],
  );
  const exercise = useMemo<AiExercise | null>(() => {
    if (!draft.exercise_data) return null;
    return typeof draft.exercise_data === 'string'
      ? JSON.parse(draft.exercise_data as string)
      : (draft.exercise_data as AiExercise);
  }, [draft.exercise_data]);

  return (
    <div className='flex flex-col gap-4 sticky top-4 max-h-[calc(100vh-100px)]'>
      {/* AI Actions */}
      <div className='bg-white border border-slate-200 rounded-xl overflow-hidden'>
        <div className='flex items-center gap-2 px-4 py-3 border-b border-slate-100'>
          <Sparkles className='w-4 h-4 text-indigo-500' />
          <span className='text-sm font-bold text-slate-800'>AI Actions</span>
          {!selectedLesson && <span className='ml-auto text-[11px] text-slate-400'>Select a subtopic first</span>}
        </div>
        <div className='p-2 space-y-0.5'>
          {AI_ACTIONS.map(({ label, instruction }) => (
            <button key={label}
              disabled={!selectedLesson || !canEdit || aiAction !== null}
              onClick={() => handleAiAction(instruction, label)}
              className='w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {aiAction === label
                ? <Loader2 className='w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin' />
                : <Sparkles className='w-3.5 h-3.5 text-indigo-400 shrink-0' />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit panel */}
      <div className='bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0'>
        {!selectedLesson ? (
          <div className='px-4 py-10 text-center'>
            <MonitorPlay className='w-8 h-8 text-slate-200 mx-auto mb-2' />
            <p className='text-xs text-slate-400'>Select a subtopic to edit</p>
          </div>
        ) : (
          <>
            <div className='px-4 pt-3 pb-0 shrink-0'>
              <div className='flex items-center justify-between mb-2'>
                <p className='text-[11px] font-bold text-slate-800 truncate flex-1'>{draft.title || 'Untitled Subtopic'}</p>
                {dirty && <span className='text-[10px] text-amber-500 font-semibold shrink-0 ml-2'>Unsaved</span>}
              </div>
              <div className='flex gap-2 mb-3'>
                <input
                  className='flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400'
                  placeholder='Subtopic title'
                  disabled={!canEdit}
                  value={draft.title ?? ''}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <div className='relative w-16 shrink-0'>
                  <input type='number' min={1} disabled={!canEdit}
                    className='w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 pr-6'
                    value={draft.duration_mins ?? 20}
                    onChange={(e) => update({ duration_mins: Number(e.target.value) })}
                  />
                  <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none'>m</span>
                </div>
              </div>
              <SidebarTabStrip activeTab={sidebarTab} onTab={setSidebarTab} quizCount={quizQuestions.length} hasExercise={!!exercise} />
            </div>

            <div className='overflow-y-auto flex-1'>
              {sidebarTab === 'video' && (
                <div className='p-4 space-y-3'>
                  <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>YouTube URL</label>
                  <input
                    className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400'
                    placeholder='https://youtube.com/watch?v=...'
                    disabled={!canEdit}
                    value={draft.video_url ?? ''}
                    onChange={(e) => update({ video_url: e.target.value || null })}
                  />
                  {draft.video_url && (
                    <a href={draft.video_url} target='_blank' rel='noopener noreferrer'
                      className='mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700'>
                      <MonitorPlay className='w-3 h-3' /> Watch on YouTube
                    </a>
                  )}
                </div>
              )}

              {sidebarTab === 'content' && (
                <div className='p-4 space-y-3'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <button onClick={() => setContentPreview((v) => !v)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${contentPreview ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                      <Eye className='w-3 h-3' />{contentPreview ? 'Edit' : 'Preview'}
                    </button>
                    <button onClick={handleDownloadMarkdown}
                      className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors'>
                      <Download className='w-3 h-3' /> Download
                    </button>
                    <label className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer'>
                      <Upload className='w-3 h-3' /> Upload
                      <input type='file' accept='.md,.txt' className='hidden' onChange={handleUploadMarkdown} />
                    </label>
                  </div>

                  <div>
                    <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>
                      Explanation <span className='font-normal text-slate-400'>(Markdown)</span>
                    </label>
                    {contentPreview ? (
                      <div className='border border-slate-200 rounded-lg px-3 py-3 min-h-40 prose prose-sm max-w-none text-slate-700 text-[13px] overflow-auto'>
                        {draft.explanation
                          ? <ReactMarkdown>{draft.explanation}</ReactMarkdown>
                          : <span className='text-slate-300 italic'>No content yet</span>}
                      </div>
                    ) : (
                      <textarea rows={8} disabled={!canEdit}
                        className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
                        placeholder={'## Introduction\n\nExplain the concept here...'}
                        value={draft.explanation ?? ''}
                        onChange={(e) => update({ explanation: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>Example</label>
                    <textarea rows={4} disabled={!canEdit}
                      className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
                      placeholder='// Code example...'
                      value={draft.example ?? ''}
                      onChange={(e) => update({ example: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>Activity</label>
                    <textarea rows={3} disabled={!canEdit}
                      className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none'
                      placeholder='Short in-lesson activity...'
                      value={draft.activity ?? ''}
                      onChange={(e) => update({ activity: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {sidebarTab === 'exercise' && (
                <div className='p-4 space-y-3'>
                  {exercise ? (
                    <>
                      <div className='bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5'>
                        <p className='text-[12px] font-bold text-indigo-800'>{exercise.title}</p>
                        <p className='text-[11px] text-indigo-600 mt-0.5'>{exercise.description}</p>
                      </div>
                      {exercise.tasks?.length > 0 && (
                        <div>
                          <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>Tasks</label>
                          <div className='space-y-1.5'>
                            {exercise.tasks.map((task, ti) => (
                              <div key={ti} className='flex items-start gap-2 text-[12px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2'>
                                <span className='w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5'>{ti + 1}</span>
                                {task}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {exercise.starter_code && (
                        <div>
                          <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>Starter Code</label>
                          <pre className='bg-slate-900 text-green-400 text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono'>{exercise.starter_code}</pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className='py-6 text-center text-[12px] text-slate-400'>No exercise for this subtopic</div>
                  )}
                </div>
              )}

              {sidebarTab === 'quiz' && (
                <div className='p-4 space-y-3'>
                  {quizQuestions.length > 0 ? quizQuestions.map((q, qi) => (
                    <div key={qi} className='border border-slate-100 rounded-lg overflow-hidden'>
                      <div className='bg-slate-50 px-3 py-2 flex items-start gap-2'>
                        <span className='text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-px shrink-0 mt-0.5'>Q{qi + 1}</span>
                        <p className='text-[12px] text-slate-700 leading-snug'>{q.question}</p>
                      </div>
                      <div className='divide-y divide-slate-50'>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${oi === q.correct_index ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-600'}`}>
                            <CheckCircle2 className={`w-3 h-3 shrink-0 ${oi === q.correct_index ? 'text-green-500' : 'text-slate-200'}`} />
                            {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className='px-3 py-2 bg-blue-50 border-t border-blue-100 text-[11px] text-blue-600'>{q.explanation}</div>
                      )}
                    </div>
                  )) : (
                    <div className='py-6 text-center text-[12px] text-slate-400'>No quiz questions for this subtopic</div>
                  )}
                </div>
              )}
            </div>

            {canEdit && (
              <div className='border-t border-slate-100 p-3 shrink-0'>
                <button onClick={handleSave} disabled={saving || !dirty}
                  className='w-full flex items-center justify-center gap-2 py-2 bg-[#1e2653] text-white text-[13px] font-bold rounded-lg hover:bg-[#16203f] disabled:opacity-40 transition-colors'>
                  {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Save className='w-3.5 h-3.5' />}
                  {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
