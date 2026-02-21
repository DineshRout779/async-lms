import { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router'; // Use react-router
import apiClient from '@/services/api';
import { Loader2, PlayCircle, ListChecks } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const SubjectSidebar = () => {
  const { slug, subtopicSlug, exerciseId, quizId } = useParams(); // Matches params in routes
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedValue, setExpandedValue] = useState<string[]>([]);

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

  // Auto-expand topic when a lesson/content within it is active
  useEffect(() => {
    if (!structure.length) return;

    const currentTopic = structure.find((topic) =>
      topic.units?.some(
        (unit: any) =>
          unit.subtopics?.some((sub: any) => sub.slug === subtopicSlug) ||
          unit.assignments?.some((a: any) => a.id === exerciseId) ||
          unit.quizzes?.some((q: any) => q.id === quizId),
      ),
    );

    if (currentTopic) {
      const itemValue = `item-${currentTopic.id}`;
      setExpandedValue((prev) =>
        prev.includes(itemValue) ? prev : [...prev, itemValue],
      );
    }
  }, [structure, subtopicSlug, exerciseId, quizId]);

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
      <Accordion
        type='multiple'
        className='w-full'
        value={expandedValue}
        onValueChange={setExpandedValue}
      >
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
                  {unit.assignments?.map((a: any) => (
                    <NavLink
                      key={a.id}
                      to={`/dashboard/student/courses/${slug}/assignment/${a.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-2 pl-10 pr-4 text-sm transition-all ${
                          isActive
                            ? 'border-r-4 border-blue-600 bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <ListChecks className='h-4 w-4 shrink-0' />
                      <span>{a.title}</span>
                    </NavLink>
                  ))}
                  {unit.quizzes?.map((quiz: any, qIdx: number) => (
                    <NavLink
                      key={quiz.id}
                      to={`/dashboard/student/courses/${slug}/quiz/${quiz.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-2 pl-10 pr-4 text-sm transition-all ${
                          isActive
                            ? 'border-r-4 border-blue-600 bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <ListChecks className='h-4 w-4 shrink-0' />
                      <span>Quiz {qIdx + 1}</span>
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
