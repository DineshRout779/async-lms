# Bug Fixes Summary: Exercise & Submission Flow

This document outlines the recent critical bugs resolved in the asynchronous learning management system (Async-LMS), specifically focusing on the code execution and submission flow. It explains what the bug was, why it occurred, and exactly how it was solved to provide clear context for Pull Request (PR) reviewers.

---

## 1. Test Case Evaluation Bug (String Escaping)
**What:** 
The backend failed to properly evaluate automated test cases for JavaScript exercises. Even correct code would fail or cause the execution engine to throw errors.

**Why:** 
When the backend assembled the final executable script in `student.controller.js`, it injected the student's raw code as a template literal string (`` const studentCodeString = `${escapedCode}`; ``) so it could be evaluated by the testing framework. However, characters like backticks (`` ` ``) and dollar signs (`$`) inside the student's code were not being escaped. This caused syntax errors in the generated `__tests__.js` file, breaking the execution.

**How we solved it:**
We updated `runTestCases` in `student.controller.js` to strictly escape backslashes, backticks, and dollar signs before injecting the code into the wrapper template:
```javascript
const escapedCode = studentCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
```
This ensures the test runner always generates valid JavaScript.

---

## 2. Server Crash on Submission (Nodemon Bug)
**What:** 
Clicking the "Submit" button on an exercise would sometimes cause the frontend to hang endlessly or throw a `net::ERR_CONNECTION_RESET` error. 

**Why:** 
During development, the backend runs using `nodemon`. When a student submits an exercise, the backend writes their code and the test files to the local file system (inside the `data/workspaces/` directory) so Docker can execute it. `nodemon` detected these new files being written and immediately **restarted the entire backend server** mid-request. Because the server rebooted, the frontend never received a response, causing the request to hang indefinitely.

**How we solved it:**
We created/updated the `nodemon.json` configuration file in the backend to explicitly ignore the directories where student data is written:
```json
{
  "ignore": [
    "data/**",
    "workspaces/**",
    "templates/**",
    "docker/**"
  ]
}
```
This prevents the server from rebooting when files are written during a student's submission.

---

## 3. Frontend Infinite Spinning & Navigation Bug
**What:** 
After an exercise was successfully submitted and passed, the "Mark as Read & Next" button (or the page itself) would show a loading spinner continuously, and the user was not automatically moved to the next topic. Additionally, clicking the manual "Mark as Read" button on a pure exercise page would silently fail.

**Why:** 
1. **State Missing:** The backend correctly marked the subtopic as completed in the database when an exercise was passed, but the frontend Redux slice (`lessonSlice.ts`) didn't read the `is_passed` flag from the response, so it never updated the UI to reflect completion.
2. **Hanging State:** `Lesson.tsx` set an internal `isNavigating` state to true when an exercise was submitted, expecting the page to auto-navigate. However, the auto-navigation `useEffect` required `lessonCompleted` to be true. Since `lessonCompleted` remained false (due to bug #1), the navigation timeout never triggered, leaving the spinner active forever.
3. **Broken Button:** Pure exercise pages don't have a `lessonId` (because there is no markdown content). The manual "Mark as Read" button was trying to submit a `null` ID, triggering a silent error that prevented the loading state from resetting.

**How we solved it:**
1. **Redux Fix:** Updated `submitExercise` in `lessonSlice.ts` to extract `is_passed` from the API response. If true, it now sets `state.lessonCompleted = true`.
2. **Navigation Fix:** Updated `handleSubmitExercise` in `Lesson.tsx` to ONLY set `isNavigating(true)` if the user actually passed the exercise (`result.isPassed === true`). This ensures failing an exercise doesn't trap the user in a loading loop.
3. **UI Cleanup:** Added a conditional check in `Lesson.tsx` to completely hide the manual "Mark as Read & Next" button on pure exercise pages (`!data?.lesson?.id`), relying entirely on the automatic completion banner that appears once they pass the code execution.
