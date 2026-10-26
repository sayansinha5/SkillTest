---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Teacher can log in and land on the dashboard**
  Becomes usable: Local `frontend/` and `backend/` run; seeded teacher logs in with JWT; Dashboard shows sidebar (Student Groups, Question Papers, Exams) and counts (initially zeros or seed baseline) in Study Hack colors.
  Why now: Bootstrapping lives inside the first usable behavior—React, FastAPI, MySQL, env, seed teacher—so every later slice has a running shell to land in.
  PRD ref: `prd.md > Teacher login and dashboard`, `prd.md > The Core Journey` (steps 1–2)
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Components` (React teacher app, FastAPI API, MySQL), `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`
  Build: Create separate `frontend/` (React JSX, Tailwind, axios) and `backend/` (FastAPI); MySQL connection and `.env.example`; seed teacher; JWT login; protected Dashboard with sidebar and count endpoints; README run steps.
  Verify (mechanical): Start MySQL, FastAPI, and React; POST login with seed credentials returns a JWT; open the teacher app, log in, confirm Dashboard and sidebar render without errors; counts endpoint returns JSON.
  Learner check: Start the stack locally, log in with the test teacher credentials, and say whether the Dashboard/sidebar look and feel match Study Hack enough to continue.
  Commit: `Add teacher login and dashboard shell`

- [x] **2. Teacher can create a student group and add students**
  Becomes usable: From the sidebar, create a group by name, open it, add students (first name, last name, email); empty states and modals work; Dashboard student/group counts update.
  Why now: Roster is required before admit cards and exams; proves CRUD persistence early without AI risk.
  PRD ref: `prd.md > Student Groups`
  Spec ref: `spec.md > Data Model` (student_groups, students), `spec.md > Components` (React teacher app, FastAPI API, MySQL)
  Build: Group and student APIs + UI (list, New Group modal, group detail, Add Student modal) wired to MySQL.
  Verify (mechanical): Create a group and two students via API or UI; restart FastAPI; reload UI and confirm they still appear; dashboard counts reflect unique emails and groups.
  Learner check: Create a group, add a student, refresh the page, and confirm the student is still there.
  Commit: `Add student groups and students`

- [x] **3. Teacher can generate an MCQ paper from a book PDF**
  Becomes usable: Multi-step paper wizard: name/total marks → upload PDF → extract text (error if fail) → OpenAI chapters → select chapters/weights/question count (defaults: first 3, equal weights, 5) → generate MCQs with correct options saved; paper reviewable in the app.
  Why now: Highest external risk (pypdf + OpenAI) and feeds the exam; fail here early before building the rest of the journey.
  PRD ref: `prd.md > Question Papers`
  Spec ref: `spec.md > Components` (PDF extract + chapter/question AI pipeline), `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Upload + pypdf extract; OpenAI chapter then MCQ generation; persist paper/questions; wizard UI with defaults; surface extract/AI errors clearly.
  Verify (mechanical): Upload a sample PDF; confirm chapter list returns; generate with defaults; DB (or API) shows MCQs with correct options; intentionally bad/empty PDF returns an error without creating a fake paper.
  Learner check: Run the paper wizard with a sample book PDF and confirm the generated MCQs look usable for an exam.
  Commit: `Add PDF-to-MCQ question paper flow`

- [x] **4. Teacher can create an exam, generate admit cards, and activate it**
  Becomes usable: Create exam (group, paper, duration, optional late duration); inactive share link; admit card table (ID, password) with copyable link; Activate sets `activated_at`; server rejects student start while inactive.
  Why now: Connects roster + paper into a runnable exam session; server login gates land here before the student UI.
  PRD ref: `prd.md > Exams, admit cards, and activation`
  Spec ref: `spec.md > Data Model` (exams, admit_cards), `spec.md > The Core Journey Through the System` (steps 5–6), `spec.md > Decisions and Open Issues` (server login eligibility)
  Build: Exam CRUD; share token; admit card generation; activate endpoint; teacher exam detail UI (table, copy link, toggle).
  Verify (mechanical): Create exam with group+paper; generate admit cards; confirm link inactive blocks exam-start API; activate; confirm start allowed for a valid admit pair within rules.
  Learner check: Create an exam, generate admit cards, copy the link, try it before and after Activate, and note whether that matches your intent.
  Commit: `Add exams, admit cards, and activation`

- [x] **5. Student can take the exam in the portal (with demo fill)**
  Becomes usable: Exam portal login with admit ID/password; instructions; MCQ UI (prev/next/clear); browser countdown; early submit and timeout submit; thank-you; completed students cannot re-login; late login blocked when configured; demo control fills answers and opens confirm-end.
  Why now: Completes the delivery path so Results have real attempts; exercises the agreed client clock + server gate split.
  PRD ref: `prd.md > Exam portal (student)`, `prd.md > The Core Journey` (steps 6–7)
  Spec ref: `spec.md > Components` (React exam portal), `spec.md > What Was Simplified and Why` (browser clock), `spec.md > Decisions and Open Issues` (client clock uncertainty)
  Build: Exam portal routes/pages; attempt + answer APIs; client timer from activation+duration; demo fill endpoint/UI; enforce server denials (inactive, late, already submitted, ended).
  Verify (mechanical): Activate exam; login as admit user; submit answers; confirm attempt submitted; second login denied; after duration (or simulated end) new logins denied; demo fill + confirm produces a completed attempt.
  Learner check: Open the exam link with an admit card, use the demo fill path (or answer briefly), end the exam, and confirm you land on thank-you and cannot log in again.
  Commit: `Add exam portal taking and demo submit`

- [ ] **6. Teacher can autocheck, see AI reports, and publish results**
  Becomes usable: Results tab with participation (including absents after end), class question performance, per-student view; Autocheck and Bulk autocheck (code MCQ score + OpenAI report); mark complete and publish on the teacher side.
  Why now: Delivers `scope.md > The Unique Kernel` once real attempts exist—diagnostic reports and class performance, not just scores.
  PRD ref: `prd.md > Results, AI reports, and publish`, `scope.md > The Unique Kernel`
  Spec ref: `spec.md > Components` (Scoring and report generation), `spec.md > The Core Journey Through the System` (step 8)
  Build: Scoring service; OpenAI report + class summary on autocheck/bulk; Results UI; absent marking when exam ended; publish flag/state for teacher viewing.
  Verify (mechanical): With one submitted and one never-logged-in student, end exam; confirm absent; Autocheck produces score + stored report text; bulk works; publish succeeds and results remain visible to the teacher.
  Learner check: Open Results, run Autocheck (or bulk), open one student report, publish, and say whether the report/class view proves the “who is overlooked and on what” idea.
  Commit: `Add autocheck reports and publish results`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (PDF→MCQ paper works); feedback can still shape exam portal and results UX
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: 
Route and stops: 
Edit outcome: 
Reflection: 
Activity mode: 

## Revisions

- Wizard review step now lists all options with the correct one highlighted — learner found only "Correct: X" was shown at the early checkpoint.
- Question marks = paper total ÷ question count, remainder spread over the first questions — generated MCQs were 1 mark each, so scores didn't match total marks (learner decision).
- Activate is one-way (switch locks on once the clock starts) and admit card passwords are stored in plain text so the teacher can re-read them — PoC simplifications consistent with `spec.md > Data Model`.
- Exam portal login page (`/exam/:token`) built in slice 4 rather than 5 — needed to verify the server login gates; slice 5 adds the question-taking UI on top.
- Answer-option shuffling deferred (learner decision, early checkpoint) — AI-generated MCQs tend to place the correct answer at A; acceptable for the PoC, revisit later.
- Browser owns the exam clock; the server accepts answer saves and submits until 30 seconds after the end time so a time-up auto-submit isn't lost to small clock drift (resolves the spec's open timing question).

- Demo teacher email set to `teacher@example.com` — email-validator rejects reserved domains like `.local` / `.test`.
