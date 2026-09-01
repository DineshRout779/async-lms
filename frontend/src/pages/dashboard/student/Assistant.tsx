import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, TriangleAlert, Copy, Check } from 'lucide-react';
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

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-md text-slate-300 transition-colors border border-slate-700/50 backdrop-blur-sm"
      title="Copy code"
    >
      {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

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
    <div className='flex flex-col h-[calc(100dvh-4rem)] max-w-3xl mx-auto'>
      {/* ── Header ── */}
      <div className='px-4 sm:px-6 py-3 sm:py-4 border-b bg-white shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
            <Bot className='h-4 w-4 sm:h-5 sm:w-5 text-indigo-600' />
          </div>
          <div>
            <p className='font-semibold text-slate-900 text-xs sm:text-sm'>CodeGuru AI</p>
            <p className='text-[10px] sm:text-xs text-slate-400'>
              Personalized LMS Doubt Solver
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className='flex-1 min-h-0 px-3 sm:px-6 py-4'>
        {messages.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-4 text-center py-12 sm:py-16'>
            <div className='h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-indigo-50 flex items-center justify-center'>
              <Bot className='h-7 w-7 sm:h-8 sm:w-8 text-indigo-400' />
            </div>
            <div className='px-4'>
              <p className='font-semibold text-slate-700 text-sm sm:text-base'>
                Ask me anything about your code
              </p>
              <p className='text-xs sm:text-sm text-slate-400 mt-1 max-w-sm'>
                I'll guide you to the answer — not give it away. Share your
                code, describe your problem, or ask a concept question.
              </p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-sm px-4'>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className='text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-xl p-3 text-slate-600 transition-all active:scale-[0.98]'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='space-y-4'>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 sm:gap-3 items-start ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role === 'assistant' && (
                <div className='h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5'>
                  <Bot className='h-4 w-4 text-indigo-600' />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none overflow-x-auto'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className='prose prose-sm max-w-full overflow-x-auto prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:p-3'>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre({ children }: any) {
                          return <div className="relative group">{children}</div>;
                        },
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).replace(/\n$/, '');
                          if (match) {
                            return (
                              <>
                                <div className="absolute right-2 top-2 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                                  <CopyButton text={codeContent} />
                                </div>
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </>
                            );
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
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
            <div className='flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5'>
              <TriangleAlert className='h-4 w-4 shrink-0' />
              {error}
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </ScrollArea>

      {/* ── Input ── */}
      <div className='px-3 sm:px-4 py-2.5 sm:py-3 border-t bg-white shrink-0'>
        <div className='flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-3 sm:px-4 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask a question or paste your code…'
            rows={1}
            className='flex-1 resize-none bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1 max-h-36'
          />
          <Button
            size='icon'
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className='h-8 w-8 sm:h-9 sm:w-9 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg'
          >
            <Send className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          </Button>
        </div>
        <p className='text-[9px] sm:text-[10px] text-center text-slate-400 mt-1'>
          CodeGuru AI guides — Use with caution, AI can make mistakes
        </p>
      </div>
    </div>
  );
}