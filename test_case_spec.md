# CareerBuilder Test Case Specification Document

This document is a comprehensive breakdown of the CareerBuilder application specifically structured for the generation of exhaustive test cases. It contains detailed mappings of the entire system architecture based on a full codebase scan.

## SECTION 1 - EVERY FEATURE

### 1. Authentication & Authorization
*   **Email/Password Registration:** Users can sign up with an email, name, password, and role (`job_seeker` or `recruiter`). 
*   **Email Link Verification:** New registrations send an email with a 15-minute expiring JWT link. Clicking the link verifies the account.
*   **Email/Password Login:** Authenticates verified users and issues a 7-day HttpOnly JWT cookie (`auth_token`).
*   **Google OAuth Login/Signup:** Users can authenticate via Google. Handled natively via Google ID token verification and NextAuth frontend state. Google users skip email verification.
*   **Password Reset Flow:** Users can request a reset link (15-minute JWT token) via email and submit a new password to update their credentials.
*   **Role-Based Access Control (RBAC):** Backend enforces strict route access using `@require_auth` and `@require_role('job_seeker' | 'recruiter')` decorators.
*   **Role Selection for Google Users:** Google users who haven't picked a role are prompted to select one, which updates their profile.

### 2. Job Seeker Features
*   **Resume Parsing & Upload:** Accepts `.pdf` files up to 5MB. Extracts raw text using `PyPDF2` and identifies specific technical skills using regex matching against a predefined skill dictionary (`model.py`).
*   **AI Job Recommendation (Static + Live):** Recommends jobs based on the cosine similarity of BERT embeddings between the user's resume text and job descriptions. Returns a `matchScore` (0-100) and lists `matchedSkills` and `missingSkills`.
*   **Live Web Scraping:** Scrapes live jobs on-demand from LinkedIn (Guest API), Indeed (RSS feed), and Internshala. Includes deduplication and fallback to static cached data if scraping fails or returns zero results (`hybrid` mode).
*   **Kanban Application Tracker:** A visual board (Saved, Applied, Interview, Offer/Rejected) where users can save jobs and move them between columns. Persisted to the database.
*   **Analytics Dashboard:** Visual charts (using Recharts) showing skill gaps, matched skills, etc.
*   **Notifications:** Users receive in-app notifications when a recruiter shortlists them.
*   **CareerBot (AI Chatbot):** A career-focused AI assistant powered by Groq (`llama-3.1-8b-instant` with fallback models) using the `/api/chat` endpoint.

### 3. Recruiter Features
*   **AI Candidate Sourcing:** Recruiters paste a job description. The system embeds the query using BERT and ranks all candidates in the database via cosine similarity.
*   **Candidate Insights:** Recruiters see candidate match scores, matched skills, and missing skills.
*   **Candidate Shortlisting:** Recruiters can shortlist a candidate. This triggers a database notification for the candidate and attempts to send an email alert to them.
*   **Shortlisted Roster:** Recruiters can view a list of all candidates they have previously shortlisted.

---

## SECTION 2 - EVERY USER FLOW

### 1. Registration Flow
1. User enters name, email, password, and selects a role on the `/register` page.
2. Frontend posts to `/api/auth/register`.
3. Backend validates input. If valid, hashes password (PBKDF2-SHA256), saves user with `is_verified=0`, generates a 15-minute JWT, and emails the verification link.
4. User receives the email (or terminal fallback in dev).

### 2. Email Verification Flow
1. User clicks the link: `/verify-email?token=<jwt>`.
2. Frontend calls `/api/auth/verify-email-link?token=<jwt>`.
3. Backend decodes JWT, verifies it hasn't expired and `purpose == "email_verification"`.
4. Updates user `is_verified=1`, sets an HttpOnly JWT cookie, and returns user data.
5. Frontend redirects user to their respective dashboard.

### 3. Login Flow (Credentials)
1. User enters email and password on `/login`.
2. Frontend posts to `/api/auth/login`.
3. Backend verifies the user exists, checks the password hash, and ensures `is_verified=1`.
4. Sets the HttpOnly `auth_token` cookie and returns user data.
5. Frontend redirects based on user role.

### 4. Password Reset Flow
1. User enters email on `/forgot-password`.
2. Backend `/api/auth/forgot-password` generates a 15-min JWT (`purpose="password_reset"`) and sends an email.
3. User clicks link to `/reset-password?token=<jwt>`.
4. User enters a new password.
5. Backend `/api/auth/reset-password` validates the token and password rules, then updates the hash.

### 5. Resume Upload Flow
1. Job seeker navigates to `/upload`.
2. Selects a PDF file.
3. Frontend posts `FormData` to `/api/upload`.
4. Backend checks file type, size, parses text, extracts skills.
5. Saves text and skills to the `resumes` table.

### 6. Job Recommendations Flow
1. Job seeker navigates to `/jobs`.
2. Frontend posts to `/api/recommend` with requested `count`, `job_source` ("hybrid", "live", "static"), and `refresh_live_jobs`.
3. Backend determines the skill keyword, triggers scrapers if needed, embeds the resume text, compares against job embeddings, and returns a sorted list of matches.

### 7. Kanban Tracker Flow
1. User clicks "Save Job" from the jobs list.
2. Frontend POSTs job data to `/api/tracker`. Backend adds it to the `Saved` column.
3. User drags the job card to a new column.
4. Frontend PATCHes `/api/tracker/<job_id>` with the new `column`. Backend updates it.
5. User clicks delete. Frontend DELETEs `/api/tracker/<job_id>`. Backend removes it.

### 8. Recruiter Search & Shortlist Flow
1. Recruiter navigates to `/recruiter`.
2. Pastes a job description and clicks search.
3. Frontend POSTs to `/api/recruit_candidates`.
4. Backend embeds the description, compares it against all `resumes.resume_text`, and returns paginated, ranked candidates.
5. Recruiter clicks "Shortlist" on a candidate card.
6. Frontend POSTs to `/api/shortlist`. Backend inserts a row into the `notifications` table and sends an email.

### 9. Chatbot Flow
1. User opens the chat widget and types a message.
2. Frontend POSTs history and new message to `/api/chat`.
3. Backend injects the CareerBot system prompt, calls Groq API.
4. If a model fails, it loops to fallback models. Returns the AI reply.

---

## SECTION 3 - EVERY API ENDPOINT

### Authentication
*   **POST `/api/auth/register`**
    *   **Accepts:** `{name, email, password, role}`
    *   **Returns:** `201 Created` with success message and `requires_verification: true`.
    *   **Errors:** `400` Missing fields, `409` Email already registered.
    *   **Auth:** None. Rate limit: 3/min.
*   **GET `/api/auth/verify-email-link`**
    *   **Accepts:** Query param `?token=<jwt>`
    *   **Returns:** `200 OK` sets HttpOnly cookie, returns `{message, token, user}`.
    *   **Errors:** `400` Invalid/Expired token.
    *   **Auth:** None. Rate limit: 10/min.
*   **POST `/api/auth/login`**
    *   **Accepts:** `{email, password}`
    *   **Returns:** `200 OK` sets HttpOnly cookie, returns user data.
    *   **Errors:** `400` Missing fields, `401` Invalid credentials / Not verified / Google account.
    *   **Auth:** None. Rate limit: 5/min.
*   **POST `/api/auth/google`**
    *   **Accepts:** `{token}` (Google OAuth ID token)
    *   **Returns:** `200 OK` sets HttpOnly cookie, returns user data.
    *   **Errors:** `400` Missing token, `401` Invalid Google token.
    *   **Auth:** None.
*   **POST `/api/auth/forgot-password`**
    *   **Accepts:** `{email}`
    *   **Returns:** `200 OK` Generic success message (even if email doesn't exist).
    *   **Errors:** `400` Missing email.
    *   **Auth:** None. Rate limit: 3/min.
*   **POST `/api/auth/reset-password`**
    *   **Accepts:** `{reset_token, new_password}`
    *   **Returns:** `200 OK` Success message.
    *   **Errors:** `400` Invalid token, expired token, weak password.
    *   **Auth:** None. Rate limit: 5/min.
*   **POST `/api/auth/set-role`**
    *   **Accepts:** `{role}`
    *   **Returns:** `200 OK` sets updated HttpOnly cookie.
    *   **Errors:** `400` Missing/invalid role, `409` Role already set.
    *   **Auth:** Requires valid JWT.
*   **POST `/api/auth/logout`**
    *   **Returns:** `200 OK` clears `auth_token` cookie.

### Job Seeker
*   **GET `/api/user/profile`**
    *   **Returns:** `200 OK` `{name, email, role, resume: {text, skills, file_name, uploaded_at}}`
    *   **Errors:** `404` User not found.
    *   **Auth:** Requires valid JWT.
*   **POST `/api/upload`**
    *   **Accepts:** `multipart/form-data` with `file`.
    *   **Returns:** `200 OK` `{message, extracted_text_preview, skills}`.
    *   **Errors:** `400` No file, non-PDF, >5MB. `422` Could not extract text. `500` Processing fail.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **POST `/api/recommend`**
    *   **Accepts:** `{count, resume_text, skills, job_source, refresh_live_jobs, keyword}`
    *   **Returns:** `200 OK` `{recommendations: [], count, source, keyword, warning}`
    *   **Errors:** `400` Missing skills/resume. `500` Model fail.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **GET `/api/tracker`**
    *   **Returns:** `200 OK` Dictionary of columns `{"Saved": [], "Applied": [], ...}`
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **POST `/api/tracker`**
    *   **Accepts:** `{id, title, company, location, matchScore}`
    *   **Returns:** `201 Created` Success message.
    *   **Errors:** `400` Missing required fields.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **PATCH `/api/tracker/<job_id>`**
    *   **Accepts:** `{column}`
    *   **Returns:** `200 OK` Success message.
    *   **Errors:** `400` Invalid/Missing column.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **DELETE `/api/tracker/<job_id>`**
    *   **Returns:** `200 OK` Success message.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **GET `/api/get_notifications`**
    *   **Returns:** `200 OK` List of notifications.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **PATCH `/api/notifications/<notif_id>/read`**
    *   **Returns:** `200 OK` `{success: true}`.
    *   **Auth:** Requires JWT & `job_seeker` role.
*   **POST `/api/chat`**
    *   **Accepts:** `{message, history: [{role, text}]}`
    *   **Returns:** `200 OK` `{reply}`
    *   **Errors:** `400` Missing message, `503` Groq not configured, `502` All models failed.
    *   **Auth:** Requires JWT.

### Recruiter
*   **POST `/api/recruit_candidates`**
    *   **Accepts:** `{jobDescription, page, page_size}`
    *   **Returns:** `200 OK` `{candidates: [], page, page_size, total, has_more}`
    *   **Errors:** `400` Missing jobDescription. `500` DB/Model fail.
    *   **Auth:** Requires JWT & `recruiter` role.
*   **POST `/api/shortlist`**
    *   **Accepts:** `{candidate_id, job_title, company, recruiter_name, recruiter_email, required_skills}`
    *   **Returns:** `200 OK` `{success: true, notification_id}`
    *   **Errors:** `400` Missing required fields. `500` DB/Email fail.
    *   **Auth:** Requires JWT & `recruiter` role.
*   **GET `/api/recruiter/shortlisted`**
    *   **Returns:** `200 OK` `{shortlisted: []}`
    *   **Auth:** Requires JWT & `recruiter` role.

### Dev (Non-Production Only)
*   **POST `/api/dev/reset-db`**
    *   **Returns:** `200 OK` Database reset successful.
    *   **Errors:** `403` Not allowed in production.

---

## SECTION 4 - EVERY VALIDATION RULE

### Input & Account Validations
*   **Password Rules:** Must be at least 8 characters long, contain at least one uppercase letter `[A-Z]`, and contain at least one number `[0-9]`. Enforced on `/register` and `/reset-password`.
*   **Role Selection:** Must be exactly `"job_seeker"` or `"recruiter"`. A user's role can only be set once (cannot be changed after it is populated).
*   **Account Verification:** Login is blocked (`401`) until `is_verified == 1`.
*   **Google Accounts:** A user created via Google OAuth cannot log in via traditional password (`401 This account uses Google login`).

### File Upload Validations (`/api/upload`)
*   **Presence:** Request must contain `file` form-data.
*   **File Name:** Filename must not be empty.
*   **File Extension:** Filename MUST end with `.pdf` (case-insensitive).
*   **File Size:** Maximum file size is strictly `5 * 1024 * 1024` bytes (5 MB).
*   **Content:** The PDF must contain extractable text (`PyPDF2` extraction must yield non-empty string).

### Data Validations
*   **Kanban Columns:** Target column in PATCH must be exactly one of: `"Saved"`, `"Applied"`, `"Interview"`, `"Offer/Rejected"`.
*   **Recommendation Count:** Clamped to `max(1, min(count, 20))`.
*   **Candidate Pagination:** Page size clamped to `max(1, min(page_size, 50))`.
*   **Skills Payload:** If passing `skills` directly to `/api/recommend`, it must be a non-empty array.

### Rate Limits (In-Memory IP based)
*   `/api/auth/register`: 3 per minute
*   `/api/auth/verify-email-link`: 10 per minute
*   `/api/auth/login`: 5 per minute
*   `/api/auth/forgot-password`: 3 per minute
*   `/api/auth/reset-password`: 5 per minute

---

## SECTION 5 - EVERY ERROR CASE

### Generic Errors
*   `500 Internal server error` - Thrown globally by the `@app.errorhandler` wrapper for unhandled backend exceptions.
*   `401 Unauthorized — no token provided` - Missing cookie/header.
*   `401 Token expired — please log in again` - JWT `exp` time reached.
*   `401 Invalid token` - Tampered or malformed JWT.
*   `403 Access denied. Insufficient permissions.` - Wrong role for the endpoint.

### Auth Specific
*   `400 Missing name, email, password, or role`
*   `409 Email already registered`
*   `400 Password must be at least 8 characters with one uppercase letter and one number`
*   `400 Missing token` (Verify email)
*   `400 Verification link has expired. Please register again.`
*   `400 Invalid verification link.`
*   `400 Missing email or password`
*   `401 Invalid email or password.`
*   `401 This account uses Google login. Please sign in with Google.`
*   `401 Please verify your email first.`
*   `400 Missing Google ID token`
*   `401 Google sign-in failed`
*   `400 Missing reset_token or new_password`
*   `400 Reset link has expired. Please request a new one.`
*   `400 Invalid reset token.`
*   `400 Role must be job_seeker or recruiter`
*   `409 Role already set. Cannot change role.`

### Features Specific
*   `404 User not found` (/api/user/profile)
*   `400 No file uploaded`, `400 No file selected`, `400 Only PDF files are accepted`, `400 File too large. Maximum size is 5 MB`
*   `422 Could not extract text from this PDF`
*   `400 Request body must be JSON` (/api/recommend)
*   `400 skills must be a non-empty array`
*   `400 Provide either 'skills' or 'resume_text', or upload a resume first`
*   `400 Missing id, title, or company` (/api/tracker POST)
*   `400 Missing column` (/api/tracker PATCH)
*   `400 Invalid column` (/api/tracker PATCH)
*   `400 Missing jobDescription` (/api/recruit_candidates)
*   `400 <field> is required` (/api/shortlist)
*   `503 Chatbot is not configured. Add GROQ_API_KEY to backend/.env`
*   `400 Missing message` (/api/chat)
*   `502 All models unavailable. Try again later.` (/api/chat)

---

## SECTION 6 - DATABASE TABLES

SQLite database (`users.db`) with 4 tables.

### 1. `users`
*   `id` (INTEGER PRIMARY KEY)
*   `name` (TEXT NOT NULL)
*   `email` (TEXT UNIQUE NOT NULL)
*   `password_hash` (TEXT NOT NULL) - Can be placeholder for Google users.
*   `google_id` (TEXT) - Null for standard users.
*   `role` (TEXT) - `job_seeker` or `recruiter`.
*   `is_verified` (INTEGER DEFAULT 1) - Boolean flag.
*   `verified` (INTEGER DEFAULT 1) - Duplicate legacy flag.
*   `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 2. `resumes`
*   `id` (INTEGER PRIMARY KEY)
*   `user_id` (INTEGER NOT NULL UNIQUE) - Foreign key to `users`.
*   `resume_text` (TEXT NOT NULL) - Raw text extracted from PDF.
*   `skills` (TEXT NOT NULL) - JSON stringified array of extracted skills.
*   `file_name` (TEXT) - Original PDF filename.
*   `uploaded_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 3. `kanban_cards`
*   `id` (INTEGER PRIMARY KEY)
*   `user_id` (INTEGER NOT NULL)
*   `job_id` (INTEGER NOT NULL) - Local/Scraped ID of the job.
*   `title` (TEXT NOT NULL)
*   `company` (TEXT NOT NULL)
*   `location` (TEXT DEFAULT '')
*   `match_score` (INTEGER DEFAULT 0)
*   `col` (TEXT NOT NULL DEFAULT 'Saved') - Kanban phase.
*   `added_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
*   `UNIQUE(user_id, job_id)` constraint prevents duplicating a job on the board.

### 4. `notifications`
*   `id` (INTEGER PRIMARY KEY)
*   `user_id` (TEXT NOT NULL) - The candidate's user ID.
*   `message` (TEXT NOT NULL)
*   `company` (TEXT)
*   `job_title` (TEXT)
*   `required_skills` (TEXT)
*   `recruiter_email` (TEXT)
*   `recruiter_name` (TEXT)
*   `is_read` (INTEGER DEFAULT 0) - Boolean flag.
*   `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

## SECTION 7 - WHAT IS NOT IMPLEMENTED

The following items are missing, incomplete, or rely on fallbacks and should **NOT** be included in strict production test cases as expected behaviors:

1.  **True Email Delivery:** If `SMTP_USER` / `SMTP_PASS` are missing or invalid, the system catches the failure and logs the fallback verification/reset links directly to the backend terminal console. Real email testing will fail without active credentials.
2.  **Frontend State Consistency for Auth:** NextAuth handles Google sessions while Flask handles JWT. Some logs indicate hybrid authentication tracking.
3.  **OTP Verification:** The `otp_table` and `otps` tables have been dropped in migrations. The application uses JWT email links exclusively now; no 6-digit OTP code flow exists.
4.  **Guaranteed Live Web Scraping:** Scrapers (LinkedIn, Indeed, Internshala) rely on DOM parsing and RSS. If they timeout (10s) or fail due to bot protection, they silently return empty lists and the system falls back to a static cached file (`jobs.json` / `scraped_jobs.json`).
5.  **Profile Image/Avatar Upload:** The database schema has no column for profile pictures except the `picture` URL returned purely by Google OAuth.
6.  **Admin Dashboard/Role:** There is no `admin` or superuser role implemented for platform management.
7.  **Job Application Processing:** Clicking "Apply" on a job redirects the user to the source URL. The platform itself does not capture or process the actual application submission.
8.  **Job Posting by Recruiters:** Recruiters can search for candidates using a job description, but they cannot actually "create" and list a job on the platform for seekers to see natively.
