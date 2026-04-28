import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Inline title (double-click to rename) ────────────────────────────────────

export function InlineTitle({
  value,
  onSave,
  className = '',
  disabled = false,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = async () => {
    if (!draft.trim() || draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
    } catch {
      toast.error('Failed to rename');
      setDraft(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className='flex items-center gap-1 flex-1 min-w-0'>
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
          onBlur={commit}
          className='flex-1 min-w-0 border border-indigo-300 rounded px-2 py-0.5 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white'
        />
        {saving && <Loader2 className='w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0' />}
      </div>
    );
  }

  return (
    <span
      className={`${className} group/title flex items-center gap-1 min-w-0`}
      onDoubleClick={() => { if (!disabled) { setDraft(value); setEditing(true); } }}
      title={disabled ? undefined : 'Double-click to rename'}
    >
      <span className='truncate'>{value}</span>
      {!disabled && <Pencil className='w-3 h-3 text-slate-300 opacity-0 group-hover/title:opacity-100 shrink-0 transition-opacity' />}
    </span>
  );
}

// ─── Inline new-item input ─────────────────────────────────────────────────────

export function InlineInput({
  placeholder,
  onConfirm,
  onCancel,
  loading,
}: {
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => { if (value.trim()) onConfirm(value.trim()); };

  return (
    <div className='flex items-center gap-1.5'>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className='flex-1 border border-indigo-300 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white min-w-0'
      />
      <button
        onClick={submit}
        disabled={!value.trim() || loading}
        className='p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors shrink-0'
      >
        {loading ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Check className='w-3.5 h-3.5' />}
      </button>
      <button onClick={onCancel} className='p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0'>
        <X className='w-3.5 h-3.5' />
      </button>
    </div>
  );
}
