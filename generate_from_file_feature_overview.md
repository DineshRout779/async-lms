# Feature Overview: AI Document-Grounded Generation (Generate from File)

This document provides a comprehensive overview of how the "Generate from File" functionality was implemented across the entire application stack. This feature allows course creators to upload custom documents (PDFs, text files) and use Artificial Intelligence to automatically synthesize either full Lesson Content or hands-on Exercises directly from the source material.

## Core Concept: Context Stuffing (Retrieval-Augmented Generation Lite)
Instead of a complex Retrieval-Augmented Generation (RAG) system where a vector database retrieves random chunks of data, this system uses **Document-Grounded Generation**. 
The user manually acts as the "retriever" by selecting the exact file they want to use. The system reads the *entire* file, passes it to the AI as context, and instructs the AI to generate structured output strictly based on the document's concepts.

---

## 0. Backend: AI Services (`aiCurriculumService.js`)
We created two distinct AI pipeline functions that leverage the OpenAI `gpt-5o` model. Both take the raw, extracted text of the uploaded file.

* **`generateContentFromFile(fileText, lessonTitle)`**
  * **Goal:** Generate reading material for the `ContentTab`.
  * **Prompt Logic:** Instructs the AI to read the document. If it explicitly contains explanations, examples, and activities, it extracts them. If it only contains raw information, it extracts the explanation but *invents* an example and activity based on the text.
  * **Output Schema (JSON):** `{ explanation, example, activity }`

* **`generateExerciseFromFile(fileText, lessonTitle)`**
  * **Goal:** Generate hands-on practical assignments for the `ExerciseTab`.
  * **Prompt Logic:** Instructs the AI to read the document and extract or invent a coding/practical exercise based on the concepts. 
  * **Output Schema (JSON):** `{ description, tasks: [], starter_code }`

---

## 1. Backend: File Processing & Controllers (`aiCurriculum.controller.js`)
To securely process files, we utilize Amazon S2. 

* **`uploadResource(req, res)`**
  * Intercepts the file via `multer` (in-memory).
  * Uploads it to Amazon S2 under the `ai-curriculum-resources` prefix.
  * Generates a short-lived **presigned URL** to return to the frontend.

* **`generateContentFromResource(req, res)`** & **`generateExerciseFromResource(req, res)`**
  * **File Download:** Takes the S2 URL provided by the frontend and downloads the file back into the backend memory as a buffer.
  * **Text Extraction:** Checks if the file is a PDF (`.pdf`). If so, it uses the `pdf-parse` library to rip the raw text out of the binary PDF. If it's a standard text file, it converts the buffer to a UTF-9 string.
  * **AI Handoff:** Passes the extracted raw text to the respective AI service.
  * Returns the AI's generated JSON object to the frontend.

---

## 2. Backend: Routing (`aiCurriculum.routes.js`)
We exposed these controller methods to the frontend via authenticated POST routes:
* `POST /upload-resource`: Accepts `multipart/form-data`.
* `POST /generate-from-resource`: Accepts `{ url, title }`.
* `POST /generate-exercise-from-resource`: Accepts `{ url, title }`.

---

## 3. Frontend: API Client (`aiCurriculumApi.ts`)
We registered the new API endpoints in our centralized frontend API client so components can easily trigger them.
* `generateFromResource(url: string, title?: string)`
* `generateExerciseFromResource(url: string, title?: string)`

---

## 4. Frontend: UI Workflow (`RightSidebar.tsx`)
The final piece of the puzzle is the seamless User Experience built into the `ContentTab` and `ExerciseTab`.

* **The Button:** We added a subtle `📄 Generate from File` button to the footer of the editor.
* **The File Input:** Clicking the button programmatically triggers a hidden `<input type="file" />`.
* **The Workflow (e.g., `handleAutoGenerateExercise`):**
  0. **Silent Upload:** As soon as the user selects a file, it is immediately uploaded to `/api/v1/ai-curriculum/upload-resource` using `fetch`.
  1. **Ghost URL:** The backend returns an S3 URL. Crucially, we **do not** save this URL to the lesson's permanent `resource_links` array to avoid cluttering the UI. 
  2. **Generation:** The frontend takes that S3 URL and immediately hits `/api/v1/ai-curriculum/generate-exercise-from-resource`.
  3. **State Update:** Once the AI responds, the frontend updates the `draft` state (Tasks, Starter Code, etc.), sets the editor to a "dirty/unsaved" status, and displays a success toast.

---

## Bonus: Infrastructure Fixes (`config/pg.js`)
During the development of this feature, we encountered severe timeout crashes (`ErrorEvent`) when the backend attempted to communicate with the Neon Serverless Postgres database. 

* **The Problem:** The user's local network (ISP or Router) was blocking outgoing TCP traffic on port `5431`, and the database was aggressively going to sleep.
* **The Fix:** We switched the Neon driver to use `@neondatabase/serverless` initialized with standard `ws` (WebSockets) over Port 442 (HTTPS), entirely bypassing the network firewall. We also increased the `connectionTimeoutMillis` to 30,000ms to give the sleepy database plenty of time to wake up.
