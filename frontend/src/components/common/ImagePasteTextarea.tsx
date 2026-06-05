import { useRef, useState, useCallback, type TextareaHTMLAttributes } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  uploadEndpoint?: string;
}

export default function ImagePasteTextarea({
  value,
  onChange,
  uploadEndpoint = '/admin/upload-file',
  className,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = ref.current;
      if (!el) { onChange(value + text); return; }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      // Restore cursor after the inserted text
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + text.length;
        el.focus();
      });
    },
    [value, onChange],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return false;
      setUploading(true);
      const placeholder = `![uploading…]()`;
      insertAtCursor(placeholder);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await apiClient.post<{ url: string }>(uploadEndpoint, form);
        const md = `![image](${res.data.url})`;
        // value captured in closure still has the placeholder — replace it directly
        onChange(value.includes(placeholder) ? value.replace(placeholder, md) : value + md);
        return true;
      } catch {
        toast.error('Image upload failed');
        onChange(value.replace(placeholder, ''));
        return false;
      } finally {
        setUploading(false);
      }
    },
    [insertAtCursor, onChange, uploadEndpoint],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) await uploadImage(file);
    },
    [uploadImage],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith('image/')) {
        e.preventDefault();
        await uploadImage(file);
      }
    },
    [uploadImage],
  );

  return (
    <div className='relative'>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          className,
        )}
        {...props}
      />
      <div className='flex items-center gap-1.5 mt-1'>
        {uploading ? (
          <span className='flex items-center gap-1 text-[11px] text-blue-500'>
            <Loader2 className='w-3 h-3 animate-spin' /> Uploading image…
          </span>
        ) : (
          <span className='flex items-center gap-1 text-[11px] text-slate-400'>
            <ImageIcon className='w-3 h-3' /> Paste or drop screenshots directly
          </span>
        )}
      </div>
    </div>
  );
}
