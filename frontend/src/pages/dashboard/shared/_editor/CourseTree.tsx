import { memo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  GripVertical,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  AiLesson,
  AiModule,
  AiTopic,
} from '@/features/aiCurriculum/types';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import { getLessonMeta } from './types';
import { InlineInput, InlineTitle } from './InlineWidgets';

// ─── Subtopic row ─────────────────────────────────────────────────────────────
export const LessonItem = memo(function LessonItem({
  lesson,
  selected,
  canEdit,
  onSelect,
  onDelete,
  onDuplicate,
  onRename,
}: {
  lesson: AiLesson;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (lesson: AiLesson) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this subtopic?')) return;
    setDeleting(true);
    try {
      await aiCurriculumApi.deleteLesson(lesson.id);
      onDelete(lesson.id);
    } catch {
      toast.error('Failed to delete subtopic');
      setDeleting(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicating(true);
    try {
      const res = await aiCurriculumApi.duplicateLesson(lesson.id);
      onDuplicate(res.data.data);
      toast.success('Subtopic duplicated');
    } catch {
      toast.error('Failed to duplicate');
    } finally {
      setDuplicating(false);
    }
  };

  const { Icon, color } = getLessonMeta(lesson);

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors group ${
        selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
      }`}
    >
      {canEdit && (
        <GripVertical className='w-3.5 h-3.5 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab' />
      )}
      <Icon
        className={`w-4 h-4 shrink-0 ${selected ? 'text-indigo-500' : color}`}
      />
      <InlineTitle
        value={lesson.title || 'New Lesson'}
        disabled={!canEdit}
        className={`flex-1 text-[13px] min-w-0 ${
          selected ? 'text-indigo-700 font-semibold' : 'text-slate-700'
        }`}
        onSave={async (v) => {
          await aiCurriculumApi.updateLesson(lesson.id, { title: v });
          onRename(lesson.id, v);
        }}
      />
      {canEdit && (
        <div className='opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity'>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className='p-1 text-slate-300 hover:text-indigo-500 transition-colors'
          >
            {duplicating ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Copy className='w-3 h-3' />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className='p-1 text-slate-300 hover:text-red-400 transition-colors'
          >
            {deleting ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Trash2 className='w-3 h-3' />
            )}
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Unit card ────────────────────────────────────────────────────────────────
// Matches the Figma: each unit is its own independent white bordered card

export function TopicItem({
  topic,
  selectedLessonId,
  canEdit,
  onSelectLesson,
  onDeleteLesson,
  onDeleteTopic,
  onDuplicateTopic,
  onAddLesson,
  onDuplicateLesson,
  onRenameLesson,
  onRename,
  dragHandlers,
}: {
  topic: AiTopic;
  selectedLessonId: string | null;
  canEdit: boolean;
  onSelectLesson: (l: AiLesson) => void;
  onDeleteLesson: (topicId: string, lessonId: string) => void;
  onDeleteTopic: (id: string) => void;
  onDuplicateTopic: (topic: AiTopic) => void;
  onAddLesson: (topicId: string, lesson: AiLesson) => void;
  onDuplicateLesson: (topicId: string, lesson: AiLesson) => void;
  onRenameLesson: (lessonId: string, title: string) => void;
  onRename: (topicId: string, title: string) => void;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  const handleDeleteTopic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete unit "${topic.title}" and all its subtopics?`)) return;
    setDeleting(true);
    try {
      await aiCurriculumApi.deleteTopic(topic.id);
      onDeleteTopic(topic.id);
    } catch {
      toast.error('Failed to delete unit');
      setDeleting(false);
    }
  };

  const handleDuplicateTopic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicating(true);
    try {
      const res = await aiCurriculumApi.duplicateTopic(topic.id);
      onDuplicateTopic(res.data.data);
      toast.success('Unit duplicated');
    } catch {
      toast.error('Failed to duplicate');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddLesson = async (title: string) => {
    setSavingLesson(true);
    try {
      const res = await aiCurriculumApi.addLesson(topic.id, title);
      onAddLesson(topic.id, res.data.data);
      setAddingLesson(false);
      toast.success('Subtopic added');
    } catch {
      toast.error('Failed to add subtopic');
    } finally {
      setSavingLesson(false);
    }
  };

  const totalQs = topic.lessons.reduce(
    (sum, l) =>
      sum + (Array.isArray(l.quiz_questions) ? l.quiz_questions.length : 0),
    0,
  );

  return (
    // Each unit is its own white card — matching the Figma
    <div
      className='bg-white border border-slate-200 rounded-xl overflow-hidden'
      {...dragHandlers}
    >
      {/* Unit header */}
      <div className='flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 group/unit'>
        {canEdit && (
          <GripVertical className='w-3.5 h-3.5 text-slate-300 shrink-0 cursor-grab' />
        )}
        <InlineTitle
          value={topic.title}
          disabled={!canEdit}
          className='flex-1 text-[12px] font-bold text-slate-600 uppercase tracking-wider min-w-0'
          onSave={async (v) => {
            await aiCurriculumApi.updateTopic(topic.id, { title: v });
            onRename(topic.id, v);
          }}
        />
        {canEdit && (
          <div className='flex items-center gap-0.5 opacity-0 group-hover/unit:opacity-100 transition-opacity shrink-0'>
            <button
              onClick={handleDuplicateTopic}
              disabled={duplicating}
              className='p-1 text-slate-300 hover:text-indigo-500 transition-colors'
            >
              {duplicating ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Copy className='w-3 h-3' />
              )}
            </button>
            <button
              onClick={handleDeleteTopic}
              disabled={deleting}
              className='p-1 text-slate-300 hover:text-red-400 transition-colors'
            >
              {deleting ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Trash2 className='w-3 h-3' />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Subtopic list */}
      <div className='px-1 py-1.5 space-y-0.5'>
        {topic.lessons.length === 0 && !addingLesson && (
          <p className='px-3 py-2 text-[12px] text-slate-300 italic'>
            No subtopics yet
          </p>
        )}
        {topic.lessons.map((lesson) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            selected={selectedLessonId === lesson.id}
            canEdit={canEdit}
            onSelect={() => onSelectLesson(lesson)}
            onDelete={(lessonId) => onDeleteLesson(topic.id, lessonId)}
            onDuplicate={(dup) => onDuplicateLesson(topic.id, dup)}
            onRename={onRenameLesson}
          />
        ))}

        {canEdit &&
          (addingLesson ? (
            <div className='px-2 py-1'>
              <InlineInput
                placeholder='Subtopic title...'
                onConfirm={handleAddLesson}
                onCancel={() => setAddingLesson(false)}
                loading={savingLesson}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className='w-full flex items-center gap-2 py-1.5 px-3 text-[12px] text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors'
            >
              <Plus className='w-3.5 h-3.5 shrink-0' /> Add Subtopic
            </button>
          ))}
      </div>

      {/* Quiz + Assignment rows — pinned at bottom of unit card */}
      {(totalQs > 0 || topic.assignment) && (
        <div className='border-t border-slate-100 px-2 py-1.5 space-y-1'>
          {totalQs > 0 && (
            <div className='flex items-center gap-2 py-1.5 px-3 rounded-lg bg-orange-50'>
              <ListChecks className='w-3.5 h-3.5 text-orange-500 shrink-0' />
              <span className='flex-1 text-[12px] font-medium text-orange-700'>
                Unit Quiz
              </span>
              <span className='text-[11px] font-semibold text-orange-500 bg-white border border-orange-200 px-1.5 py-0.5 rounded-full shrink-0'>
                {totalQs}Q
              </span>
            </div>
          )}
          {topic.assignment && (
            <div className='flex items-center gap-2 py-1.5 px-3 rounded-lg bg-amber-50'>
              <ClipboardList className='w-3.5 h-3.5 text-amber-500 shrink-0' />
              <span className='flex-1 text-[12px] font-medium text-amber-700 truncate'>
                {topic.assignment.title}
              </span>
              <span className='text-[11px] font-semibold text-amber-500 bg-white border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0'>
                {topic.assignment.max_score}pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Topic accordion ──────────────────────────────────────────────────────────
// Matches the Figma: plain collapsible header row, unit cards stack below it

export function ModuleItem({
  module: mod,
  index,
  selectedLessonId,
  canEdit,
  onSelectLesson,
  onDeleteLesson,
  onDeleteTopic,
  onDeleteModule,
  onDuplicateModule,
  onDuplicateTopic,
  onAddTopic,
  onAddLesson,
  onDuplicateLesson,
  onRenameLesson,
  onRenameTopic,
  onRenameModule,
  onReorderTopics,
  isDragOver,
  dragHandlers,
}: {
  module: AiModule;
  index: number;
  selectedLessonId: string | null;
  canEdit: boolean;
  onSelectLesson: (l: AiLesson) => void;
  onDeleteLesson: (topicId: string, lessonId: string) => void;
  onDeleteTopic: (moduleId: string, topicId: string) => void;
  onDeleteModule: (id: string) => void;
  onDuplicateModule: (mod: AiModule) => void;
  onDuplicateTopic: (moduleId: string, topic: AiTopic) => void;
  onAddTopic: (moduleId: string, topic: AiTopic) => void;
  onAddLesson: (topicId: string, lesson: AiLesson) => void;
  onDuplicateLesson: (topicId: string, lesson: AiLesson) => void;
  onRenameLesson: (lessonId: string, title: string) => void;
  onRenameTopic: (moduleId: string, topicId: string, title: string) => void;
  onRenameModule: (moduleId: string, title: string) => void;
  onReorderTopics: (moduleId: string, topics: AiTopic[]) => void;
  isDragOver: boolean;
  dragHandlers: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(index === 0);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [addingTopic, setAddingTopic] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [dragTopicIdx, setDragTopicIdx] = useState<number | null>(null);
  const [dragTopicOver, setDragTopicOver] = useState<number | null>(null);

  const handleDeleteModule = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete topic "${mod.title}" and all its content?`)) return;
    setDeleting(true);
    try {
      await aiCurriculumApi.deleteModule(mod.id);
      onDeleteModule(mod.id);
    } catch {
      toast.error('Failed to delete topic');
      setDeleting(false);
    }
  };

  const handleDuplicateModule = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicating(true);
    try {
      const res = await aiCurriculumApi.duplicateModule(mod.id);
      onDuplicateModule(res.data.data);
      toast.success('Topic duplicated');
    } catch {
      toast.error('Failed to duplicate topic');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddTopic = async (title: string) => {
    setSavingTopic(true);
    try {
      const res = await aiCurriculumApi.addTopic(mod.id, title);
      onAddTopic(mod.id, res.data.data);
      setAddingTopic(false);
      toast.success('Unit added');
    } catch {
      toast.error('Failed to add unit');
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDropTopic = async (from: number, to: number) => {
    if (from === to) return;
    const reordered = [...mod.topics];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorderTopics(mod.id, reordered);
    setDragTopicIdx(null);
    setDragTopicOver(null);
    try {
      await aiCurriculumApi.reorderTopics(
        mod.course_id,
        reordered.map((t, i) => ({ id: t.id, order_index: i })),
      );
    } catch {
      toast.error('Failed to reorder units');
      onReorderTopics(mod.id, mod.topics);
    }
  };

  return (
    // Topic = plain header + stacked unit cards below, NOT wrapped in a card
    <div
      className={`transition-all ${isDragOver ? 'opacity-60' : ''}`}
      {...dragHandlers}
    >
      {/* Topic header row */}
      <div className='flex items-center gap-2 px-2 py-2 rounded-lg group/mod hover:bg-slate-100/60 transition-colors'>
        {canEdit && (
          <GripVertical className='w-4 h-4 text-slate-300 cursor-grab shrink-0' />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className='shrink-0 text-slate-400 hover:text-slate-600 transition-colors'
        >
          {open ? (
            <ChevronDown className='w-4 h-4' />
          ) : (
            <ChevronRight className='w-4 h-4' />
          )}
        </button>
        <InlineTitle
          value={mod.title}
          disabled={!canEdit}
          className='flex-1 text-[14px] font-bold text-slate-800 min-w-0'
          onSave={async (v) => {
            await aiCurriculumApi.updateModule(mod.id, { title: v });
            onRenameModule(mod.id, v);
          }}
        />
        {canEdit && (
          <div className='flex items-center gap-0.5 opacity-0 group-hover/mod:opacity-100 transition-opacity shrink-0'>
            <button
              onClick={handleDuplicateModule}
              disabled={duplicating}
              className='p-1.5 text-slate-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-all'
            >
              {duplicating ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Copy className='w-3.5 h-3.5' />
              )}
            </button>
            <button
              onClick={handleDeleteModule}
              disabled={deleting}
              className='p-1.5 text-slate-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all'
            >
              {deleting ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Trash2 className='w-3.5 h-3.5' />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Unit cards — stacked with gap */}
      {open && (
        <div className='ml-6 mt-1 space-y-2'>
          {mod.topics.length === 0 && (
            <p className='text-[13px] text-slate-300 italic px-2 py-1'>
              No units yet.
            </p>
          )}
          {mod.topics.map((topic, ti) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              selectedLessonId={selectedLessonId}
              canEdit={canEdit}
              onSelectLesson={onSelectLesson}
              onDeleteLesson={onDeleteLesson}
              onDeleteTopic={(topicId) => onDeleteTopic(mod.id, topicId)}
              onDuplicateTopic={(dup) => onDuplicateTopic(mod.id, dup)}
              onAddLesson={onAddLesson}
              onDuplicateLesson={onDuplicateLesson}
              onRenameLesson={onRenameLesson}
              onRename={(topicId, title) =>
                onRenameTopic(mod.id, topicId, title)
              }
              dragHandlers={
                canEdit
                  ? {
                      draggable: true,
                      onDragStart: (e) => {
                        e.stopPropagation();
                        setDragTopicIdx(ti);
                      },
                      onDragOver: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragTopicOver(ti);
                      },
                      onDrop: (e) => {
                        e.stopPropagation();
                        if (dragTopicIdx !== null)
                          handleDropTopic(dragTopicIdx, ti);
                      },
                      onDragEnd: (e) => {
                        e.stopPropagation();
                        setDragTopicIdx(null);
                        setDragTopicOver(null);
                      },
                      style:
                        dragTopicOver === ti && dragTopicIdx !== ti
                          ? {
                              opacity: 0.5,
                              outline: '2px solid #818cf8',
                              outlineOffset: 2,
                            }
                          : undefined,
                    }
                  : undefined
              }
            />
          ))}

          {canEdit &&
            (addingTopic ? (
              <div className='bg-white border border-slate-200 rounded-xl px-3 py-2'>
                <InlineInput
                  placeholder='Unit title...'
                  onConfirm={handleAddTopic}
                  onCancel={() => setAddingTopic(false)}
                  loading={savingTopic}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setOpen(true);
                  setAddingTopic(true);
                }}
                className='w-full flex items-center gap-2 py-2 px-3 text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all'
              >
                <Plus className='w-3.5 h-3.5 shrink-0' /> Add Unit
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
