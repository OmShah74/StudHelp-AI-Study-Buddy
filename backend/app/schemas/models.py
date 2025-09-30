from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List

class ChatRequest(BaseModel):
    doc_id: str
    query: str

class QuizRequest(BaseModel):
    doc_id: str
    # Add a default value and validation using Field
    num_questions: int = Field(default=5, ge=1, le=10)
    
class RecommendationRequest(BaseModel):
    doc_id: str
    topic: str
    
class CommentRequest(BaseModel):
    page_number: int
    comment_text: str

class CommentResponse(BaseModel):
    id: int
    document_id: uuid.UUID
    user_id: uuid.UUID
    page_number: int
    comment_text: str
    created_at: datetime
    
class DocumentResponse(BaseModel):
    file_name: str
    storage_path: str

class ChatSessionCreate(BaseModel):
    session_name: str
    document_ids: List[str] # List of storage_paths

class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_name: str
    created_at: datetime