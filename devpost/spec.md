---
doc: spec
status: approved
---

# TeachSkills — Technical Spec

## How This Works, In Plain Language

TeachSkills is two UIs talking to one Python API, with MySQL holding the data.

- **Teacher app (React):** login, dashboard, groups, question papers, exams, results. Calls the API with axios; after login it sends a **JWT** (a signed token proving “this is the teacher”) on each request.
- **Exam portal (React route or small sibling UI):** students use admit card ID + password. No teacher JWT. The API decides if they may start (exam active, not too late, not already finished).
- **FastAPI backend:** all business rules, PDF upload/extract, OpenAI calls, scoring, report generation, admit cards.
- **MySQL:** teachers, groups, students, papers, questions, exams, admit cards, attempts, answers, reports.
- **OpenAI (`gpt-4o-mini`):** (1) turn extracted PDF text into chapter lists, (2) generate MCQs from selected chapter text, (3) write student report cards / class insight when the teacher clicks Autocheck or Bulk autocheck.

We keep this shape (one API + one DB + local only) instead of microservices or hosting so the PoC stays buildable and reviewable—aligned with using AI carefully rather than overbuilding.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. Teacher opens the React teacher app → posts email/password to FastAPI → receives JWT → stored in the browser for later requests.
2. Dashboard GETs aggregate counts from MySQL via FastAPI.
3. Student Groups: create group / add students → rows in MySQL.
4. Question Papers: upload PDF → FastAPI saves file and runs **PyPDF** (or similar) text extract → on failure returns an error to the UI → on success sends text to OpenAI → returns chapter list → teacher selects chapters + weights (+ question count; defaults first 3 / equal / 5) → FastAPI takes selected chapter text → OpenAI generates MCQs with correct options → saved in MySQL.
5. Exams: create exam (group, paper, duration, optional late duration) → inactive share token/link in MySQL → generate admit cards (ID + password per student) → teacher activates → FastAPI stores `activated_at`.
6. Student opens exam URL → login checked on FastAPI (active? within late window? not already submitted?) → loads questions → browser shows countdown from activation + duration → answers saved via API; early submit or browser timeout submit → attempt marked complete. Demo button fills answers via API then opens confirm-end.
7. When duration has elapsed (client-driven end for PoC; server still rejects new logins and can treat exam as ended using `activated_at` + duration): non-logins marked absent.
8. Teacher opens Results → Autocheck one student or Bulk autocheck → FastAPI scores MCQs in code against stored correct options, calls OpenAI for report text, stores results → teacher publishes when satisfied (teacher-side view only).

## Stack

| Piece | Choice | Docs / notes |
|---|---|---|
| Frontend | React (JSX) + Tailwind CSS + axios | [React](https://react.dev/), [Tailwind](https://tailwindcss.com/docs), [axios](https://axios-http.com/docs/intro) — learner preference |
| Backend | Python FastAPI | [FastAPI](https://fastapi.tiangolo.com/) — learner preference |
| DB | MySQL | [MySQL docs](https://dev.mysql.com/doc/) — credentials via env |
| Auth | JWT for teacher API access | Issued after login; Bearer header on teacher routes |
| PDF | pypdf (PyPDF family) for text extraction | [pypdf](https://pypdf.readthedocs.io/) — verify exact package name/version early in build |
| AI | OpenAI API, model `gpt-4o-mini` | [OpenAI API](https://platform.openai.com/docs) — `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` in env |

**Tradeoff accepted:** familiar full-stack (React + FastAPI + MySQL) over a single-framework all-in-one app — more moving parts locally, but matches the learner’s experience and keeps front/back clear to review.

Versions: pin current stable releases during setup; verify early in `5-build` (not assumed here).

## Where It Runs and How Someone Tries It

- **Runtime:** everything on localhost — React dev server, FastAPI (e.g. uvicorn), MySQL local instance. **No hosting** for this PoC.
- **Env required:** MySQL connection vars; `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`; teacher seed credentials; JWT secret.
- **Demo recording:** start MySQL → start FastAPI → start React → open teacher app URL (e.g. `http://localhost:5173` or as configured) → follow `prd.md` / `scope.md` demo path (login → group/paper/exam → exam portal → autocheck → publish).
- **Submission:** short demo video + public GitHub repo (`6-ship`). Deployment is out of scope.

## Look and Feel

From `prd.md > Look and Feel` (Study Hack):

- Text `#3c3c3c`; primary `#6fcd17`; highlight `#0d6efd`
- Light education UI, white backgrounds, sans-serif, simple cards
- Implement via Tailwind theme/colors (CSS variables or `tailwind.config` theme extend). No redesign interview.

## Components

### React teacher app
Login, dashboard, sidebar (Student Groups, Question Papers, Exams), modals/wizards, exam detail (admit cards, activate, Results). Uses axios + JWT.
PRD refs: `prd.md > Teacher login and dashboard`, `Student Groups`, `Question Papers`, `Exams, admit cards, and activation`, `Results, AI reports, and publish`.

### React exam portal
Admit login, instructions, MCQ UI (prev/next/clear), client countdown, submit/end, thank-you, demo fill control. Talks to FastAPI with admit session/token (separate from teacher JWT—implementation detail: short-lived exam attempt token or admit-authenticated requests).
PRD ref: `prd.md > Exam portal (student)`.

### FastAPI API
REST routes for auth, CRUD, PDF pipeline, exam lifecycle, scoring, OpenAI orchestration. Server-enforced student start checks.
PRD refs: all Features and Behavior headings.

### PDF extract + chapter/question AI pipeline
Upload → pypdf extract → error if fail → OpenAI chapters → after selection, OpenAI MCQs → persist questions + correct options.
PRD ref: `prd.md > Question Papers`.

### Scoring and report generation
Code compares selected option to correct option. OpenAI generates report/class insight only when teacher runs Autocheck or Bulk autocheck.
PRD ref: `prd.md > Results, AI reports, and publish`.

### MySQL persistence
Source of truth for all entities; survives refresh/restart.
PRD ref: `prd.md > States and Boundaries` (persistence).

## Data Model

Logical tables (names may be adjusted in build; relationships matter):

- **teachers** — seeded demo account (email, password hash)
- **student_groups** — name, teacher_id
- **students** — group_id, first_name, last_name, email
- **question_papers** — name, total_marks, status, pdf path/meta, chapter metadata JSON
- **questions** — paper_id, chapter key, stem, options JSON, correct_option, marks
- **exams** — name, group_id, paper_id, duration, late_duration (nullable), share_token, status (inactive/active/ended), activated_at, published_at
- **admit_cards** — exam_id, student_id, admit_id, password (store hashed if feasible; plaintext display for PoC demo table is an accepted risk—prefer hash at rest + show once/generated display field)
- **attempts** — exam_id, student_id, status (in_progress/submitted/absent), started_at, submitted_at
- **answers** — attempt_id, question_id, selected_option
- **reports** — attempt_id or exam_id+student_id, AI report text/JSON; exam-level class performance summary

**Where it lives / updates / return:** all durable state in MySQL via FastAPI. Browser holds JWT and ephemeral UI state (wizard steps, countdown). Leaving and coming back: teacher still logged in if JWT valid; data reloaded from API.

## File Structure

```
learn-ai-basics/          # or app root as created in 5-build
├── frontend/             # React + Tailwind + axios
│   ├── src/
│   │   ├── api/          # axios client, auth header
│   │   ├── pages/        # Login, Dashboard, Groups, Papers, Exams, ExamPortal
│   │   ├── components/   # Sidebar, modals, MCQ UI, Results
│   │   └── styles/       # Tailwind entry
│   ├── package.json
│   └── tailwind.config.*
├── backend/              # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── api/          # route modules
│   │   ├── models/       # DB models
│   │   ├── schemas/      # request/response
│   │   ├── services/     # pdf_extract, openai_client, scoring, reports
│   │   └── core/         # config, security (JWT), db
│   ├── requirements.txt
│   └── .env.example      # AI_*, DB_*, JWT_SECRET, seed teacher — no secrets committed
├── sample-data/          # optional book PDFs for demo
├── devpost/              # planning docs (learner-profile gitignored)
└── README.md             # how to run locally
```

## External Services and Dependencies

### OpenAI
- **Config:** `AI_PROVIDER=openai`, `AI_MODEL=gpt-4o-mini`, `AI_API_KEY` from env.
- **Uses:** (1) chapter extraction/structuring from PDF text, (2) MCQ generation from selected chapter text + weights/count, (3) report card / class performance narrative on autocheck.
- **Docs:** https://platform.openai.com/docs/api-reference
- **Cost/limits:** usage-based; keep prompts small (chapter slices, not entire huge PDFs when possible). Verify model availability early in build.

### MySQL
- Local server; connection string/credentials in env.
- Docs: https://dev.mysql.com/doc/

### pypdf (PDF text)
- Local library; no cloud upload of PDF beyond our API disk.
- Docs: https://pypdf.readthedocs.io/

## Important Failure Modes

- **PDF not extractable / empty text** → FastAPI returns clear error; wizard does not proceed to chapters.
- **OpenAI error / timeout / bad JSON** → error message in UI; no partial silent paper; teacher can retry.
- **Student login denied** (inactive, late, already submitted, exam ended) → clear message on exam portal; no question load.
- **Missing/invalid AI or DB env** → API fails fast at startup or first AI/DB call with actionable error (documented in README).

## What Was Simplified and Why

- **Local-only** instead of hosting — enough for demo video + GitHub; no deploy complexity.
- **Browser-owned exam countdown / auto-submit** instead of fully server-driven timer — PoC speed; **login eligibility still server-side**. Open to upgrading clock to server later.
- **Teacher-triggered Autocheck / Bulk autocheck** instead of background jobs on every submit — simpler ops; kernel (AI reports) still real when teacher checks.
- **No student results portal** — teacher-side publish/view only (`prd.md` deferred).
- **JWT + seeded teacher** instead of full registration/OAuth — proves the loop without signup product work.
- **MCQ code scoring** instead of AI grading — reliable and cheap; AI reserved for generation + reports.

## Decisions and Open Issues

**Learner decisions**
- Stack: React JSX, Tailwind, axios, FastAPI, MySQL, OpenAI `gpt-4o-mini` via env — agreed.
- Run locally only; no hosting for now — agreed.
- PDF: extract with pypdf-class tools → error on failure → OpenAI for chapters → then questions from selected chapter content — agreed.
- Exam: FastAPI owns student login eligibility; browser owns countdown for PoC; revisit server clock later — agreed.
- Reports: per-student Autocheck or Bulk autocheck when teacher reviews — agreed.
- Teacher auth: JWT — agreed.

**Derived implementation details (not re-litigated unless learner objects)**
- Monorepo `frontend/` + `backend/` layout; axios base URL to local FastAPI; Tailwind theme tokens for Study Hack colors.
- Exam share link encodes exam token; admit passwords generated at admit-card creation.

**One useful uncertainty (recorded)**
- **Client-owned exam clock vs server clock:** learner chose browser clock for PoC while keeping server login checks, explicitly “open to discussion.” During build/demo, verify that after duration the API rejects new logins and accepts final submit; if timer integrity becomes an issue, move end-time enforcement fully to FastAPI. Evidence: login after end fails; submit after end either accepted as late finalize once or rejected consistently—pick one rule in build and document in README.

**Open from PRD (non-blocking)**
- Exact wizard field list beyond name/total marks; exact AI report heading copy — settle during build within PRD intents.
