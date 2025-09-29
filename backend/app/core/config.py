# backend/app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
PSE_API_KEY = os.getenv("PSE_API_KEY")
PSE_CX = os.getenv("PSE_CX")