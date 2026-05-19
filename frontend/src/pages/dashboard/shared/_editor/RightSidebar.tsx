import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Code2, Download, Eye, FileText,
  Loader2, MonitorPlay, Pencil, Save, Sparkles, Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import type { AiExercise, AiLesson } from '@/features/aiCurriculum/types';


type Tab = 'video' | 'content' | 'exercise';

// ─── Tab strip ────────────────────────────────────────────────────────────────

function TabStrip({ active, onTab }: { active: Tab; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'video',    label: 'Video',    icon: MonitorPlay },
    { id: 'content',  label: 'Content',  icon: FileText },
    { id: 'exercise', label: 'Exercise', icon: Code2 },
  ];
  return (
    <div className='flex border-b border-slate-100'>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTab(id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold border-b-2 transition-colors ${
            active === id
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Icon className='w-3.5 h-3.5' />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Video tab ────────────────────────────────────────────────────────────────

type VideoResult = {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
  url: string;
};

function VideoTab({
  lesson,
  canEdit,
  searching,
  videoResults,
  onSearchYouTube,
  onSelectVideo,
  onUpdateLesson,
}: {
  lesson: AiLesson;
  canEdit: boolean;
  searching: boolean;
  videoResults: VideoResult[];
  onSearchYouTube: () => void;
  onSelectVideo: (url: string) => void;
  onUpdateLesson: (data: Partial<AiLesson>) => Promise<void>;
}) {
  const [url, setUrl] = useState(lesson.video_url ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setUrl(lesson.video_url ?? ''); }, [lesson.video_url]);

  const handleSave = async () => {
    const trimmed = url.trim();
    if (trimmed === (lesson.video_url ?? '')) return;
    setSaving(true);
    try {
      await onUpdateLesson({ video_url: trimmed || null });
      toast.success('Video URL saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const videoId = useMemo(() => {
    try {
      const u = new URL(url);
      return u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null;
    } catch { return null; }
  }, [url]);

  return (
    <div className='p-5 space-y-4 flex-1 overflow-y-auto'>
      {/* Embed preview */}
      {videoId && !url.includes('results?') && (
        <div className='rounded-xl overflow-hidden aspect-video bg-black'>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className='w-full h-full'
            allowFullScreen
            title='Video preview'
          />
        </div>
      )}

      {url && url.includes('results?') && (
        <div className='bg-slate-50 border border-slate-200 rounded-xl p-5 text-center'>
          <MonitorPlay className='w-6 h-6 text-slate-400 mx-auto mb-2' />
          <p className='text-[12px] font-semibold text-slate-700 mb-1'>Search Result URL</p>
          <p className='text-[11px] text-slate-500 mb-3'>AI returned a search query instead of a specific video.</p>
          <a href={url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold text-[11px] hover:bg-red-100 transition-colors'>
            Open Search Results
          </a>
        </div>
      )}

      <div>
        <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>YouTube URL</label>
        <div className='flex gap-2'>
          <input
            className='flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
            placeholder='https://youtube.com/watch?v=...'
            disabled={!canEdit}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || url === (lesson.video_url ?? '')}
              className='px-3 py-2 text-[12px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors shrink-0'
            >
              {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Save className='w-3.5 h-3.5' />}
            </button>
          )}
        </div>
      </div>

      {/* Search YouTube button */}
      {canEdit && (
        <button
          onClick={onSearchYouTube}
          disabled={searching}
          className='flex items-center gap-2 w-full justify-center px-4 py-2.5 text-[12px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors'
        >
          {searching ? <Loader2 className='w-4 h-4 animate-spin' /> : <MonitorPlay className='w-4 h-4' />}
          {searching ? 'Searching YouTube...' : lesson.video_url ? '🔍 Find a Better Video' : '🔍 Search YouTube for Best Video'}
        </button>
      )}

      {/* YouTube Search Results */}
      {videoResults.length > 0 && (
        <div className='space-y-2'>
          <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider'>
            Search Results — Click to select
          </p>
          {videoResults.map((v) => {
            const isSelected = url === v.url;
            return (
              <button
                key={v.videoId}
                onClick={() => onSelectVideo(v.url)}
                className={`w-full flex items-start gap-3 p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className='w-24 h-14 rounded-md object-cover shrink-0 bg-slate-100'
                />
                <div className='min-w-0 flex-1'>
                  <p className='text-[12px] font-semibold text-slate-800 line-clamp-2 leading-tight'
                     dangerouslySetInnerHTML={{ __html: v.title }}
                  />
                  <p className='text-[10px] text-slate-400 mt-0.5'>{v.channel}</p>
                  {isSelected && (
                    <span className='inline-block mt-1 text-[10px] font-bold text-indigo-600'>✓ Selected</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {url && !videoId && (
        <a href={url} target='_blank' rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:underline'>
          <MonitorPlay className='w-3.5 h-3.5' /> Open link
        </a>
      )}
    </div>
  );
}

// ─── Content tab ──────────────────────────────────────────────────────────────

function ContentTab({
  lesson,
  canEdit,
  generating,
  onGenerate,
  onUpdateLesson,
}: {
  lesson: AiLesson;
  canEdit: boolean;
  generating: boolean;
  onGenerate: () => void;
  onUpdateLesson: (data: Partial<AiLesson>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    explanation: lesson.explanation ?? '',
    example: lesson.example ?? '',
    activity: lesson.activity ?? '',
    resource_links: lesson.resource_links?.length ? lesson.resource_links : [''],
  });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState<'explanation' | 'example' | 'activity'>('explanation');

  useEffect(() => {
    setDraft({
      explanation: lesson.explanation ?? '',
      example: lesson.example ?? '',
      activity: lesson.activity ?? '',
      resource_links: lesson.resource_links?.length ? lesson.resource_links : [''],
    });

    // if generated content exists mark unsaved
    if (
      lesson.explanation ||
      lesson.example ||
      lesson.activity ||
      lesson.resource_links?.length
    ) {
      setDirty(true);
    } else {
      setDirty(false);
    }
  }, [lesson.id, lesson.explanation, lesson.example, lesson.activity, lesson.resource_links]);

  const set = (field: keyof typeof draft, val: string) => {
    setDraft((d) => ({ ...d, [field]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateLesson(draft);
      setDirty(false);
      toast.success('Content saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const md = [
      draft.explanation,
      draft.example ? `\n## Example\n\n${draft.example}` : '',
      draft.activity ? `\n## Activity\n\n${draft.activity}` : '',
    ].filter(Boolean).join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(lesson.title ?? 'lesson').replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set('explanation', ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const sections = [
    { key: 'explanation' as const, label: 'Explanation', placeholder: '## Introduction\n\nExplain the concept here...' },
    { key: 'example' as const, label: 'Example', placeholder: '// Code example or concept illustration' },
    { key: 'activity' as const, label: 'Activity', placeholder: 'Short in-lesson activity...' },
  ];

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      {/* Toolbar */}
      <div className='flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 shrink-0'>
        {/* Section selector */}
        <div className='flex bg-slate-100 rounded-lg p-0.5 mr-2'>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                section === s.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className='flex-1' />
        {/* View toggle */}
        <button
          onClick={() => setPreview((v) => !v)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${
            preview ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {preview ? <Pencil className='w-3 h-3' /> : <Eye className='w-3 h-3' />}
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button onClick={handleDownload} title='Download .md' className='p-1.5 text-slate-400 hover:text-slate-600 transition-colors'>
          <Download className='w-3.5 h-3.5' />
        </button>
        <label className='p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer' title='Upload .md'>
          <Upload className='w-3.5 h-3.5' />
          <input type='file' accept='.md,.txt' className='hidden' onChange={handleUpload} />
        </label>
      </div>

      {/* Editor / Preview area */}
      <div className='flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6'>
        <div className='flex-1 min-h-[280px]'>
          {sections.map((s) => s.key === section && (
            preview ? (
              <div key={s.key} className='prose prose-sm max-w-none text-slate-700 text-[13px]'>
                {draft[s.key]
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft[s.key]}</ReactMarkdown>
                  : <span className='text-slate-300 italic'>Nothing to preview yet</span>}
                
                {/* Resource Links Preview */}
                {s.key === 'explanation' && draft.resource_links.filter(l => l.trim()).length > 0 && (
                  <div className='mt-8 pt-4 border-t border-slate-100'>
                    <h4 className='font-bold text-slate-800 mb-3'>Attached Resources:</h4>
                    <ul className='list-disc pl-5 space-y-1.5'>
                      {draft.resource_links.filter(l => l.trim()).map((link, idx) => (
                        <li key={idx}>
                          <a href={link} target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline font-semibold break-all'>
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                key={s.key}
                rows={12}
                disabled={!canEdit}
                value={draft[s.key]}
                onChange={(e) => set(s.key, e.target.value)}
                placeholder={s.placeholder}
                className='w-full h-full border border-slate-200 rounded-lg px-3 py-2.5 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-y font-mono leading-relaxed'
              />
            )
          ))}
        </div>

        {/* Resource Links */}
        {!preview && (
          <div className='space-y-3 shrink-0 pt-3 border-t border-slate-100'>
            <label className='block text-[12px] font-bold text-slate-700 mb-1'>Additional Resources (Links / Files / Folders)</label>
            {draft.resource_links.map((link, idx) => (
              <div key={idx} className='flex gap-2 items-center'>
                <input
                  disabled={!canEdit}
                  value={link}
                  onChange={(e) => {
                    const newLinks = [...draft.resource_links];
                    newLinks[idx] = e.target.value;
                    set('resource_links', newLinks);
                  }}
                  placeholder='https://...'
                  className='flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
                />
                {canEdit && draft.resource_links.length > 1 && (
                  <button
                    onClick={() => {
                      const newLinks = draft.resource_links.filter((_, i) => i !== idx);
                      set('resource_links', newLinks);
                    }}
                    className='p-2 text-slate-400 hover:text-red-500 transition-colors'
                    title='Remove link'
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button
                onClick={() => set('resource_links', [...draft.resource_links, ''])}
                className='text-[12px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors mt-1 inline-block'
              >
                + Add another field
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className='border-t border-slate-100 px-4 py-3 flex items-center gap-2 shrink-0'>
          <button
            onClick={onGenerate}
            disabled={generating}
            className='flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors'
          >
            {generating ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Sparkles className='w-3.5 h-3.5' />}
            {generating ? 'Generating...' : lesson.explanation ? 'Regenerate' : 'Generate'}
          </button>
          <div className='flex-1' />
          {dirty && <span className='text-[11px] text-amber-500 font-semibold'>Unsaved</span>}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className='flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold bg-[#1e2653] text-white rounded-lg hover:bg-[#16203f] disabled:opacity-40 transition-colors'
          >
            {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Save className='w-3.5 h-3.5' />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exercise tab ─────────────────────────────────────────────────────────────

function ExerciseTab({
  lesson,
  canEdit,
  generating,
  onGenerate,
  onUpdateLesson,
}: {
  lesson: AiLesson;
  canEdit: boolean;
  generating: boolean;
  onGenerate: () => void;
  onUpdateLesson: (data: Partial<AiLesson>) => Promise<void>;
}) {
  const exercise = useMemo<AiExercise | null>(() => {
    if (!lesson.exercise_data) return null;
    return typeof lesson.exercise_data === 'string'
      ? JSON.parse(lesson.exercise_data as string)
      : (lesson.exercise_data as AiExercise);
  }, [lesson.exercise_data]);

  const [draft, setDraft] = useState({
    title: exercise?.title ?? '',
    description: exercise?.description ?? '',
    tasks: (exercise?.tasks ?? []).join('\n'),
    starter_code: exercise?.starter_code ?? '',
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const ex = !lesson.exercise_data ? null
      : typeof lesson.exercise_data === 'string'
        ? (JSON.parse(lesson.exercise_data as string) as AiExercise)
        : (lesson.exercise_data as AiExercise);
    setDraft({
      title: ex?.title ?? '',
      description: ex?.description ?? '',
      tasks: (ex?.tasks ?? []).join('\n'),
      starter_code: ex?.starter_code ?? '',
    });
    // setDirty(false);
    if (ex) {
  setDirty(true);
} else {
  setDirty(false);
}
  }, [lesson.id, lesson.exercise_data]);

  const set = (field: keyof typeof draft, val: string) => {
    setDraft((d) => ({ ...d, [field]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: AiExercise = {
        title: draft.title,
        description: draft.description,
        tasks: draft.tasks.split('\n').map((t) => t.trim()).filter(Boolean),
        starter_code: draft.starter_code,
      };
      await onUpdateLesson({ exercise_data: updated });
      setDirty(false);
      toast.success('Exercise saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='flex flex-col flex-1 min-h-0'>
       {/* PREVIEW TOOLBAR */}
    <div className='flex items-center gap-2 px-4 py-2 border-b border-slate-100'>
      <div className='flex-1' />

      <button
        onClick={() => setPreview((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${
          preview
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
        }`}
      >
        {preview ? (
          <Pencil className='w-3 h-3' />
        ) : (
          <Eye className='w-3 h-3' />
        )}

        {preview ? 'Edit' : 'Preview'}
      </button>
    </div>
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {!exercise && !canEdit && (
          <div className='py-12 text-center'>
            <Code2 className='w-10 h-10 text-slate-200 mx-auto mb-3' />
            <p className='text-[13px] text-slate-400'>No exercise yet</p>
          </div>
        )}

        {(exercise || canEdit) && (
  <>
    {preview ? (
      <div className='space-y-4 text-[13px]'>

        <div>
          <h4 className='font-bold text-slate-700 mb-1'>Title</h4>
          <p>{draft.title || '—'}</p>
        </div>

        <div>
          <h4 className='font-bold text-slate-700 mb-1'>Description</h4>

          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {draft.description || 'No description'}
          </ReactMarkdown>
        </div>

        <div>
          <h4 className='font-bold text-slate-700 mb-1'>Tasks</h4>

          <ul className='list-disc pl-5 space-y-1'>
            {draft.tasks
              .split('\n')
              .filter(Boolean)
              .map((task, i) => (
                <li key={i}>{task}</li>
              ))}
          </ul>
        </div>

        <div>
          <h4 className='font-bold text-slate-700 mb-1'>
            Starter Code
          </h4>

          <pre className='bg-slate-100 p-3 rounded-lg overflow-auto'>
            <code>{draft.starter_code}</code>
          </pre>
        </div>
      </div>
    ) : (
      <>
        <div>
          <label className='block text-[11px] font-semibold text-slate-500 mb-1'>
            Title
          </label>

          <input
            disabled={!canEdit}
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder='Exercise title...'
            className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
          />
        </div>

        <div>
          <label className='block text-[11px] font-semibold text-slate-500 mb-1'>
            Description
          </label>

          <textarea
            rows={2}
            disabled={!canEdit}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder='Brief description of the exercise...'
            className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none'
          />
        </div>

        <div>
          <label className='block text-[11px] font-semibold text-slate-500 mb-1'>
            Tasks
          </label>

          <textarea
            rows={5}
            disabled={!canEdit}
            value={draft.tasks}
            onChange={(e) => set('tasks', e.target.value)}
            placeholder={'Task 1\nTask 2\nTask 3'}
            className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
          />
        </div>

        <div>
          <label className='block text-[11px] font-semibold text-slate-500 mb-1'>
            Starter Code
          </label>

          <textarea
            rows={6}
            disabled={!canEdit}
            value={draft.starter_code}
            onChange={(e) => set('starter_code', e.target.value)}
            placeholder='// starter code here...'
            className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
          />
        </div>
      </>
    )}
  </>
)}
{/* 
        {(exercise || canEdit) && (
          <>
          
            <div>
              <label className='block text-[11px] font-semibold text-slate-500 mb-1'>Title</label>
              <input
                disabled={!canEdit}
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder='Exercise title...'
                className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
              />
            </div>

            <div>
              <label className='block text-[11px] font-semibold text-slate-500 mb-1'>Description</label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder='Brief description of the exercise...'
                className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none'
              />
            </div>

            <div>
              <label className='block text-[11px] font-semibold text-slate-500 mb-1'>
                Tasks <span className='font-normal text-slate-400'>(one per line)</span>
              </label>
              <textarea
                rows={5}
                disabled={!canEdit}
                value={draft.tasks}
                onChange={(e) => set('tasks', e.target.value)}
                placeholder={'Task 1\nTask 2\nTask 3'}
                className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
              />
            </div>

            <div>
              <label className='block text-[11px] font-semibold text-slate-500 mb-1'>Starter Code</label>
              <textarea
                rows={6}
                disabled={!canEdit}
                value={draft.starter_code}
                onChange={(e) => set('starter_code', e.target.value)}
                placeholder='// starter code here...'
                className='w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 resize-none font-mono'
              />
            </div>
          </>
        )} */}
      </div>

      {canEdit && (
        <div className='border-t border-slate-100 px-4 py-3 flex items-center gap-2 shrink-0'>
          <button
            onClick={onGenerate}
            disabled={generating}
            className='flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors'
          >
            {generating ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Sparkles className='w-3.5 h-3.5' />}
            {generating ? 'Generating...' : exercise ? 'Regenerate' : 'Generate'}
          </button>

        {exercise && (
  <button
    onClick={async () => {
      try {
        setSaving(true);

        await onUpdateLesson({
          exercise_data: null,
        });

        setDraft({
          title: '',
          description: '',
          tasks: '',
          starter_code: '',
        });

        setDirty(false);

        toast.success('Exercise removed');
      } catch {
        toast.error('Failed to remove exercise');
      } finally {
        setSaving(false);
      }
    }}
    disabled={saving}
    className='flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors'
  >
    Remove
  </button>
)}

          <div className='flex-1' />
          {dirty && <span className='text-[11px] text-amber-500 font-semibold'>Unsaved</span>}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className='flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold bg-[#1e2653] text-white rounded-lg hover:bg-[#16203f] disabled:opacity-40 transition-colors'
          >
            {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Save className='w-3.5 h-3.5' />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

export function RightSidebar({
  selectedLesson,
  canEdit,
  onUpdateLesson,
  onGenerateLessonContent,
}: {
  selectedLesson: AiLesson | null;
  canEdit: boolean;
  onUpdateLesson: (id: string, data: Partial<AiLesson>) => Promise<void>;
  onGenerateLessonContent: (lessonId: string, type: 'video' | 'markdown' | 'exercise') => Promise<VideoResult[] | void>;
}) {
  const [tab, setTab] = useState<Tab>('video');
  const [generatingType, setGeneratingType] = useState<'video' | 'markdown' | 'exercise' | null>(null);
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);

  // Reset tab and video results when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      if (selectedLesson.video_url) setTab('video');
      else if (selectedLesson.explanation) setTab('content');
      else setTab('video');
    }
    setVideoResults([]);
  }, [selectedLesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedLesson) {
    return (
      <div className='bg-white border border-slate-200 rounded-xl h-full flex flex-col items-center justify-center py-16 text-center px-6'>
        <BookOpen className='w-10 h-10 text-slate-200 mb-3' />
        <p className='text-[13px] font-semibold text-slate-400'>Select a subtopic</p>
        <p className='text-[11px] text-slate-300 mt-1'>Click any subtopic in the tree to edit its content</p>
      </div>
    );
  }

  const handleGenerate = async (type: 'video' | 'markdown' | 'exercise') => {
    setGeneratingType(type);
    try {
      const results = await onGenerateLessonContent(selectedLesson.id, type);
      if (type === 'video' && Array.isArray(results)) {
        setVideoResults(results);
      }
    }
    finally { setGeneratingType(null); }
  };

  const handleUpdate = (data: Partial<AiLesson>) => onUpdateLesson(selectedLesson.id, data);

  const handleSelectVideo = async (videoUrl: string) => {
    try {
      await handleUpdate({ video_url: videoUrl });
      toast.success('Video selected & saved');
    } catch {
      toast.error('Failed to save video');
    }
  };

  return (
    <div className='bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden sticky top-4 max-h-[calc(100vh-120px)]'>
      {/* Subtopic header */}
      <div className='px-4 py-3 border-b border-slate-100 shrink-0'>
        <p className='text-[13px] font-bold text-slate-800 truncate'>{selectedLesson.title}</p>
        <div className='flex items-center gap-3 mt-0.5'>
          <span className='text-[11px] text-slate-400'>{selectedLesson.duration_mins ?? 20} min</span>
          <span className={`text-[11px] font-semibold ${selectedLesson.video_url ? 'text-green-500' : 'text-slate-300'}`}>
            {selectedLesson.video_url ? '● Video' : '○ Video'}
          </span>
          <span className={`text-[11px] font-semibold ${selectedLesson.explanation ? 'text-green-500' : 'text-slate-300'}`}>
            {selectedLesson.explanation ? '● Content' : '○ Content'}
          </span>
          <span className={`text-[11px] font-semibold ${selectedLesson.exercise_data ? 'text-green-500' : 'text-slate-300'}`}>
            {selectedLesson.exercise_data ? '● Exercise' : '○ Exercise'}
          </span>
        </div>
      </div>

      <TabStrip active={tab} onTab={setTab} />

      {tab === 'video' && (
        <VideoTab
          lesson={selectedLesson}
          canEdit={canEdit}
          searching={generatingType === 'video'}
          videoResults={videoResults}
          onSearchYouTube={() => handleGenerate('video')}
          onSelectVideo={handleSelectVideo}
          onUpdateLesson={handleUpdate}
        />
      )}

      {tab === 'content' && (
        <ContentTab
          lesson={selectedLesson}
          canEdit={canEdit}
          generating={generatingType === 'markdown'}
          onGenerate={() => handleGenerate('markdown')}
          onUpdateLesson={handleUpdate}
        />
      )}

      {tab === 'exercise' && (
        <ExerciseTab
          lesson={selectedLesson}
          canEdit={canEdit}
          generating={generatingType === 'exercise'}
          onGenerate={() => handleGenerate('exercise')}
          onUpdateLesson={handleUpdate}
        />
      )}
    </div>
  );
}
