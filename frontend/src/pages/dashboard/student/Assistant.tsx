import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, TriangleAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/services/api';
import { getErrorMessage } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTERS = [
  "My code has a bug I can't find",
  'Explain what a loop is',
  'How do I approach this problem?',
  'Why is my output wrong?',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAssistant() {
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
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
      }>('/assistant/chat', { messages: newMessages });
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
    <div className='flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto'>
      {/* ── Header ── */}
      <div className='px-6 py-4 border-b bg-white shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
            <Bot className='h-5 w-5 text-indigo-600' />
          </div>
          <div>
            <p className='font-semibold text-slate-900 text-sm'>CodeGuru AI</p>
            <p className='text-xs text-slate-400'>
              Peronlized LMS Doubt Solver
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className='flex-1 min-h-0 px-6 py-4'>
        {messages.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-4 text-center py-16'>
            <div className='h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center'>
              <Bot className='h-8 w-8 text-indigo-400' />
            </div>
            <div>
              <p className='font-semibold text-slate-700'>
                Ask me anything about your code
              </p>
              <p className='text-sm text-slate-400 mt-1 max-w-sm'>
                I'll guide you to the answer — not give it away. Share your
                code, describe your problem, or ask a concept question.
              </p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-sm'>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className='text-left text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='space-y-6'>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className='h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5'>
                  <Bot className='h-4 w-4 text-indigo-600' />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
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

              {msg.role === 'user' && (
                <div className='h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5'>
                  <User className='h-4 w-4 text-white' />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className='flex gap-3 items-start'>
              <div className='h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
                <Bot className='h-4 w-4 text-indigo-600' />
              </div>
              <div className='bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3'>
                <Loader2 className='h-4 w-4 animate-spin text-indigo-400' />
              </div>
            </div>
          )}

          {error && (
            <div className='flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3'>
              <TriangleAlert className='h-4 w-4 shrink-0' />
              {error}
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </ScrollArea>

      {/* ── Input ── */}
      <div className='px-4 py-3 border-t bg-white shrink-0'>
        <div className='flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask a question or paste your code… (Enter to send, Shift+Enter for new line)'
            rows={1}
            className='flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1 max-h-40'
          />
          <Button
            size='icon'
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className='h-8 w-8 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40'
          >
            <Send className='h-3.5 w-3.5' />
          </Button>
        </div>
        <p className='text-[10px] text-center text-slate-400 mt-1.5'>
          CodeGuru AI guides — Use with caution, AI can make mistakes
        </p>
      </div>
    </div>
  );
}
