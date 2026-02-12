import { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router'; // Use react-router
import apiClient from '@/services/api';
import { Loader2, PlayCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const SubjectSidebar = () => {
  const { slug } = useParams(); // Matches :slug in routes
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/subjects/${slug}`);
        setStructure(data.data);
      } catch (err) {
        console.error('Sidebar fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchStructure();
  }, [slug]);

  if (loading)
    return (
      <div className='p-10 flex justify-center'>
        <Loader2 className='animate-spin' />
      </div>
    );

  return (
    <div className='w-80 h-full bg-slate-50 border-r flex flex-col overflow-y-auto shrink-0'>
      <div className='p-6 border-b bg-white'>
        <h2 className='font-bold text-lg'>Course Content</h2>
      </div>
      <Accordion type='multiple' className='w-full'>
        {structure.map((topic, index) => (
          <AccordionItem value={`item-${topic.id}`} key={topic.id}>
            <AccordionTrigger className='px-6 hover:no-underline'>
              <span className='text-sm font-semibold'>
                {index + 1}. {topic.title}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {topic.units?.map((unit: any) => (
                <div key={unit.id} className='mb-2'>
                  <div className='bg-slate-100 px-6 py-2 text-xs font-bold uppercase text-slate-500'>
                    {unit.title}
                  </div>
                  {unit.subtopics?.map((sub: any) => (
                    <NavLink
                      key={sub.id}
                      to={`/dashboard/student/courses/${slug}/lesson/${sub.slug}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-2 pl-10 pr-4 text-sm transition-all ${
                          isActive
                            ? 'border-r-4 border-blue-600 bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <PlayCircle className='h-4 w-4 shrink-0' />
                      <span>{sub.title}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
