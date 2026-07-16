import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Loader2,
  MonitorPlay,
  ListChecks,
  Code2,
  ClipboardList,
  Trophy,
  BookOpen,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { AiCourse, AiModule, AiTopic, AiLesson, AiExercise } from '@/features/aiCurriculum/types';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Week/day breakdown calculator ────────────────────────────────────────────

interface DayPlan {
  day: number;
  lessons: { moduleTitle: string; topicTitle: string; lesson: AiLesson }[];
}

interface WeekPlan {
  week: number;
  days: DayPlan[];
}

function buildLearningPath(modules: AiModule[], durationWeeks: number | null, dailyHours: number | null): WeekPlan[] {
  const allLessons: { moduleTitle: string; topicTitle: string; lesson: AiLesson }[] = [];
  for (const mod of modules) {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        allLessons.push({ moduleTitle: mod.title, topicTitle: topic.title, lesson });
      }
    }
  }

  const weeks = durationWeeks || Math.ceil(allLessons.length / 10) || 4;
  const hoursPerDay = dailyHours || 1;
  const daysTotal = weeks * 5; // 5 working days per week
  const lessonsPerDay = Math.max(1, Math.ceil(allLessons.length / daysTotal));

  const weekPlans: WeekPlan[] = [];
  let lessonIdx = 0;

  for (let w = 0; w < weeks; w++) {
    const days: DayPlan[] = [];
    for (let d = 0; d < 5 && lessonIdx < allLessons.length; d++) {
      const dayLessons = allLessons.slice(lessonIdx, lessonIdx + lessonsPerDay);
      if (dayLessons.length > 0) {
        days.push({ day: d + 1, lessons: dayLessons });
        lessonIdx += lessonsPerDay;
      }
    }
    if (days.length > 0) weekPlans.push({ week: w + 1, days });
    if (lessonIdx >= allLessons.length) break;
  }

  // Attach remaining lessons to last day
  if (lessonIdx < allLessons.length && weekPlans.length > 0) {
    const lastWeek = weekPlans[weekPlans.length - 1];
    if (lastWeek.days.length > 0) {
      lastWeek.days[lastWeek.days.length - 1].lessons.push(...allLessons.slice(lessonIdx));
    }
  }

  return weekPlans;
  void hoursPerDay;
}

// ─── Formatting helper ──────────────────────────────────────────────────────────

// Often AI returns instructions as a single continuous string without proper line breaks.
// This helper tries to inject newlines before common list markers so ReactMarkdown can render them.
function formatAiText(text: any): string {
  if (!text) return '';
  if (typeof text !== 'string') text = JSON.stringify(text, null, 2);
  let formatted = text
    // Add newlines before "Step X:" or "1." or "a." or "-"
    .replace(/(?<!\n)(Step \d+:)/gi, '\n\n**$1**')
    .replace(/(?<!\n)(\d+\.)(?=\s+[A-Z])/g, '\n\n$1')
    .replace(/(?<!\n)([a-z]\.)(?=\s+[A-Z])/g, '\n  $1')
    .replace(/(?<!\n)(-\s+)(?=[A-Z])/g, '\n$1')
    // Highlight specific keywords
    .replace(/(Acceptance criteria:)/gi, '\n\n**$1**\n')
    .replace(/(Objective:)/gi, '**$1**\n\n');
  return formatted;
}

// ─── Lesson preview row ────────────────────────────────────────────────────────

const getEmbedUrl = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    //
  }
  return url;
};

function LessonPreview({ lesson }: { lesson: AiLesson }) {
  const [open, setOpen] = useState(false);
  const quizCount = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions.length : 0;
  const hasExercise = !!lesson.exercise_data;

  return (
    <div className='border border-slate-100 rounded-xl overflow-hidden'>
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left'
      >
        <MonitorPlay className='w-4 h-4 text-blue-400 shrink-0' />
        <span className='flex-1 text-[13px] font-medium text-slate-700'>{lesson.title}</span>
        <div className='flex items-center gap-2 shrink-0'>
          {lesson.video_url && <span className='text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-semibold'>Video</span>}
          {quizCount > 0 && <span className='text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full font-semibold'>{quizCount} Quiz</span>}
          {hasExercise && <span className='text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold'>Exercise</span>}
          <span className='text-[11px] text-slate-400'>{lesson.duration_mins ?? 20}m</span>
          {open ? <ChevronDown className='w-4 h-4 text-slate-300' /> : <ChevronRight className='w-4 h-4 text-slate-300' />}
        </div>
      </button>

      {open && (
        <div className='border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50'>
          {lesson.video_url && (
            <div className='not-prose mb-6'>
              {lesson.video_url.includes('results?') ? (
                <div className='bg-slate-100 rounded-xl p-6 text-center border border-slate-200'>
                  <MonitorPlay className='w-8 h-8 text-slate-400 mx-auto mb-3' />
                  <p className='text-sm font-semibold text-slate-700 mb-2'>AI suggested a YouTube search instead of a direct video.</p>
                  <a href={lesson.video_url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-[13px] hover:bg-red-100 transition-colors'>
                    View Search Results on YouTube
                  </a>
                </div>
              ) : (
                <div className='aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black'>
                  <iframe
                    className='h-full w-full'
                    src={getEmbedUrl(lesson.video_url)}
                    title='Lesson video'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    referrerPolicy='strict-origin-when-cross-origin'
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {lesson.explanation && (
            <div>
              <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5'>Lesson Content</p>
              <div className='prose prose-slate prose-sm max-w-none prose-pre:whitespace-pre-wrap prose-pre:break-words'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.explanation}</ReactMarkdown>
              </div>
            </div>
          )}

          {lesson.example && (
            <div>
              <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5'>Example</p>
              <div className='prose prose-slate prose-sm max-w-none prose-pre:whitespace-pre-wrap prose-pre:break-words'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.example}</ReactMarkdown>
              </div>
            </div>
          )}

          {lesson.activity && (
            <div className='bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5'>
              <p className='text-[11px] font-semibold text-blue-600 mb-1'>Activity</p>
              <div className='prose prose-slate prose-sm max-w-none text-blue-800 prose-p:text-blue-800 prose-headings:text-blue-900 prose-pre:whitespace-pre-wrap prose-pre:break-words'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.activity}</ReactMarkdown>
              </div>
            </div>
          )}

          {quizCount > 0 && (
            <div>
              <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5'>
                <ListChecks className='w-3.5 h-3.5 text-orange-400' /> {quizCount} Quiz Questions
              </p>
              <div className='space-y-2'>
                {(lesson.quiz_questions as { question: string; options: string[]; correct_index: number }[]).slice(0, 2).map((q, qi) => (
                  <div key={qi} className='border border-slate-200 rounded-lg overflow-hidden'>
                    <div className='bg-slate-50 px-3 py-2 text-[12px] text-slate-700 font-medium'>{q.question}</div>
                    <div className='divide-y divide-slate-100'>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${oi === q.correct_index ? 'bg-green-50 text-green-700' : 'text-slate-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 shrink-0 ${oi === q.correct_index ? 'text-green-500' : 'text-slate-200'}`} />
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {quizCount > 2 && <p className='text-[12px] text-slate-400'>+{quizCount - 2} more questions</p>}
              </div>
            </div>
          )}

          {hasExercise && (() => {
            let parsedData;
            try {
              parsedData = typeof lesson.exercise_data === 'string'
                ? JSON.parse(lesson.exercise_data)
                : lesson.exercise_data;
            } catch (err) {
              parsedData = null;
            }
            const ex = parsedData as AiExercise;
            if (!ex) return null;
            return (
              <div>
                <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5'>
                  <Code2 className='w-3.5 h-3.5 text-indigo-400' /> Exercise: {ex.title}
                </p>
                <div className='bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-4 text-[13px]'>
                  {ex.description && (
                    <div>
                      <h5 className='font-bold text-slate-700 mb-1'>Description</h5>
                      <div className='prose prose-slate prose-sm max-w-none text-slate-600'>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ex.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {ex.tasks && (Array.isArray(ex.tasks) ? ex.tasks.length > 0 : typeof (ex.tasks as any) === 'string' && (ex.tasks as any).trim() !== '') && (
                    <div>
                      <h5 className='font-bold text-slate-700 mb-1'>Tasks</h5>
                      <ul className='list-disc pl-5 space-y-1 text-slate-600'>
                        {Array.isArray(ex.tasks) ? (
                          ex.tasks.filter(t => typeof t === 'string' && t.trim()).map((task, i) => (
                            <li key={i}>{task}</li>
                          ))
                        ) : typeof (ex.tasks as any) === 'string' ? (
                          ((ex.tasks as any) as string).split('\n').filter(Boolean).map((task, i) => (
                            <li key={i}>{task}</li>
                          ))
                        ) : null}
                      </ul>
                    </div>
                  )}

                  {ex.starter_code && typeof ex.starter_code === 'string' && ex.starter_code.trim() && (
                    <div>
                      <h5 className='font-bold text-slate-700 mb-1'>Starter Code</h5>
                      <pre className='bg-slate-100 p-3 rounded-lg overflow-auto text-[12px] font-mono text-slate-800 border border-slate-200'>
                        <code>{ex.starter_code}</code>
                      </pre>
                    </div>
                  )}

                  {ex.resource_links && Array.isArray(ex.resource_links) && ex.resource_links.filter(l => typeof l === 'string' && l.trim()).length > 0 && (
                    <div>
                      <h5 className='font-bold text-slate-700 mb-1'>Resource Links</h5>
                      <ul className='list-disc pl-5 space-y-1'>
                        {ex.resource_links.filter(l => typeof l === 'string' && l.trim()).map((link, idx) => (
                          <li key={idx}>
                            <a href={link} target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline font-semibold break-all'>
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ex.reference_files && Array.isArray(ex.reference_files) && ex.reference_files.filter(f => typeof f === 'string' && f.trim()).length > 0 && (
                    <div>
                      <h5 className='font-bold text-slate-700 mb-1'>Zip Files</h5>
                      <ul className='list-disc pl-5 space-y-1'>
                        {ex.reference_files.filter(f => typeof f === 'string' && f.trim()).map((file, idx) => {
                          const isUrl = typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'));
                          const displayName = isUrl ? (() => {
                            try {
                              const decoded = decodeURIComponent(file);
                              const parts = decoded.split('/');
                              const lastPart = parts[parts.length - 1];
                              return lastPart.replace(/^\d+-/, '');
                            } catch {
                              return file;
                            }
                          })() : file;

                          return (
                            <li key={idx}>
                              {isUrl ? (
                                <a href={file} target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline font-semibold break-all inline-flex items-center gap-1'>
                                  <Download className='w-3 h-3' /> {displayName}
                                </a>
                              ) : (
                                <span className='text-slate-700'>{file}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Topic preview ─────────────────────────────────────────────────────────────

function TopicPreview({ topic }: { topic: AiTopic }) {
  const [open, setOpen] = useState(true);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

  return (
    <div className='border border-slate-200 rounded-xl overflow-hidden mb-3'>
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left'
      >
        {open ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronRight className='w-4 h-4 text-slate-400' />}
        <span className='flex-1 text-[13px] font-semibold text-slate-700'>{topic.title}</span>
        <span className='text-[12px] text-slate-400'>{topic.lessons.length} subtopics</span>
        {(() => {
          const totalQs = topic.lessons.reduce((sum, l) => sum + (Array.isArray(l.quiz_questions) ? l.quiz_questions.length : 0), 0);
          return totalQs > 0 ? (
            <span className='text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-semibold ml-2'>
              Quiz · {totalQs}Q
            </span>
          ) : null;
        })()}
        {topic.assignment && (
          <span className='text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold ml-2'>
            Assignment
          </span>
        )}
      </button>

      {open && (
        <div className='p-4 space-y-2'>
          {topic.lessons.map((lesson) => (
            <LessonPreview key={lesson.id} lesson={lesson} />
          ))}

          {Array.isArray(topic.quiz_questions) && topic.quiz_questions.length > 0 && (
            <div className='mt-3'>
              <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5'>
                <ListChecks className='w-3.5 h-3.5 text-orange-400' /> Unit Quiz · {topic.quiz_questions.length} Questions
              </p>
              <div className='space-y-2'>
                {(topic.quiz_questions as { question: string; options: string[]; correct_index: number }[]).slice(0, showAllQuizzes ? topic.quiz_questions.length : 3).map((q, qi) => (
                  <div key={qi} className='border border-slate-200 rounded-lg overflow-hidden'>
                    <div className='bg-slate-50 px-3 py-2 text-[12px] text-slate-700 font-medium'>{q.question}</div>
                    <div className='divide-y divide-slate-100'>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${oi === q.correct_index ? 'bg-green-50 text-green-700' : 'text-slate-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 shrink-0 ${oi === q.correct_index ? 'text-green-500' : 'text-slate-200'}`} />
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!showAllQuizzes && topic.quiz_questions.length > 3 && (
                  <button onClick={(e) => { e.stopPropagation(); setShowAllQuizzes(true); }} className='text-[12px] font-medium text-indigo-500 hover:text-indigo-600 transition-colors w-full text-left py-1'>
                    +{topic.quiz_questions.length - 3} more questions
                  </button>
                )}
                {showAllQuizzes && topic.quiz_questions.length > 3 && (
                  <button onClick={(e) => { e.stopPropagation(); setShowAllQuizzes(false); }} className='text-[12px] font-medium text-indigo-500 hover:text-indigo-600 transition-colors w-full text-left py-1'>
                    - Show fewer Quiz
                  </button>
                )}
              </div>
            </div>
          )}

          {topic.assignment && (
            <div className='mt-3'>
              <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5'>
                <ClipboardList className='w-3.5 h-3.5 text-amber-500' /> Unit Assignment
              </p>
              <div className='flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl'>
                <div className='flex-1'>
                  <p className='text-[12px] font-bold text-amber-800'>{topic.assignment.title}</p>
                  <div className='prose prose-amber prose-sm max-w-none text-amber-700 prose-p:text-amber-700 prose-headings:text-amber-800 prose-pre:whitespace-pre-wrap prose-pre:break-words mt-1'>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatAiText(topic.assignment.instructions)}</ReactMarkdown>
                  </div>
                </div>
                <span className='text-[12px] font-bold text-amber-600 shrink-0 bg-white border border-amber-200 px-2 py-0.5 rounded-full'>{topic.assignment.max_score} pts</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main preview page ────────────────────────────────────────────────────────

export default function AiCurriculumPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';

  const [course, setCourse] = useState<AiCourse | null>(null);
  const [modules, setModules] = useState<AiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'schedule'>('curriculum');
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    aiCurriculumApi.get(id)
      .then((res) => {
        setCourse(res.data.data);
        setModules(res.data.data.modules);
        setOpenModules(new Set([res.data.data.modules[0]?.id]));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='w-7 h-7 animate-spin text-indigo-500' />
      </div>
    );
  }

  if (!course) return <div className='p-8'>Course not found.</div>;

  const totalLessons = modules.reduce((s, m) => s + m.topics.reduce((ts, t) => ts + t.lessons.length, 0), 0);
  const totalTopics = modules.reduce((s, m) => s + m.topics.length, 0);
  const totalDuration = modules.reduce((s, m) => m.topics.reduce((ts, t) => t.lessons.reduce((ls, l) => ls + (l.duration_mins ?? 20), ts), s), 0);
  const weekPlan = buildLearningPath(modules, course.duration_weeks, course.daily_hours);

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className='min-h-screen bg-slate-50'>
      {/* Header */}
      <div className='bg-white border-b border-slate-200 px-8 py-5'>
        <div className='flex items-center gap-3 mb-4'>
          <button onClick={() => navigate(`${base}/ai-curriculum/${id}/edit`)}
            className='p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors'>
            <ArrowLeft className='w-4 h-4' />
          </button>
          <span className='text-[12px] text-slate-400 font-medium'>Preview Mode — student view</span>
        </div>

        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-2xl font-extrabold text-slate-900'>{course.title}</h1>
            <p className='text-sm text-slate-500 mt-1'>{course.learning_goal}</p>
            <div className='flex items-center gap-4 mt-3'>
              <span className='flex items-center gap-1.5 text-[13px] text-slate-500'>
                <BookOpen className='w-4 h-4' /> {modules.length} Modules · {totalTopics} Topics · {totalLessons} Lessons
              </span>
              {course.duration_weeks && (
                <span className='flex items-center gap-1.5 text-[13px] text-slate-500'>
                  <Calendar className='w-4 h-4' /> {course.duration_weeks} weeks
                </span>
              )}
              <span className='flex items-center gap-1.5 text-[13px] text-slate-500'>
                <Clock className='w-4 h-4' /> {Math.round(totalDuration / 60)}h total
              </span>
              <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full capitalize ${course.level === 'beginner' ? 'bg-green-100 text-green-700' : course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {course.level}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-1 mt-5 border-b border-slate-100'>
          {(['curriculum', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[13px] font-semibold capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'curriculum' ? 'Curriculum' : 'Week/Day Schedule'}
            </button>
          ))}
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-6 py-8'>
        {activeTab === 'curriculum' && (
          <div className='space-y-6'>
            {modules.map((mod, mi) => {
              const isOpen = openModules.has(mod.id);
              return (
                <div key={mod.id} className='bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm'>
                  <button
                    onClick={() => setOpenModules((s) => {
                      const next = new Set(s);
                      if (next.has(mod.id)) next.delete(mod.id); else next.add(mod.id);
                      return next;
                    })}
                    className='w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left'
                  >
                    <span className='w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-[13px] font-bold flex items-center justify-center shrink-0'>
                      {mi + 1}
                    </span>
                    <div className='flex-1'>
                      <p className='text-base font-bold text-slate-800'>{mod.title}</p>
                      <p className='text-[12px] text-slate-400 mt-0.5'>{mod.topics.length} units · {mod.topics.reduce((s, t) => s + t.lessons.length, 0)} subtopics</p>
                    </div>
                    {isOpen ? <ChevronDown className='w-5 h-5 text-slate-300' /> : <ChevronRight className='w-5 h-5 text-slate-300' />}
                  </button>

                  {isOpen && (
                    <div className='border-t border-slate-100 p-6'>
                      {mod.description && (
                        <p className='text-[13px] text-slate-500 mb-4'>{mod.description}</p>
                      )}
                      {mod.topics.map((topic) => (
                        <TopicPreview key={topic.id} topic={topic} />
                      ))}

                      {mod.capstone_project && (
                        <div className='mt-4 flex items-start gap-3 px-5 py-4 rounded-xl bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200'>
                          <Trophy className='w-5 h-5 text-indigo-500 shrink-0 mt-0.5' />
                          <div>
                            <p className='text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1'>Capstone Project</p>
                            <p className='text-sm font-bold text-indigo-800'>{mod.capstone_project.title}</p>
                            <p className='text-[12px] text-indigo-600 mt-1'>{mod.capstone_project.description}</p>
                            {mod.capstone_project.instructions && (
                              <p className='text-[11px] text-indigo-500 mt-2 border-t border-indigo-100 pt-2 whitespace-pre-wrap break-words'>
                                {typeof mod.capstone_project.instructions === 'string' 
                                  ? mod.capstone_project.instructions 
                                  : JSON.stringify(mod.capstone_project.instructions, null, 2)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}

        {activeTab === 'schedule' && (
          <div className='space-y-6'>
            <div className='bg-white rounded-xl border border-slate-200 p-4'>
              <p className='text-sm text-slate-500'>
                Based on <strong>{course.duration_weeks || 'auto'} weeks</strong> at <strong>{course.daily_hours || 1} hr/day</strong> · {totalLessons} subtopics across {weekPlan.length} weeks
              </p>
            </div>

            {weekPlan.map(({ week, days }) => (
              <div key={week} className='bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm'>
                <div className='px-6 py-4 bg-slate-50 border-b border-slate-100'>
                  <h3 className='text-base font-bold text-slate-800'>Week {week}</h3>
                </div>
                <div className='p-4 space-y-3'>
                  {days.map(({ day, lessons }) => (
                    <div key={day} className='flex gap-4'>
                      <div className='w-14 shrink-0 pt-1'>
                        <span className='text-[12px] font-bold text-slate-400'>{DAY_NAMES[day - 1]}</span>
                      </div>
                      <div className='flex-1 space-y-1.5'>
                        {lessons.map(({ moduleTitle, topicTitle, lesson }) => (
                          <div key={lesson.id} className='flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100'>
                            <MonitorPlay className='w-3.5 h-3.5 text-blue-400 shrink-0' />
                            <div className='flex-1 min-w-0'>
                              <p className='text-[13px] font-medium text-slate-700 truncate'>{lesson.title}</p>
                              <p className='text-[11px] text-slate-400 truncate'>{moduleTitle} → {topicTitle}</p>
                            </div>
                            <span className='text-[11px] text-slate-400 shrink-0'>{lesson.duration_mins ?? 20}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {modules.some(m => m.capstone_project) && (
              <div className='flex items-center gap-4 px-6 py-4 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl'>
                <Trophy className='w-5 h-5 text-indigo-500 shrink-0' />
                <div>
                  <p className='text-[13px] font-bold text-indigo-800'>Capstone Projects</p>
                  <p className='text-[12px] text-indigo-500'>{modules.filter(m => m.capstone_project).map(m => m.capstone_project!.title).join(' · ')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
