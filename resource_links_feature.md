# Feature Summary: AI Curriculum Resource Links & Starter Code

This document outlines the changes made to the async-lms repository to improve the AI Curriculum Builder's exercise generation and add dynamic resource link support for lessons.

## 1. AI Starter Code Generation Fix
- **File:** `backend/services/aiCurriculumService.js`
- **Change:** Modified the LLM prompts in `generateCurriculum` and `generateLessonContent`.
- **Details:** The AI is now explicitly instructed to only generate `starter_code` if the topic involves programming or technical coding. For non-IT and non-technical subjects, it correctly returns an empty string instead of irrelevant mock HTML/pseudocode.

## 2. Database Schema Update
- **File:** `backend/config/pg.js`
- **Change:** Added a new schema migration.
- **Details:** Added the `resource_links` column to the `ai_course_lessons` table. The column uses the `JSONB` data type with a default of `'[]'::jsonb` to support an unlimited array of URLs.

## 3. Backend API Integration
- **File:** `backend/controllers/aiCurriculum.controller.js`
- **Change:** Updated the `updateLesson` controller endpoint.
- **Details:** Destructured `resource_links` from the incoming `req.body` and correctly parses and saves it to the PostgreSQL database as a JSON string when the frontend triggers an update.

## 4. Frontend Type Definitions
- **File:** `frontend/src/features/aiCurriculum/types.ts`
- **Change:** Extended the `AiLesson` interface.
- **Details:** Added `resource_links?: string[]` so the TypeScript compiler and UI components are aware of the new array payload.

## 5. Editor UI Enhancements & CSS Fixes
- **File:** `frontend/src/pages/dashboard/shared/_editor/RightSidebar.tsx`
- **Change:** Overhauled the `ContentTab` component.
- **Details:** 
  - **Dynamic Inputs:** Replaced static inputs with a fully dynamic array system. Instructors can start with one input and click **"+ Add another field"** to attach as many cloud files, Google Drive folders, or web links as needed.
  - **Live Preview:** Updated the "Preview" toggle logic. When previewing markdown, the UI now automatically renders an "Attached Resources" section at the bottom, mapping the URLs to clickable links so instructors can test them immediately.
  - **Layout Fix:** Removed rigid `min-h-64` and `h-full` constraints from the textarea that caused elements to overlap during manual resizing. Replaced with proper `gap-6` and minimum heights on the flex container to ensure the layout pushes down smoothly when the editor is expanded.
