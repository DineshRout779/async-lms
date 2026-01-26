import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Mic, Code2, Send } from 'lucide-react';

export default function AIAssistant() {
  return (
    <div className='flex flex-col h-screen max-w-5xl mx-auto p-4'>
      <ScrollArea className='flex-1 p-4 space-y-6'>
        {/* AI Message */}
        <div className='flex gap-4 items-start mb-8'>
          <Avatar className='h-8 w-8 bg-blue-100 p-1'>
            <AvatarImage src='/ai-bot-icon.png' />
          </Avatar>
          <div className='space-y-2 max-w-[80%]'>
            <p className='text-sm font-bold'>CodeGuru AI</p>
            <div className='bg-slate-50 p-4 rounded-2xl rounded-tl-none border'>
              The infinite loop in{' '}
              <code className='bg-slate-200 px-1 rounded'>useEffect</code>{' '}
              usually happens when...
              <pre className='bg-slate-900 text-slate-50 p-4 rounded-lg mt-4 text-xs overflow-x-auto'>
                {`// Problematic Code
useEffect(() => {
  setCount(count + 1);
}, [count]);`}
              </pre>
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className='flex gap-4 items-start justify-end'>
          <div className='bg-blue-900 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%]'>
            How do I fix this React useEffect hook? It keeps running in an
            infinite loop.
          </div>
          <Avatar className='h-8 w-8'>
            <AvatarImage src='/alex.png' />
          </Avatar>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className='p-4 border-t bg-white'>
        <div className='relative flex items-center'>
          <Input
            placeholder='Type your coding question here... (Shift + Enter for new line)'
            className='pr-24 py-6'
          />
          <div className='absolute right-2 flex gap-2'>
            <Button variant='ghost' size='icon'>
              <Paperclip className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon'>
              <Mic className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon'>
              <Code2 className='h-4 w-4' />
            </Button>
            <Button size='icon' className='bg-blue-600'>
              <Send className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <p className='text-[10px] text-center text-muted-foreground mt-2 uppercase'>
          CodeGuru AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
