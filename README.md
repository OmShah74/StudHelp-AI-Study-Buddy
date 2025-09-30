# AI Study Buddy 🚀

Transform your static study materials into a dynamic, multi-document research and learning experience. AI Study Buddy is a full-stack RAG (Retrieval-Augmented Generation) web application that leverages Large Language Models to help you synthesize information, understand complex topics, and test your knowledge across your entire library of documents.

This project is built with a modern, free-tier-friendly tech stack, making it a powerful portfolio piece and a genuinely useful tool for students and lifelong learners.

## ✨ Key Features

- 🔐 **Secure User Authentication**: Full user registration, login, and session management powered by Supabase Auth. Each user has their own private document library and chat history.
- 📄 **Dynamic Document Upload**: Upload study materials in PDF or DOCX format. DOCX files are automatically converted to PDF for universal viewing.
- 🌐 **Multi-Document RAG Chat**: Create distinct chat sessions and select multiple documents to form the context. Ask complex questions and get context-aware answers synthesized from all selected sources, with citations.
- 📖 **Full-Featured Document Viewer**: View any uploaded PDF or converted DOCX directly in the app. Includes controls for zooming, page navigation, and a page-based commenting/annotation system to save your notes.
- 📝 **AI-Powered Summarization**: Generate a concise summary of any single document, complete with a main paragraph and key bullet points.
- 🧠 **Intelligent Mind Map Generation**: Visualize the core concepts from a document and their connections by automatically generating an interactive mind map.
- ❓ **Interactive Quizzes**: Test your knowledge on a single document! Generate a multiple-choice quiz, take it, and get your score.
- 📚 **External Resource Recommendations**: For any topic, get suggestions for relevant YouTube videos and web articles, complete with modern preview cards.
- 🗑️ **Secure Data Deletion**: Users can securely delete individual documents or entire chat sessions with a confirmation step.
- 🔄 **DOCX to PDF Converter**: A standalone utility page to quickly convert Word documents to PDF and download them.
- 🎨 **Modern, Responsive UI**: A sleek, dark-themed, and fully responsive user interface built with Next.js and Tailwind CSS, complete with loading states and toast notifications.

## 🛠️ Tech Stack & Architecture

This project uses a modern monorepo structure with a React-based frontend and a Python backend.

### Frontend:
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Viewing**: react-pdf (Mozilla's PDF.js)
- **UI Components**: Lucide React, React Hot Toast
- **API Communication**: Axios
- **Deployment**: Vercel

### Backend:
- **Framework**: FastAPI
- **Language**: Python
- **AI/ML**:
  - LLM Provider: Groq API (for Llama 3 inference)
  - Embeddings: sentence-transformers
  - Vector Search: FAISS (Facebook AI Similarity Search)
- **Document Processing**:
  - Parsing: PyMuPDF, python-docx
  - Conversion: reportlab (Pure Python)
- **Deployment**: Container-friendly (Docker), suitable for Render, Fly.io, etc.

### Database, Auth & Storage:
- **Provider**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (JWT-based)
- **File Storage**: Supabase Storage

### Architecture Flow

1. A user signs up/logs in, creating a user record in Supabase Auth.
2. The user uploads a document (PDF/DOCX). The FastAPI backend authenticates the user's JWT, converts DOCX to PDF if necessary, and uploads the viewable PDF to Supabase Storage.
3. The backend processes the document's text into chunks, generates embeddings, and uploads the FAISS index and chunk files to Supabase Storage.
4. A metadata record is created in the `documents` table, linking the `user_id` to the `storage_path` and `has_pdf_viewable` status.
5. The user creates a new Chat Session, selecting one or more documents from their library. This creates records in the `chat_sessions` and `session_documents` tables.
6. When the user sends a message in a chat session, the backend authenticates, verifies ownership, and retrieves the storage paths for all documents linked to that session.
7. The backend downloads all relevant indexes, performs a multi-document vector search, re-ranks the results, and sends the combined context to the Groq LLM to generate a synthesized answer.

## 🚀 Getting Started: Local Setup

Follow these steps to get the project running on your local machine.

### Prerequisites

- Node.js (v18 or later)
- Python (v3.9 or later) & pip
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
2. Go to the **SQL Editor**, click **"+ New query"**, and run the complete SQL script provided in the dropdown below to create all necessary tables and security policies.
3. Go to **Storage** and create a new public bucket named `files`.
4. Go to **Project Settings → API** and collect your **Project URL**, **anon (public) key**, and **service_role key**.

#### Database Schema

The application relies on four primary tables in the `public` schema to manage user data, documents, chats, and comments.

##### Table: `public.documents`

Stores metadata for each file uploaded by a user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key. Unique identifier for the document record. |
| `user_id` | UUID | Foreign Key to `auth.users`. Links the document to its owner. |
| `created_at` | TIMESTAMPTZ | Timestamp of when the document was uploaded. |
| `file_name` | TEXT | The original filename provided by the user. |
| `storage_path` | TEXT | The unique folder name (UUID) in Supabase Storage. |
| `has_pdf_viewable` | BOOLEAN | Flag to indicate if a viewable PDF was successfully generated. |

**Row Level Security (RLS)**: Enabled to ensure users can only access their own document records.

##### Table: `public.chat_sessions`

Stores a record for each multi-document conversation a user starts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key. Unique identifier for the chat session. |
| `user_id` | UUID | Foreign Key to `auth.users`. Links the session to its owner. |
| `session_name` | TEXT | The custom name for the chat session given by the user. |
| `created_at` | TIMESTAMPTZ | Timestamp of when the session was created. |

**Row Level Security (RLS)**: Enabled to ensure users can only access their own chat sessions.

##### Table: `public.session_documents`

A "join table" that links chat sessions to the specific documents they use for context.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary Key. |
| `session_id` | UUID | Foreign Key to `chat_sessions`. |
| `document_id` | UUID | Foreign Key to `documents`. |

**Row Level Security (RLS)**: Enabled. Access is granted if the user owns the parent `chat_session`.

##### Table: `public.comments`

Stores all page-specific annotations made by a user in the document viewer.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary Key. |
| `document_id` | UUID | Foreign Key to `documents`. |
| `user_id` | UUID | Foreign Key to `auth.users`. The author of the comment. |
| `page_number` | INT | The page number the comment is associated with. |
| `comment_text` | TEXT | The content of the user's comment. |
| `created_at` | TIMESTAMPTZ | Timestamp of when the comment was created. |

**Row Level Security (RLS)**: Enabled. Access is granted if the user owns the parent document being commented on.



### 3. Backend Setup (FastAPI)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all required packages
pip install -r requirements.txt

# Create the environment file (if an example file exists)
# cp .env.example .env
```

Create a `.env` file in the `backend` directory and fill it with your secret keys.

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

# Create the local environment file (if an example file exists)
# cp .env.local.example .env.local
```

Create a `.env.local` file in the `frontend` directory and fill it with your public keys.

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

The frontend will be running on `http://localhost:3000`. Open this URL in your browser, sign up for an account, and start using the application.

## 🔮 Future Enhancements

- **Automated Flashcard Generation**: Create a new tab to generate and review flashcards (Term → Definition) from the document content.
- **"Explain Like I'm 5" (ELI5) Mode**: Add a toggle in the chat interface to simplify complex topics.
- **Keyword Extraction & Tagging**: Automatically extract key entities from documents and display them as clickable tags for quick searching.
- **Share Chat Sessions**: Allow users to generate a shareable, read-only link to a chat session.