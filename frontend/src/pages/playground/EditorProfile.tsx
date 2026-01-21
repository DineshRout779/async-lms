import React, { useState } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  Terminal,
  // Database,
  Layers,
  ChevronRight,
  // Cpu,
  MonitorPlay,
} from 'lucide-react';
import { useNavigate } from 'react-router';

// Types for our environments
type Environment = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  color: string;
};

const ENVIRONMENTS: Environment[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Node.js runtime with modern ES6+ support.',
    icon: <Code2 className='w-8 h-8 text-yellow-400' />,
    tags: ['Frontend', 'Backend'],
    color: 'border-t-yellow-400',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Data Science, Scripting, and Web Apps with pip.',
    icon: <Terminal className='w-8 h-8 text-blue-500' />,
    tags: ['AI', 'Scripting'],
    color: 'border-t-blue-500',
  },
  // {
  //   id: 'java',
  //   name: 'Java',
  //   description: 'Enterprise grade environment with Maven/Gradle.',
  //   icon: <Cpu className='w-8 h-8 text-red-500' />,
  //   tags: ['Enterprise', 'Backend'],
  //   color: 'border-t-red-500',
  // },
  // {
  //   id: 'sql',
  //   name: 'SQL',
  //   description: 'Relational database playground with PostgreSQL.',
  //   icon: <Database className='w-8 h-8 text-cyan-500' />,
  //   tags: ['Data', 'Database'],
  //   color: 'border-t-cyan-500',
  // },
  {
    id: 'mern',
    name: 'MERN Stack',
    description: 'Full-stack MongoDB, Express, React, and Node.',
    icon: <Layers className='w-8 h-8 text-green-500' />,
    tags: ['Fullstack', 'Web'],
    color: 'border-t-green-500',
  },
];

const EditorProfile = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleBoot = async (envId: string) => {
    console.log(`Booting dev environment for: ${envId}`);
    try {
      const pid = new Date().getTime();
      navigate(`/code-editor?pid=${pid}&cp=${envId}`);
    } catch (error) {
      console.log('Error while starting editor', error);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 p-8 dark:bg-slate-950'>
      <div className='max-w-6xl mx-auto'>
        <header className='mb-10'>
          <h1 className='text-3xl font-bold tracking-tight mb-2'>
            Editor Profile
          </h1>
          <p className='text-slate-500 dark:text-slate-400'>
            Select a language or framework to launch your dedicated development
            environment.
          </p>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {ENVIRONMENTS.map((env) => (
            <Card
              key={env.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer border-t-4 ${
                env.color
              } ${
                selected === env.id
                  ? 'ring-2 ring-primary bg-slate-100/50 dark:bg-slate-900/50'
                  : ''
              }`}
              onClick={() => setSelected(env.id)}
            >
              <CardHeader className='pb-4'>
                <div className='flex justify-between items-start'>
                  <div className='p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm'>
                    {env.icon}
                  </div>
                  <div className='flex gap-1 flex-wrap justify-end'>
                    {env.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant='secondary'
                        className='text-[10px] font-medium uppercase'
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CardTitle className='mt-4'>{env.name}</CardTitle>
                <CardDescription className='min-h-10 leading-relaxed'>
                  {env.description}
                </CardDescription>
              </CardHeader>

              <CardFooter className='pt-0'>
                <Button
                  className='w-full group'
                  variant={selected === env.id ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBoot(env.id);
                  }}
                >
                  <MonitorPlay className='w-4 h-4 mr-2' />
                  Start Coding
                  <ChevronRight className='w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity' />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {selected && (
          <div className='mt-12 p-4 border rounded-lg bg-white dark:bg-slate-900 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4'>
            <div className='flex items-center gap-3 text-sm'>
              <span className='relative flex h-3 w-3'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-3 w-3 bg-green-500'></span>
              </span>
              <p className='font-medium'>
                Ready to launch{' '}
                {ENVIRONMENTS.find((e) => e.id === selected)?.name}{' '}
                environment...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorProfile;
