# CareerBuilder Project Report

## 1. Project Overview
**CareerBuilder** is an AI-powered job matching platform specifically designed for tech professionals in India. It serves a dual-sided marketplace:
*   **For Job Seekers**: Users can upload their resumes (PDFs), get their skills automatically extracted, and receive highly relevant job recommendations based on AI-driven text analysis. They can also track their application status using a built-in Kanban board, analyze their skill gaps, and get career advice from an integrated AI Chatbot.
*   **For Recruiters**: Recruiters can input job descriptions to find and rank the most suitable candidates from the platform's database, shortlist top applicants, and notify them via email.

The app solves the problem of traditional keyword-based applicant tracking systems (ATS) by using semantic matching (Sentence Transformers / BERT) to understand the context of a candidate's experience versus the job description, leading to more accurate matches.

---

## 2. Tech Stack

### Frontend
*   **Framework**: Next.js 16.2.3 (App Router)
*   **Library**: React 19.2.4
*   **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
*   **State Management / UI Interactions**: `@dnd-kit/core` (Drag and Drop Kanban), `framer-motion` (Animations)
*   **Data Visualization**: `recharts` (Skill Gap Analysis)
*   **Icons**: `lucide-react`
*   **HTTP Client**: `axios`

### Backend
*   **Framework**: Flask
*   **Database**: SQLite3 (built-in)
*   **Authentication**: Custom JWT (PyJWT), Google OAuth (`google-auth`)
*   **AI / NLP**: `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn` (Cosine Similarity)
*   **PDF Parsing**: `PyPDF2`
*   **LLM Chatbot**: Groq API (Llama 3 / Gemma / Mixtral models)
*   **Security & Utils**: `flask-limiter`, `flask-cors`, `flask-compress`, `werkzeug.security`

---

## 3. Folder Structure
```text
/
├── backend/                  # Flask API Backend
│   ├── app.py                # Main application entry point and API routes
│   ├── auth.py               # Authentication, JWT handling, and DB schemas/migrations
│   ├── model.py              # AI matching logic (SentenceTransformers / NLP)
│   ├── scraper.py            # Live job scraping utilities
│   ├── evaluate_model.py     # NLP model threshold evaluation & benchmarking script
│   ├── jobs.json             # Static job database fallback
│   ├── users.db              # SQLite Database file
│   └── tests/                # Pytest unit tests
└── src/                      # Next.js Frontend
    ├── app/                  # Next.js App Router pages
    │   ├── api/              # Frontend API routes/proxies
    │   ├── dashboard/        # Main landing area post-login
    │   ├── jobs/             # Recommended jobs page
    │   ├── profile/          # User profile / resume details
    │   ├── recruiter/        # Recruiter dashboard for ranking candidates
    │   ├── tracker/          # Kanban application tracker
    │   ├── skill-gap/        # Recharts-based skill gap analysis
    │   ├── notifications/    # User notification inbox
    │   └── (auth routes)     # login, register, reset-password, select-role, verify-email
    ├── components/           # Reusable React components
    │   ├── JobCard.tsx       # UI for individual jobs
    │   ├── Chatbot.tsx       # Floating AI Assistant UI
    │   ├── Navbar.tsx        # Navigation bar
    │   └── Toast.tsx         # Toast notification system
    └── lib/                  # Frontend utilities & API wrappers
```

---

## 4. Features List

### User-Facing Features
*   **Role-based Access**: Dual flows for "Job Seekers" and "Recruiters".
*   **Resume Parsing**: PDF upload with automated text extraction and tech-skill identification.
*   **AI Job Matching**: Semantic matching of resumes to job descriptions providing a 0-100 `matchScore`.
*   **Hybrid Job Sourcing**: Combines a static curated database with live scraped jobs.
*   **Kanban Application Tracker**: Drag-and-drop board to track applications (Saved, Applied, Interview, Offer/Rejected).
*   **Recruiter Dashboard**: Reverse-matching; recruiters paste a JD and get a ranked list of candidates.
*   **Candidate Shortlisting**: Recruiters can shortlist users, triggering in-app notifications and automated emails to the candidate.
*   **Skill Gap Analysis**: Visualizes the missing skills a candidate needs for their target jobs.
*   **CareerBot AI**: Embedded chat assistant powered by Groq to answer career, interview, and resume questions.

### Technical Features
*   **Pre-computed Embeddings**: NLP embeddings for static jobs are computed at startup to optimize response times.
*   **JWT HttpOnly Cookies**: Secure authentication flow utilizing HttpOnly cookies to mitigate XSS.
*   **Google OAuth Integration**: Single Sign-On capability.
*   **Email SMTP Integration**: Email verification and password resets with fallback to console logging in development.
*   **Rate Limiting**: Applied to auth endpoints to prevent brute-force attacks.
*   **Database Migrations**: Custom migration scripts run on startup to adapt schema changes seamlessly.

---

## 5. Pages / Routes

| Route | Purpose |
| :--- | :--- |
| `/login` & `/register` | Standard email/password authentication & Google SSO. |
| `/select-role` | Forces new Google SSO users to pick 'job_seeker' or 'recruiter'. |
| `/verify-email` | Handles the email verification token logic. |
| `/forgot-password` & `/reset` | Password recovery flow. |
| `/dashboard` | Hub for users; summarizes tracker stats, profile status, and quick links. |
| `/upload` | Drag-and-drop interface for users to upload their PDF resume. |
| `/jobs` | Displays AI-matched job recommendations based on the user's resume. |
| `/tracker` | Kanban board to move jobs through different application stages. |
| `/skill-gap` | Data visualization showing user's matched vs. missing skills across jobs. |
| `/recruiter` | Interface for recruiters to search, rank, and shortlist candidates. |
| `/profile` | Displays the user's parsed resume text and recognized skills. |
| `/notifications` | Inbox for users to see shortlisting messages from recruiters. |
| `/unauthorized` | Fallback page for role-based access denial. |

---

## 6. Database Schema (SQLite)

*   **`users`**: Core account data.
    *   `id` (PK), `name`, `email` (UNIQUE), `password_hash`, `google_id`, `role` (job_seeker/recruiter), `is_verified`, `created_at`.
*   **`resumes`**: Candidate resume data.
    *   `id` (PK), `user_id` (FK), `resume_text`, `skills` (JSON array string), `file_name`, `uploaded_at`.
*   **`kanban_cards`**: User job tracking.
    *   `id` (PK), `user_id` (FK), `job_id`, `title`, `company`, `location`, `match_score`, `col` (Stage), `added_at`.
*   **`notifications`**: Alerts for candidates.
    *   `id` (PK), `user_id` (Candidate ID), `message`, `company`, `job_title`, `required_skills`, `recruiter_email`, `recruiter_name`, `is_read`, `created_at`.
*   **`ai_conversations`**: Chat logs for CareerBot context persistence.
    *   `id` (PK), `user_id` (FK), `user_message`, `ai_response`, `created_at`.

---

## 7. API Endpoints

### Authentication
*   `POST /api/auth/register`: Creates user, sends verification email.
*   `GET /api/auth/verify-email-link`: Validates token and marks user verified.
*   `POST /api/auth/login`: Issues JWT token in HttpOnly cookie.
*   `POST /api/auth/google`: Handles OAuth token verification.
*   `POST /api/auth/forgot-password` & `/reset-password`: Account recovery.
*   `POST /api/auth/logout`: Clears the HttpOnly cookie.

### Job Seeker
*   `POST /api/upload`: Parses PDF, extracts skills, saves to DB.
*   `GET /api/user/profile`: Fetches user info and resume data.
*   `POST /api/recommend`: Runs cosine similarity against jobs, returns ranked list.
*   `GET /api/tracker`: Fetches Kanban columns.
*   `POST /api/tracker` / `PATCH` / `DELETE`: CRUD operations for Kanban cards.
*   `GET /api/get_notifications` & `PATCH /read`: Inbox management.

### Recruiter
*   `POST /api/recruit_candidates`: Ranks the DB of candidates against a provided JD.
*   `POST /api/shortlist`: Triggers a DB notification and Email to a candidate.
*   `GET /api/recruiter/shortlisted`: Returns previously shortlisted candidates.

### Utilities
*   `POST /api/chat`: Sends message history to Groq LLM with a system prompt context.
*   `POST /api/dev/reset-db`: Testing utility to wipe DB (disabled in production).

---

## 8. Authentication & Authorization

*   **Authentication**: Handled via custom JSON Web Tokens (JWT). Upon login, the backend issues an HttpOnly, Lax, Secure (in production) cookie named `auth_token`. This protects against cross-site scripting (XSS) attacks stealing the token. Google OAuth is implemented by accepting an `id_token` from the frontend, verifying its signature with Google's public keys, and issuing the platform's own custom JWT in response.
*   **Authorization**: Middleware decorators `@require_auth` and `@require_role("job_seeker" | "recruiter")` protect routes. The role is embedded in the JWT payload and verified on every protected request.

---

## 9. Key Code Logic

*   **NLP Semantic Matching (`model.py`)**: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to convert resume text and job descriptions into dense vector embeddings. It calculates the Cosine Similarity between vectors to assign a `matchScore`. The static job embeddings are pre-computed at Flask startup to ensure instant API responses.
*   **Skill Extraction**: Uses regular expressions and a curated synonym dictionary (e.g., mapping "nodejs" and "node js" to "node.js") to reliably extract structured tech stacks from unstructured PDF text.
*   **Global API Standardizer (`app.py`)**: A Flask `@app.after_request` hook intercepts all outgoing API responses and wraps them in a consistent `{ success, message, data }` JSON structure, ensuring the frontend never has to guess the response shape.
*   **Dynamic DB Migrations (`auth.py`)**: At startup, `migrate_db()` queries `PRAGMA table_info` and dynamically applies `ALTER TABLE` commands if columns are missing, ensuring backward compatibility without needing heavy tools like Alembic.

---

## 10. What's Working Well
*   **Instant Recommendations**: By pre-computing the SentenceTransformer embeddings at startup, the system avoids heavy computational overhead during actual user requests.
*   **Comprehensive Auth System**: Having Google SSO, Email Verification, Password Reset, and secure HttpOnly cookies constitutes a highly robust, production-grade auth flow.
*   **Two-Sided Platform Completion**: Both the job seeker flow and the recruiter flow are fully fleshed out, connected by the shortlisting and notification bridge.
*   **Clean UX**: The integration of drag-and-drop Kanban boards and interactive Recharts graphs provides a premium user experience.

---

## 11. Gaps / Missing Features
*   **Resume File Storage**: Currently, the platform parses the PDF text and discards the actual file. A production app needs AWS S3 or local file storage so recruiters can download the original formatted PDF.
*   **Real-time Notifications**: Notifications require the user to refresh or navigate to the inbox. Implementing WebSockets (Socket.io) or Server-Sent Events (SSE) would make the shortlisting experience instantaneous.
*   **Scalability Limitations**: SQLite is used for simplicity, but it lacks concurrency support for write-heavy loads. Migrating to PostgreSQL is necessary for scaling. Furthermore, doing live SentenceTransformer inference on the backend blocks the Python GIL; this should ideally be moved to a separate microservice (like FastAPI or a GPU-backed inference server) in production.
*   **Job Scraper Fragility**: Live scraping relies on DOM structures of third-party job boards which break frequently. Integration with official APIs (e.g., LinkedIn API, Adzuna) is required for stability.
