# CareerBuilder - AI Job Matching Platform

CareerBuilder is a modern, AI-powered dual-sided platform tailored for tech professionals in India. It redefines the hiring process by matching job seekers with ideal roles using semantic text analysis and machine learning, moving beyond traditional keyword-based applicant tracking systems. 

## 🚀 Key Features

### For Job Seekers
* **Smart Resume Parsing**: Upload a PDF resume and let our system automatically extract your experience and technical skills.
* **AI-Driven Job Matching**: Receive highly accurate job recommendations ranked from 0-100 based on the semantic similarity between your resume and live/curated job descriptions.
* **Application Tracker (Kanban)**: Organize your job search effortlessly with a drag-and-drop Kanban board (Saved, Applied, Interview, Offer).
* **Skill Gap Analysis**: Interactive data visualization that highlights precisely which skills you are missing for your target roles.
* **CareerBot Assistant**: An integrated AI Chatbot (powered by Groq) to answer career questions, refine your resume, and help with interview prep.

### For Recruiters
* **AI Candidate Sourcing**: Paste a Job Description to instantly rank the entire platform's database of candidates by semantic relevance.
* **One-Click Shortlisting**: Select top candidates to trigger instant in-app notifications and automated emails.

## 🛠 Tech Stack

**Frontend**
* **Next.js 16 (App Router)** & React 19
* **Tailwind CSS v4** & Framer Motion (Styling & Animations)
* **@dnd-kit/core** (Kanban Drag and Drop)
* **Recharts** (Data Visualization)

**Backend**
* **Flask** & **SQLite3**
* **Sentence-Transformers** (`all-MiniLM-L6-v2`) & Scikit-learn (NLP Semantic Matching)
* **PyPDF2** (PDF parsing)
* **Groq API** (Llama 3 / Gemma / Mixtral for Chatbot)
* Custom JWT Auth & Google OAuth SSO

## 📂 Folder Structure
```text
/
├── backend/                  # Flask API Backend
│   ├── app.py                # Main application routes
│   ├── auth.py               # Auth, JWT, DB migrations
│   ├── model.py              # AI matching & BERT model logic
│   └── scraper.py            # Live job scraping utilities
└── src/                      # Next.js Frontend
    ├── app/                  # Application Routes (dashboard, recruiter, jobs, etc.)
    ├── components/           # Reusable UI (Chatbot, Navbar, JobCard)
    └── lib/                  # Utilities & API proxies
```

## ⚙️ Getting Started

### Prerequisites
* Node.js (v20+)
* Python (v3.10+)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `backend/.env`:
   ```env
   FLASK_ENV=development
   JWT_SECRET=your_super_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   GROQ_API_KEY=your_groq_key
   FRONTEND_URL=http://localhost:3000
   ```
5. Run the server:
   ```bash
   flask run --port=5000
   ```

### Frontend Setup
1. Navigate to the root directory and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Architecture & Logic

* **Semantic Matching**: The platform utilizes `sentence-transformers` to compute cosine similarities between vector embeddings of resumes and job descriptions. Embeddings for static jobs are computed at startup to guarantee real-time latency.
* **Authentication**: A highly secure flow combining HTTP-Only cookies with JSON Web Tokens (JWT) protecting against XSS attacks, augmented by Google OAuth integration.
* **Dynamic Migrations**: The SQLite backend utilizes automated script migrations on startup (`PRAGMA table_info` alterations) allowing for safe schema changes without massive dependencies.

## 📝 License
This project is open source and available under the [MIT License](LICENSE).
