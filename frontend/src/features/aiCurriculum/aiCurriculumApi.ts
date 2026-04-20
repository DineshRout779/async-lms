import apiClient from '@/services/api';
import type {
  AiCourse, CourseFormData, GeneratedCurriculum, Skill,
  CourseAction, ReviewFeedback, AiModule, AiTopic, AiLesson,
} from './types';

export const aiCurriculumApi = {
  // AI helpers
  extractSkills: (jd_text: string) =>
    apiClient.post<{ success: boolean; data: Skill[] }>('/ai-curriculum/extract-skills', { jd_text }),

  generate: (data: CourseFormData) =>
    apiClient.post<{ success: boolean; data: GeneratedCurriculum }>('/ai-curriculum/generate', data),

  // Course CRUD
  list: (params?: { status?: string }) =>
    apiClient.get<{ success: boolean; data: AiCourse[] }>('/ai-curriculum', { params }),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: AiCourse }>(`/ai-curriculum/${id}`),

  save: (data: CourseFormData & { modules: GeneratedCurriculum['modules'] }) =>
    apiClient.post<{ success: boolean; data: { id: string } }>('/ai-curriculum', data),

  update: (id: string, data: Partial<CourseFormData>) =>
    apiClient.put(`/ai-curriculum/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/ai-curriculum/${id}`),

  // Workflow
  submit: (id: string) =>
    apiClient.put(`/ai-curriculum/${id}/submit`),

  review: (id: string, action: CourseAction, feedback: ReviewFeedback) =>
    apiClient.put(`/ai-curriculum/${id}/review`, { action, feedback }),

  publish: (id: string) =>
    apiClient.put(`/ai-curriculum/${id}/publish`),

  // Inline edits
  updateModule: (id: string, data: Partial<AiModule>) =>
    apiClient.patch(`/ai-curriculum/modules/${id}`, data),

  updateTopic: (id: string, data: Partial<AiTopic>) =>
    apiClient.patch(`/ai-curriculum/topics/${id}`, data),

  updateLesson: (id: string, data: Partial<AiLesson>) =>
    apiClient.patch(`/ai-curriculum/lessons/${id}`, data),

  regenerateLesson: (id: string, instruction: string) =>
    apiClient.post<{ success: boolean; data: Partial<AiLesson> }>(`/ai-curriculum/lessons/${id}/regenerate`, { instruction }),

  reorderModules: (courseId: string, ordered_ids: { id: string; order_index: number }[]) =>
    apiClient.put(`/ai-curriculum/${courseId}/reorder-modules`, { ordered_ids }),
};
