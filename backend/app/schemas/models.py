from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    doc_id: str
    query: str

class QuizRequest(BaseModel):
    doc_id: str
    # Add a default value and validation using Field
    num_questions: int = Field(default=5, ge=1, le=10)