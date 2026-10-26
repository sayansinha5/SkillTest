---
doc: prd
status: approved
---

# TeachSkills — Product Requirements

Teacher-focused exam platform for small tutors and coaching centres: build student groups, generate an MCQ paper from a book PDF, run a timed exam, then review AI report cards and class performance before publishing.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

## The Core Journey

1. Teacher opens TeachSkills and logs into the teacher portal (demo uses provided test credentials).
2. Lands on the **Dashboard** with counts of unique students, student groups, question papers, and exams; sidebar shows Student Groups, Question Papers, Exams.
3. **Student Groups:** opens the menu (empty state + “New Group”) → creates a group by name → opens the group (empty state + “Add Student”) → adds students with first name, last name, and email.
4. **Question Papers:** creates a new paper (name, total marks, and related details) → multi-step flow: upload book PDF → review/select chapters → assign chapter weight percentages → generate MCQ paper via AI (question count and defaults per scope: first 3 chapters, equal weights, 5 questions unless changed).
5. **Exams:** creates an exam (name, student group, question paper, duration in minutes or seconds; optional late-login duration) → system generates an exam link that stays **inactive** until activated → opens the exam → generates admit cards (table of student IDs and passwords; copyable exam link) → teacher toggles **Activate**.
6. Activation starts the shared exam clock. Students open the link, log in with admit card ID and password, follow instructions, answer MCQs (Previous / Next / Clear), and may end early. A countdown shows remaining time. A demo control can fill answers and open confirm-end for the hackathon recording.
7. While the duration is running, the link stays reachable; students who already completed cannot log in again. After optional late duration from start, new logins are blocked. When duration hits zero, the exam ends for everyone: answers are saved, remaining in-progress attempts auto-submit, and the link becomes inaccessible. Students who never logged in are marked **absent**.
8. Teacher opens the exam (from Dashboard or Exams) → **Results** tab: overall result/report and class performance, plus each student name → opens a student for their result and AI report card → when satisfied, marks complete and **publishes**. Teacher-side viewing is enough; no student results portal in this PoC.

## Screens and Layout

- **Login** — teacher portal entry.
- **Dashboard (default after login)** — summary counts; sidebar navigation.
- **Student Groups list** — empty state or group list; “New Group” opens a modal (group name).
- **Group detail** — empty state or student list; “Add Student” modal (first name, last name, email).
- **Question Papers list** — create new; multi-step create/edit modal or wizard (details → PDF → chapters → weights → generate).
- **Exams list** — create new exam with settings.
- **Exam detail** — admit cards table (ID, password), shared exam link (copy), activate toggle, and after the exam: **Results** tab (overall + per-student).
- **Student result / report** — opened from a student name on Results; AI report card for that student.
- **Exam portal (student)** — login (admit ID + password) → instructions → MCQ taking UI with timer, nav, clear, submit/end → thank-you on successful submission. Separate from the teacher app chrome.

## Look and Feel

Direction from the learner’s prior **Study Hack** app:

- Default text: `#3c3c3c`
- Primary / theme (primary buttons, primary emphasis text): `#6fcd17`
- Highlight links / secondary accent text: `#0d6efd`
- Overall: light, clean education product UI; white backgrounds; sans-serif typography; simple rectangular cards with light tinted surfaces; practical and approachable, not flashy consumer-app chrome.

## Features and Behavior

### Teacher login and dashboard
Source: `scope.md > The Core Loop`, interview.

- Teacher logs in; demo uses seeded test credentials.
- Dashboard shows: number of students (unique emails), number of student groups, number of question papers, number of exams.
- Sidebar: Student Groups, Question Papers, Exams.
- As a teacher, I want a clear home screen so I know what’s in the system at a glance.
  - [ ] After login, Dashboard is the default view with the four counts and the three sidebar menus.
  - [ ] Counts match the data currently in the app (unique emails for students).

### Student Groups
Source: interview (extends beyond seeded-only demo data in scope; kept as teacher-created groups for this PoC).

- Empty groups list shows a message and **New Group**.
- New Group modal: group name → save.
- Group detail empty state: message and **Add Student**.
- Add Student modal: first name, last name, email → save; students appear in the group.
- As a teacher, I want to define who takes the exam so admit cards map to real students.
  - [ ] Creating a group with a name shows it in the Student Groups list.
  - [ ] Adding a student with first name, last name, and email shows them inside that group.
  - [ ] Empty list and empty group show the described empty states and buttons.

### Question Papers
Source: `scope.md > The POC Boundary`, interview.

- Create paper: name and total marks (and paper details as needed), then continue in the same multi-step modal/wizard:
  1. Upload book PDF
  2. System extracts/organizes chapters; teacher reviews and selects chapters
  3. Assign weight % per selected chapter (equal weights by default; totals should support generation)
  4. Generate MCQ-only paper via AI using question count (default **5**), chapter selection (default **first 3** chapters), and weights
- Teacher can review the generated paper in the product flow before using it in an exam.
- As a teacher, I want an MCQ paper built from a book PDF with chapter weights so the paper matches what I taught.
  - [ ] Uploading a provided sample PDF and completing the steps produces an MCQ paper with saved correct options.
  - [ ] Defaults appear as first 3 chapters, equal weights, and 5 questions unless the teacher changes them.
  - [ ] Paper has total marks available for the exam flow.

### Exams, admit cards, and activation
Source: interview; `scope.md > What "Working" Looks Like`.

- Create exam: name; select student group; select question paper; duration (minutes or seconds); optional late duration after start.
- On save: exam link is generated but **inactive** until activated; link is shown in-app for sharing (copy); no email.
- Inside exam: generate admit cards → table of admit card ID and password per student; shared exam link with copy.
- Activate toggle: turns the link on and **starts the shared duration clock from activation**.
- As a teacher, I want admit cards and a controllable start so I can run the exam when ready.
  - [ ] Before activation, opening the exam link does not allow a normal exam session.
  - [ ] After activation, login with a valid admit ID and password reaches the exam instructions/taking UI.
  - [ ] Admit card IDs and passwords are visible in the exam’s student table; link can be copied.

### Exam portal (student)
Source: `scope.md > The POC Boundary`, interview.

- Login with admit card ID and password.
- View instructions; answer MCQs; Previous / Next; select or change answer; Clear answer; manual end/submit.
- Countdown of remaining time from the shared exam clock.
- Early end allowed; answers saved; that student cannot log in again while the link is still up.
- If late duration is set: login attempts after that period from start are rejected (cannot sit the exam).
- When shared duration hits zero: auto-submit/save for everyone still in; exam ends; link becomes inaccessible.
- Demo path: control that fills answers in the backend and opens confirm-end-exam for the recording.
- As a student, I want a simple timed MCQ exam so I can complete the paper under time pressure.
  - [ ] Completing or auto-submitting lands on a thank-you / successful submission screen.
  - [ ] After completion, the same credentials cannot start another attempt.
  - [ ] After duration ends, the exam link no longer allows taking the exam.
  - [ ] Demo fill + confirm end produces a completed attempt visible to the teacher.

### Results, AI reports, and publish
Source: `scope.md > The Unique Kernel`, interview.

- MCQs auto-evaluated by comparing the selected option to the stored correct option (no AI grading).
- Results tab on the finished exam: overall result/report and class performance (including question-wise how many got each question right/wrong), participation/completion, absentees listed as absent.
- Click a student name → individual result and AI report card (strengths/gaps by chapter or equivalent insight from answers — not per-question timing).
- Teacher reviews until satisfied → mark complete → publish (teacher can see published results in the teacher app).
- As a teacher, I want AI report cards and class question performance so I can see who is overlooked and on what.
  - [ ] After at least one completed attempt, Results shows overall/class performance and the student list with statuses (including absent for non-logins once the exam has ended).
  - [ ] Opening a completed student shows score and an AI-written report card.
  - [ ] Publish succeeds from the teacher UI without requiring a student results portal.

## States and Boundaries

- **Empty groups / empty group / empty papers or exams lists** — message plus the primary create button described above.
- **Exam inactive** — link exists but students cannot take the exam until Activate.
- **Exam active (in progress)** — link reachable; clock running; completed students blocked from re-login; late logins blocked if late duration elapsed.
- **Exam ended (duration elapsed)** — link inaccessible for taking; answers saved; non-participants absent.
- **Results available** — teacher can open Results and per-student reports; publish when satisfied.
- **Persistence** — groups, students, papers, exams, admit credentials, attempts, and results remain available after closing and returning to the teacher app (same environment/session model the build uses).
- **Permissions** — teacher portal for management and results; exam portal only via admit credentials for that exam; no email delivery in PoC.
- **Assumption** — sample book PDFs and teacher test login are available for the demo path.

## Product Decisions

- Three sidebar modules (Student Groups, Question Papers, Exams) plus Dashboard home — teacher’s information architecture.
- Groups and students created in-app (not only seeded) — teacher owns roster setup for the PoC.
- Multi-step question-paper modal: details → PDF → chapters → weights → generate.
- Exam is a separate entity from the paper; duration and optional late duration live on the exam; activation starts the clock.
- Link inactive until activated; stays reachable until duration ends; then inaccessible.
- Early student submit allowed; no second attempt after completion.
- Student-facing results login mentioned for product completeness but **out of PoC**; teacher-side results are enough.
- Visual system follows Study Hack colors and clean education styling (`#3c3c3c`, `#6fcd17`, `#0d6efd`).
- MCQ-only with code-based marking; AI for paper generation and report-card / class insight text.

## What We're Building

- Teacher login (seeded demo credentials) and Dashboard with sidebar and counts
- Student Groups: New Group, Add Student (name + email)
- Question Papers: PDF upload, chapter select, weights, question count (with defaults), AI-generated MCQ paper with correct options stored, total marks
- Exams: create with group + paper + duration + optional late duration; inactive link until activate; admit cards table; copyable link; activate starts clock
- Exam portal: login, instructions, MCQ UI, timer, clear/nav/submit, early end, auto-submit on timeout, thank-you; demo fill-and-end control
- Auto MCQ scoring; Results tab with class performance and per-student AI report cards; mark complete and publish (teacher view)
- Absent marking for students who never logged in by exam end

## Deferred From the POC

- **Student results portal** (admit ID/password to view own report after publish) — explicitly not required for PoC; teacher view is enough.
- **Teacher self-registration** — demo uses provided credentials (`scope.md > Later`).
- **Email notifications** for admit cards or links — in-app display and copy only.
- **Manual correction of auto MCQ marks / remarks** — review and publish; no mark-editing workflow in PoC.
- **Long answers / AI grading / section templates / teacher-authored questions** — cut in scope.
- **Per-question timing analytics** — cut in scope.

## Possible Later Enhancements

- Student self-serve results link after publish.
- Teacher account signup and richer roster import.
- Email or WhatsApp delivery of admit credentials.
- Live multi-student exam without a demo fill control.
- Teacher overrides on scoring and optional remarks.

## Non-Goals

- Building a full multi-tenant SaaS or billing.
- Mixed question formats or handwritten/long-answer grading.
- Email/SMS infrastructure in this MVP.
- Pixel-perfect recreation of every Study Hack marketing page — only its color/style language in the app UI.

## Open Questions

- Exact copy and fields on the first step of “new question paper” beyond name and total marks — can be settled in `4-spec` / build if the wizard stays within the behaviors above (does not block PRD approval).
- Precise AI report-card sections (headings/wording) — shape in `4-spec` from kernel (strengths, gaps, class question performance); not a product-block if those intents are met.
