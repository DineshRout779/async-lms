import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InlineTextProps {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineText({ value, onChange, className, placeholder = 'Double-click to edit' }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    onChange?.(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={cn(className, 'bg-blue-50 outline-none border-b-2 border-blue-400 w-full')}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => { if (!onChange) return; setDraft(value); setEditing(true); }}
      title={onChange ? 'Double-click to edit' : undefined}
      className={cn(className, onChange && 'cursor-text hover:bg-blue-50/50 rounded transition-colors')}
    >
      {value || (onChange ? <span className='opacity-30 italic'>{placeholder}</span> : null)}
    </span>
  );
}

interface InlineTextareaProps {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
}

export function InlineTextarea({ value, onChange, className }: InlineTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange?.(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
        className={cn(className, 'bg-blue-50 outline-none border-b-2 border-blue-400 w-full resize-none')}
        rows={3}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => { if (!onChange) return; setDraft(value); setEditing(true); }}
      title={onChange ? 'Double-click to edit' : undefined}
      className={cn(className, onChange && 'cursor-text hover:bg-blue-50/50 rounded transition-colors block')}
    >
      {value}
    </span>
  );
}
