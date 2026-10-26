---
doc: scope
status: approved
---

# TeachSkills

An exam platform for small tutors and coaching centres: create an MCQ paper from a book PDF, run a timed exam, then publish AI-written student report cards and a class performance view.

## The Unique Kernel
After the exam, the teacher gets more than a score sheet: an AI report card per student (where they're strong or weak) plus a class view of which questions most students got right or wrong — so one tutor can see who is being overlooked and on what.

## Who It's For
A small private tutor or coaching-centre teacher who runs exams for a group of students. Today they set papers by hand, mark by hand, and mostly see totals — so many students' gaps stay invisible.

## The Core Loop
Teacher logs into the teacher portal → creates an MCQ question paper from a provided book PDF (duration, full marks, question count, chapters, and chapter weights as inputs; defaults: first 3 chapters, equal weights, 5 questions) → AI generates the paper → attaches a student group → generates admit cards (login, password, exam link) → students take the exam in the portal → answers are auto-checked against the stored correct option → teacher sees completion, AI report cards, and class performance → publishes results (absentees marked absent; exam link becomes invalid).

## Inspiration & Identity
Not established in detail. Direction: practical teaching tool for quality education — clear and easy to use for teachers and students, not flashy consumer-app energy.

## Why This Matters to the Learner
Focused on quality education and unlocking easier learning. One teacher often handles a mass of students and most get ignored; small tutors and centres should benefit on both sides — better teaching insight and better student feedback. Also practising building with AI carefully, not collapsing a large product into a rushed day.

## What "Working" Looks Like
Demo path on a screen:
1. Log into the teacher portal with provided test credentials (students already seeded).
2. Create a question paper from a provided book PDF (e.g. 7th-grade physics or chemistry), using inputs for question count, chapters, and weights (defaults: first 3 chapters, equal weights, 5 questions), plus duration and full marks.
3. Add the student group, generate admit cards; each student shows login, password, and exam portal link with a copy button.
4. Open the exam portal with any student credentials; use a demo button that fills answers in the backend and opens confirm-to-end-exam.
5. Back in the teacher portal: that student shows as completed; teacher can see the result (AI report card + class performance view) and publish for that demonstration (other students marked absent; exam link invalidated).

## The POC Boundary
- Teacher portal login (seeded test account; teacher-facing app is the default)
- Seeded student group (no full registration/onboarding flow required for the demo)
- Create MCQ-only question paper from a provided book PDF; inputs for question count, chapters, and percentage weights (defaults: first 3 chapters, equal weights, 5 questions), plus exam duration and full marks; AI generates the paper from those settings
- Attach group, generate admit cards (credentials + exam link, copyable)
- Exam portal login via admit card credentials; demo fill-and-submit path for the recording
- Code-based MCQ checking against saved correct options (no AI grading)
- Teacher sees student completion; AI report card + class performance (which questions most got right/wrong)
- Publish results: absentees marked absent; exam link becomes invalid

## Later
- Teacher-written questions and answers
- Full student self-serve report-card login beyond the teacher publishing/viewing flow in the demo
- Per-question timing and average time analytics
- Optional teacher remarks on papers
- Real multi-student live exam without the demo fill button
- Teacher account self-registration beyond seeded login

## Explicitly Cut
- **Teacher-authored questions** — removed to keep paper creation PDF/AI-driven for the PoC
- **Paper section templates** (Section A/B/C, mixed formats) — removed; MCQ-only paper with duration and full marks
- **Long / typed answers and AI grading** — removed; MCQ + code check only, so marking stays reliable and small
- **Optional remarks on teacher review** — removed as non-essential to the kernel
- **Time taken per question on the report** — removed to keep the report focused on chapter/understanding insight
