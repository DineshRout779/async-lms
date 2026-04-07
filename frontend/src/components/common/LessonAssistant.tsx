import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/services/api';
import { getErrorMessage } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface LessonContext {
  title: string;
  contentType: string;
  content: string;
}

interface Props {
  lessonContext: LessonContext;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LessonAssistant({ lessonContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { reply: string };
      }>('/assistant/chat', { messages: newMessages, lessonContext });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.data.reply },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to get a response'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Floating trigger ── */}
      <button
        onClick={() => setOpen(true)}
        className='fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all'
      >
        <Bot className='h-4 w-4' />
        Ask AI
      </button>

      {/* ── Chat dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex flex-col gap-0 p-0 sm:max-w-240 h-[80vh]'>
          {/* Header */}
          <DialogHeader className='px-5 py-4 border-b shrink-0'>
            <div className='flex items-center gap-3'>
              <div className='h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
                <Bot className='h-4 w-4 text-indigo-600' />
              </div>
              <div className='flex-1 min-w-0'>
                <DialogTitle className='text-sm font-semibold text-slate-900'>
                  CodeGuru AI
                </DialogTitle>
                <div className='flex items-center gap-1.5 mt-0.5'>
                  <BookOpen className='h-3 w-3 text-indigo-400 shrink-0' />
                  <p className='text-xs text-indigo-500 truncate font-medium'>
                    {lessonContext.title}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className='flex-1 min-h-0 px-5 py-4'>
            {messages.length === 0 && (
              <div className='flex flex-col items-center justify-center h-full gap-3 text-center py-10'>
                <div className='h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center'>
                  <Bot className='h-6 w-6 text-indigo-400' />
                </div>
                <div>
                  <p className='font-semibold text-slate-700 text-sm'>
                    Ask anything about this lesson
                  </p>
                  <p className='text-xs text-slate-400 mt-1 max-w-xs'>
                    I'll guide you through concepts and help you understand —
                    without giving away the answers.
                  </p>
                </div>
              </div>
            )}

            <div className='space-y-4'>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className='h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5'>
                      <Bot className='h-3.5 w-3.5 text-indigo-600' />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className='prose prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded prose-p:my-1 prose-ul:my-1 prose-li:my-0 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-slate-100'>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className='whitespace-pre-wrap'>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className='flex gap-2 items-start'>
                  <div className='h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
                    <Bot className='h-3.5 w-3.5 text-indigo-600' />
                  </div>
                  <div className='bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none px-3.5 py-2.5'>
                    <Loader2 className='h-3.5 w-3.5 animate-spin text-indigo-400' />
                  </div>
                </div>
              )}

              {error && (
                <p className='text-xs text-red-500 text-center py-2'>{error}</p>
              )}
            </div>

            <div ref={bottomRef} />
          </ScrollArea>

          {/* Input */}
          <div className='px-4 py-3 border-t shrink-0'>
            <div className='flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask about this lesson… (Enter to send)'
                rows={1}
                className='flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-0.5 max-h-28'
              />
              <Button
                size='icon'
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className='h-7 w-7 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40'
              >
                <Send className='h-3 w-3' />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
