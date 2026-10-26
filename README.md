# TeachSkills

Teacher-focused exam platform for small tutors and coaching centres (Devpost Learn PoC).

## Stack

- `frontend/` — React (JSX), Tailwind CSS, axios
- `backend/` — Python FastAPI, JWT auth, MySQL
- AI — OpenAI `gpt-4o-mini` (later slices; configure via env)

## Prerequisites

- Node.js 20+
- Python 3.11+
- MySQL 8 (local install **or** Docker)

### MySQL via Docker

```bash
docker run -d --name teachskills-mysql ^
  -e MYSQL_ROOT_PASSWORD=root ^
  -e MYSQL_DATABASE=teachskills ^
  -e MYSQL_USER=teachskills ^
  -e MYSQL_PASSWORD=teachskills ^
  -p 3306:3306 mysql:8
```

Wait until MySQL is ready (first start can take ~30s).

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# edit .env if needed
uvicorn app.main:app --reload --port 8000
```

Run uvicorn from the `backend/` directory so `.env` and the `app` package resolve.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo teacher login

- Email: `teacher@example.com`
- Password: `teachskills123`

## Planning docs

Product and technical plans live in `devpost/` (learner profile is gitignored).
