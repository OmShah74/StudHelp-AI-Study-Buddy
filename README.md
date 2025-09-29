# AI Study Buddy 🚀

Transform your static study materials into a dynamic and interactive learning experience. AI Study Buddy is a full-stack RAG (Retrieval-Augmented Generation) web application that leverages Large Language Models to help you understand, summarize, and test your knowledge on any subject.

This project is built with a modern, free-tier-friendly tech stack, making it a powerful portfolio piece and a genuinely useful tool for students and lifelong learners.

## ✨ Key Features

- 🔐 **Secure User Authentication**: Full user registration and login system powered by Supabase Auth. Each user has their own private document library.
- 📄 **Dynamic Document Upload**: Upload your study materials in PDF or DOCX format.
- 💬 **Interactive RAG Chat**: Chat with your documents. Ask complex questions and get context-aware answers based directly on the provided material.
- 📝 **AI-Powered Summarization**: Generate a concise summary of your document, complete with a main paragraph and key bullet points, with a single click.
- 🧠 **Intelligent Mind Map Generation**: Visualize the core concepts and their connections by automatically generating an interactive mind map from your document.
- ❓ **Interactive Quizzes**: Test your knowledge! Generate a multiple-choice quiz based on the document content, take the quiz, and see your score.
- 🌐 **External Resource Recommendations**: Get suggestions for relevant YouTube videos and web articles on topics you find challenging, complete with preview cards.
- 🗑️ **Secure Document Deletion**: Users can securely delete their documents and all associated data from the database and storage.
- 🎨 **Modern, Responsive UI**: A sleek, dark-themed, and fully responsive user interface built with Next.js and Tailwind CSS.

## 🛠️ Tech Stack & Architecture

This project uses a modern monorepo structure with a React-based frontend and a Python backend.

### Frontend:
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Lucide React
- **State Management**: React Context & Hooks
- **API Communication**: Axios
- **Deployment**: Vercel

### Backend:
- **Framework**: FastAPI
- **Language**: Python
- **AI/ML**:
  - LLM Provider: Groq API (for Llama 3 inference)
  - Embeddings: sentence-transformers
  - Vector Search: FAISS (Facebook AI Similarity Search)
  - Document Parsing: PyMuPDF (PDFs), python-docx (DOCX)
- **Deployment**: Container-friendly (Docker), suitable for Render, Fly.io, etc.

### Database, Auth & Storage:
- **Provider**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (JWT-based)
- **File Storage**: Supabase Storage

### Architecture Flow

1. A user signs up/logs in via the Next.js frontend, creating a user record in Supabase Auth.
2. The user uploads a document. The frontend sends the file to the FastAPI backend along with the user's JWT.
3. The backend authenticates the JWT, processes the document into chunks, generates embeddings, and uploads the FAISS index and chunk files to a user-specific folder in Supabase Storage.
4. A metadata record is created in the Supabase PostgreSQL database, linking the `user_id` to the `storage_path` of the files.
5. When the user interacts with a feature (chat, quiz, etc.), the frontend sends the request with the `doc_id` and JWT.
6. The backend verifies the JWT and performs an ownership check against the database to ensure the user owns the document before retrieving files from storage and calling the Groq LLM.

## 🚀 Getting Started: Local Setup

Follow these steps to get the project running on your local machine.

### Prerequisites

- Node.js (v18 or later)
- Python (v3.9 or later)
- Git
- A Supabase account (Free Tier)
- A Groq API key (Free)
- A Google Cloud Platform account (Free Tier) for YouTube/Web Search API keys.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-study-buddy.git
cd ai-study-buddy
```

### 2. Supabase Project Setup

1. Create a new project on [Supabase.io](https://supabase.io).
2. Go to the **SQL Editor** and create the `documents` table using the schema below.
3. Go to **Storage** and create a new public bucket named `files`.
4. Go to **Project Settings → API** and collect your **Project URL**, **anon (public) key**, and **service_role key**.

#### Database Schema

**Table: `public.documents`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique document identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the document |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp of document creation |
| `file_name` | TEXT | NOT NULL | Original name of the uploaded file |
| `storage_path` | TEXT | NOT NULL, UNIQUE | Path to the document in Supabase Storage |
| `entities` | JSONB | DEFAULT '[]'::jsonb | Extracted entities/keywords from document |

**Row Level Security (RLS)**: Enabled with policies ensuring users can only access their own documents (SELECT, INSERT, UPDATE, DELETE based on `auth.uid() = user_id`).

### 3. Backend Setup (FastAPI)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all required packages
pip install -r requirements.txt

# Create the environment file
cp .env.example .env
```

Now, open the newly created `.env` file and fill in your secret keys.

**File: `backend/.env`**

```env
GROQ_API_KEY="your_groq_api_key"
SUPABASE_URL="https://your-project-url.supabase.co"
SUPABASE_SERVICE_KEY="your_supabase_service_role_key"
YOUTUBE_API_KEY="your_google_cloud_api_key"
PSE_API_KEY="your_same_google_cloud_api_key"
PSE_CX="your_programmable_search_engine_id"
```

Run the backend server:

```bash
uvicorn main:app --reload
```

The backend will be running on `http://127.0.0.1:8000`.

### 4. Frontend Setup (Next.js)

```bash
# Navigate to the frontend directory from the root
cd frontend

# Install all required packages
npm install

# Create the local environment file
cp .env.local.example .env.local
```

Now, open the newly created `.env.local` file and fill in your public keys.

**File: `frontend/.env.local`**

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL="https://your-project-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_public_key"
```

Run the frontend development server:

```bash
npm run dev
```

The frontend will be running on `http://localhost:3000`. Open this URL in your browser to use the application.

## 🔮 Future Enhancements

- **Automated Flashcard Generation**: Create a new tab to generate and review flashcards (Term → Definition) from the document content.
- **"Explain Like I'm 5" (ELI5) Mode**: Add a toggle in the chat interface to simplify complex topics.
- **Keyword Extraction & Tagging**: Automatically extract key entities from documents and display them as clickable tags for quick searching.
- **Improved Document Previews**: Show a small preview or the first page of the uploaded document in the dashboard.