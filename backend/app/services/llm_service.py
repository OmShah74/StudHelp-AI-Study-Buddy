# backend/app/services/llm_service.py (Complete, Updated File)

from groq import Groq
from app.core.config import GROQ_API_KEY, MODEL_NAME

client = Groq(api_key=GROQ_API_KEY)

def generate_chat_completion(prompt: str) -> str:
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=MODEL_NAME,
            temperature=0.2,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        # IMPORTANT CHANGE: Instead of returning a string, we re-raise the exception.
        # This allows our endpoints to catch the specific error from Groq.
        print(f"An error occurred while calling Groq API: {e}")
        raise e