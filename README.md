# AIVOA.AI — AI-Powered Customer Complaint Management System

Round 1 assignment: an AI-powered Customer Complaint Management System for pharmaceutical
API & FDF manufacturing. A user drops in a complaint email/PDF, an AI pipeline extracts the
structured fields into a QMS-style "Log Customer Complaint" form, and a set of bonus AI
agents run risk classification, completeness checking, root-cause hypothesis generation, CAPA
recommendations, duplicate detection, and summarization — all through a chat copilot as well
as an auto-filled form.

## Tech stack (as specified)

| Layer            | Choice                                                            |
|-------------------|--------------------------------------------------------------------|
| Frontend          | React + Redux Toolkit (Vite)                                      |
| Backend           | Python, FastAPI                                                   |
| AI agent framework| LangGraph                                                          |
| LLMs              | Groq — `gemma2-9b-it` (extraction), `llama-3.3-70b-versatile` (reasoning) |
| Database          | PostgreSQL (SQLAlchemy ORM; MySQL is a one-line swap, see below)   |
| Font              | Google Inter / Inter Tight                                        |

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────────────────┐
│   React + Redux (Vite)   │  REST  │              FastAPI backend              │
│                           │◄──────►│                                            │
│  ComplaintForm.jsx        │        │  /api/ai/extract/file  /api/ai/extract/text│
│  AIIntakeAssistant.jsx    │        │  /api/ai/chat                             │
│  complaintSlice / aiSlice │        │  /api/complaints  (CRUD)                  │
└──────────────────────────┘        └───────────────┬────────────────────────────┘
                                                      │
                                                      ▼
                                     ┌────────────────────────────────────┐
                                     │        LangGraph state graph        │
                                     │                                      │
                                     │   extract (gemma2-9b-it)             │
                                     │        │                             │
                                     │   completeness_check                 │
                                     │        │                             │
                                     │  ┌─────┼─────┬───────────┐          │
                                     │  ▼     ▼     ▼           ▼          │
                                     │ risk  root  capa    duplicate       │
                                     │  (all on llama-3.3-70b-versatile)   │
                                     │  └─────┴─────┴───────────┘          │
                                     │        │                             │
                                     │     summary → END                    │
                                     └──────────────┬───────────────────────┘
                                                     ▼
                                            PostgreSQL (complaints,
                                            chat_messages)
```

**Why this split of models:** `gemma2-9b-it` is fast and cheap and is used purely for
structured-field extraction (JSON mode) from the raw document text. Everything downstream that
requires actual reasoning — risk classification, root cause hypotheses, CAPA drafting,
duplicate comparison, summarization — runs on `llama-3.3-70b-versatile` for better judgment
quality, as suggested in the brief.

**Why LangGraph:** the pipeline is naturally a small DAG — one extraction step feeding a
completeness gate, which fans out into four independent enrichment nodes (risk / root cause /
CAPA / duplicates) that all read the same extracted fields, then fans back in to a summary
node. LangGraph's `StateGraph` models this fan-out/fan-in directly instead of hand-rolling
orchestration and retry logic.

## Repository layout

```
backend/
  app/
    main.py            FastAPI app, CORS, router registration
    config.py           Settings (.env driven)
    database.py          SQLAlchemy engine/session
    models.py            Complaint + ChatMessage ORM models
    schemas.py            Pydantic request/response models
    routers/
      complaints.py       CRUD for saved complaints
      ai.py                /extract/file, /extract/text, /chat
    ai/
      groq_client.py       Groq SDK wrapper (JSON-mode + plain text)
      prompts.py            System prompts for every LangGraph node
      nodes.py               Node functions (extract, completeness, risk, root_cause, capa, duplicate, summary)
      workflow.py             LangGraph StateGraph definition
      doc_parser.py            PDF / DOCX / EML / TXT -> plain text
  requirements.txt
  .env.example

frontend/
  src/
    components/
      Header.jsx
      ComplaintForm.jsx        The 4-section "Log Customer Complaint" form
      AIIntakeAssistant.jsx     Upload/paste, progress bar, copilot chat, AI analysis cards
      RiskBadge.jsx
    store/
      store.js
      slices/complaintSlice.js  Form state + save/fetch thunks
      slices/aiSlice.js          Extraction progress + chat thunks
    api/client.js                 Axios instance
    App.jsx / main.jsx / App.css / index.css

sample_data/                  Realistic pharma complaint emails for demo purposes
docker-compose.yml            One-command local Postgres
```

## Running it locally

### 1. Database

```bash
docker compose up -d          # starts Postgres on localhost:5432
```

(Swapping to MySQL: change `DATABASE_URL` in `backend/.env` to
`mysql+pymysql://user:pass@localhost:3306/aivoa_complaints`, add `pymysql` to
`requirements.txt` — no other code changes needed since everything goes through SQLAlchemy.)

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and paste your Groq API key from https://console.groq.com/keys
uvicorn app.main:app --reload --port 8000
```

Tables are auto-created on startup via `Base.metadata.create_all`. API docs at
`http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The AI Intake panel talks to the backend at
`http://localhost:8000` by default (override with `VITE_API_BASE_URL` in a `frontend/.env`).

### 4. Try it

- Drag one of the files in `sample_data/` (or paste its contents) into the **AI Complaint
  Intake Assistant** panel.
- Watch the extraction progress bar, then see the **Log Customer Complaint** form auto-fill —
  AI-populated fields are highlighted in teal.
- Scroll the AI panel to see the bonus analysis: risk classification, completeness check,
  root cause hypotheses, CAPA recommendations, and a plain-language summary.
- Ask the **AI Assistant** chat questions like *"why is this high risk?"* or *"what's missing
  from this complaint?"* — it answers from the current form/complaint context.
- Click **Save Complaint** to persist the record (and unlock duplicate detection against
  future complaints for the same batch/product).

## Bonus AI features implemented

- **Complaint Completeness Checker** — flags missing/vague fields and suggests clarifying
  questions (`completeness_check` node).
- **Root Cause Recommendation** — 2-4 hypotheses tagged by Ishikawa category
  (Material/Method/Machine/Man/Environment) and likelihood (`root_cause` node).
- **Duplicate Complaint Detection** — compares a new complaint's product/batch/description
  against the last 50 saved complaints (`duplicate_detection` node).
- **CAPA Recommendation** — immediate / corrective / preventive action drafts
  (`capa_recommendation` node).
- **Complaint Summary** — management-review-ready 3-4 sentence summary (`summary` node).
- **AI Risk Classification** — risk level, patient safety impact, and regulatory
  reportability assessment (`risk_classification` node).
- **AI Copilot chat** — free-form Q&A grounded in the saved record or current form snapshot.

## Notes on scope (per assignment brief)

- Production-grade OCR is intentionally not implemented — `doc_parser.py` uses `pypdf` /
  `python-docx` / stdlib `email` for straightforward text extraction, which is sufficient for
  the demo documents in `sample_data/`.
- The reference UI screenshot was used as a functional guide (four-section form + right-hand
  AI copilot with drag-drop, progress bar, and chat); layout was restyled with a QA/clean-room
  visual language appropriate to a pharmaceutical QMS tool rather than copied pixel-for-pixel,
  per "the UI doesn't need to match the screenshot exactly."

## Suggested demo video walkthrough (for the 5–10 min submission)

1. **Problem framing (30s):** what a Customer Complaint module does inside a pharma QMS.
2. **End-to-end demo (2 min):** drop `sample_complaint_email_1.txt` in, show the progress bar,
   the auto-filled form, and the AI analysis cards; save the complaint.
3. **Code walkthrough (4-6 min):**
   - Frontend: `AIIntakeAssistant.jsx` → `aiSlice.js` thunk → `api/client.js`.
   - Backend: `routers/ai.py` → `doc_parser.py` → `workflow.run_intake_pipeline`.
   - LangGraph: `workflow.py` graph shape, then one node in `nodes.py` + its prompt in
     `prompts.py`, showing the Groq JSON-mode call in `groq_client.py`.
   - Show the response flowing back into `complaintSlice.applyExtractedFields` and rendering
     in the form and analysis cards.
4. **Second demo (1 min):** paste `sample_complaint_email_2.txt` as text instead of upload, to
   show the alternate intake path and a different risk classification (API contamination vs.
   FDF discoloration).
5. **Wrap-up (30s):** mention the completeness checker and copilot chat as bonus depth.
