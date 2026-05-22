import { useState } from 'react';
import { Loader2, Sparkles, X, Plus, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AiAssignment } from '@/features/aiCurriculum/types';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';

export function AssignmentModal({
  topicId,
  topicTitle,
  initialAssignment,
  canEdit,
  onClose,
  onAssignmentChange,
  onGenerateAssignment,
}: {
  topicId: string;
  topicTitle: string;
  initialAssignment: AiAssignment | null;
  canEdit: boolean;
  onClose: () => void;
  onAssignmentChange: (assignment: AiAssignment | null) => void;
  onGenerateAssignment: (topicId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AiAssignment>({
    title: initialAssignment?.title || '',
    instructions: initialAssignment?.instructions || '',
    max_score: initialAssignment?.max_score || 100,
    resources: initialAssignment?.resources || [],
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const set = (patch: Partial<AiAssignment>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    if (!draft.instructions.trim()) { toast.error('Instructions are required'); return; }
    
    const cleanedDraft = {
      ...draft,
      resources: (draft.resources || []).filter(r => r.trim() !== '')
    };
    
    setSaving(true);
    try {
      await aiCurriculumApi.updateTopic(topicId, { assignment: cleanedDraft } as never);
      onAssignmentChange(cleanedDraft);
      setDirty(false);
      toast.success('Assignment saved');
    } catch {
      toast.error('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/college-assignments/upload-instruction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        set({ resources: [...(draft.resources || []), data.url] });
        toast.success('File uploaded');
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerateAssignment(topicId);
      // parent will update the topic state; we close and let the bar reflect it
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Remove this assignment?')) return;
    setSaving(true);
    try {
      await aiCurriculumApi.updateTopic(topicId, { assignment: null } as never);
      onAssignmentChange(null);
      onClose();
    } catch {
      toast.error('Failed to remove assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={onClose} />
      <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-100'>
          <div>
            <h2 className='text-base font-bold text-slate-800'>Unit Assignment</h2>
            <p className='text-[12px] text-slate-400 mt-0.5 truncate max-w-xs'>{topicTitle}</p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPreview((p) => !p)}
              className='px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors'
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
            {canEdit && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={generating || saving}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg disabled:opacity-50 transition-colors'
                >
                  {generating ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Sparkles className='w-3.5 h-3.5' />}
                  {initialAssignment ? 'Regenerate' : 'Generate'}
                </button>
              </>
            )}
            <button onClick={onClose} className='p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors'>
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className='px-6 py-5 overflow-y-auto max-h-[70vh]'>
          {preview ? (
            <div className='space-y-5'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1'>
                  Assignment Title
                </p>
                <h3 className='text-lg font-bold text-slate-800'>
                  {draft.title || 'Untitled Assignment'}
                </h3>
              </div>

              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1'>
                  Max Score
                </p>
                <div className='inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-sm font-semibold'>
                  {draft.max_score} points
                </div>
              </div>

              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2'>
                  Instructions
                </p>
                <div className='prose prose-sm prose-slate max-w-none prose-pre:whitespace-pre-wrap prose-pre:break-words text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-4'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {draft.instructions || '*No instructions provided.*'}
                  </ReactMarkdown>
                </div>
              </div>

              {draft.resources && draft.resources.filter(r => r.trim() !== '').length > 0 && (
                <div className='pt-4 border-t border-slate-100'>
                  <h4 className='text-[13px] font-semibold text-slate-800 mb-2'>Additional Resources</h4>
                  <ul className='space-y-1.5 list-disc pl-5'>
                    {draft.resources.filter(r => r.trim() !== '').map((res, idx) => (
                      <li key={idx}>
                        <a href={res} target='_blank' rel='noreferrer' className='text-[13px] text-indigo-600 hover:underline break-all font-semibold'>
                          {res}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (

            <div className='space-y-4'>
              <div>
                <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>
                  Assignment Title
                </label>
                <input
                  disabled={!canEdit}
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder='e.g. Build a Todo App with React'
                  className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>
                  Max Score
                </label>
                <input
                  type='number'
                  min={1}
                  max={1000}
                  disabled={!canEdit}
                  value={draft.max_score}
                  onChange={(e) => set({ max_score: Number(e.target.value) })}
                  className='w-32 border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>
                  Instructions
                </label>
                <textarea
                  rows={8}
                  disabled={!canEdit}
                  value={draft.instructions}
                  onChange={(e) => set({ instructions: e.target.value })}
                  placeholder='Step-by-step instructions: what to build, acceptance criteria, submission format...'
                  className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none disabled:bg-slate-50 disabled:text-slate-400'
                />
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-slate-500 mb-1.5'>Additional Resources (Links / Files / Folders)</label>
                <div className='space-y-2'>
                  {(draft.resources || []).map((res, idx) => (
                    <div key={idx} className='flex items-center gap-2'>
                      <input
                        disabled={!canEdit}
                        value={res}
                        onChange={(e) => {
                          const newRes = [...(draft.resources || [])];
                          newRes[idx] = e.target.value;
                          set({ resources: newRes });
                        }}
                        placeholder='https://...'
                        className='flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400'
                      />
                      {canEdit && (
                        <button
                          onClick={() => {
                            const newRes = [...(draft.resources || [])];
                            newRes.splice(idx, 1);
                            set({ resources: newRes });
                          }}
                          className='p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <div className='flex items-center gap-4 mt-1'>
                      <button
                        onClick={() => set({ resources: [...(draft.resources || []), ''] })}
                        className='text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1'
                      >
                        <Plus className='w-4 h-4' /> Add another field
                      </button>
                      <label className='text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer'>
                        {isUploading ? <Loader2 className='w-4 h-4 animate-spin' /> : <UploadCloud className='w-4 h-4' />}
                        {isUploading ? 'Uploading...' : 'Upload File'}
                        <input
                          type='file'
                          className='hidden'
                          onChange={handleFileUpload}
                          disabled={isUploading || !canEdit}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className='border-t border-slate-100 px-6 py-3 flex items-center justify-between'>
            {initialAssignment ? (
              <button
                onClick={handleClear}
                disabled={saving}
                className='text-[12px] font-semibold text-red-400 hover:text-red-600 transition-colors'
              >
                Remove Assignment
              </button>
            ) : <div />}
            <div className='flex items-center gap-2'>
              {dirty && <span className='text-[11px] text-amber-500 font-semibold'>Unsaved changes</span>}
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className='flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-[#1e2653] text-white rounded-lg hover:bg-[#16203f] disabled:opacity-40 transition-colors'
              >
                {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : null}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
