import { BookOpen } from 'lucide-react';

export type SidebarTab = 'video' | 'content' | 'exercise' | 'quiz';

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  published: 'Published',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
};

export const AI_ACTIONS: { label: string; instruction: string }[] = [
  {
    label: 'Regenerate Lesson',
    instruction:
      'Completely rewrite this lesson with fresh, high-quality content and better examples',
  },
  {
    label: 'Simplify Content',
    instruction:
      'Simplify this lesson to be more accessible and easier to understand for beginners',
  },
  {
    label: 'Make Advanced',
    instruction:
      'Rewrite with more advanced technical depth, complex examples, and expert-level insights',
  },
  {
    label: 'Add Examples',
    instruction:
      'Add more concrete, real-world code examples and practical case studies throughout',
  },
  {
    label: 'Add Practice Tasks',
    instruction:
      'Expand the activity section with more detailed hands-on practice tasks and exercises',
  },
];

export function getLessonMeta(): {
  Icon: React.ElementType;
  color: string;
  tab: SidebarTab;
} {
  return { Icon: BookOpen, color: 'text-green-500', tab: 'content' };
}
