from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import uuid
import json
import traceback
from supabase import create_client, Client
from gotrue.types import User

from app.services import document_service, vector_service, llm_service
from app.schemas.models import ChatRequest, QuizRequest
from app.core.auth import get_current_user
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

router = APIRouter()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Helper function to verify that the user making the request owns the document.
# This is called at the beginning of every endpoint that accesses a document.
def verify_document_ownership(doc_id: str, user_id: str):
    try:
        # .single() ensures that exactly one row is returned, otherwise it raises an error.
        result = supabase.table("documents").select("id").eq("storage_path", doc_id).eq("user_id", user_id).single().execute()
        # If the query returns no data, the document does not exist or does not belong to the user.
        if not result.data:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this document or it does not exist.")
    except Exception as e:
        # Catches errors from .single() (e.g., if more than one row is found) or other DB issues.
        print(f"Ownership verification failed: {e}")
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this document or it does not exist.")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or DOCX file.")
    
    # 1. Extract text and create chunks from the document.
    text = document_service.extract_text_from_pdf(file.file) if file.content_type == "application/pdf" else document_service.extract_text_from_docx(file.file)
    chunks = document_service.chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract any text from the document.")

    # 2. Generate a unique ID and store the embeddings in Supabase Storage.
    doc_id = str(uuid.uuid4())
    vector_service.create_and_store_embeddings(doc_id, chunks)
    
    # 3. Insert a record into the Supabase Database to link the user to the file.
    try:
        supabase.table("documents").insert({
            "user_id": str(current_user.id),
            "file_name": file.filename,
            "storage_path": doc_id
        }).execute()
    except Exception as e:
        # If the database insert fails, try to clean up the orphaned files in storage to save space.
        try:
            supabase.storage.from_("files").remove([f"{doc_id}/doc.index", f"{doc_id}/chunks.txt"])
        except Exception as cleanup_e:
            print(f"CRITICAL: Failed to cleanup orphaned storage files for doc_id {doc_id}: {cleanup_e}")
        raise HTTPException(status_code=500, detail=f"Database error after file upload: {e}")

    return {"document_id": doc_id, "filename": file.filename}


@router.post("/chat")
async def chat_with_document(request: ChatRequest, current_user: User = Depends(get_current_user)):
    verify_document_ownership(request.doc_id, str(current_user.id))
    
    context_chunks = vector_service.retrieve_relevant_chunks(request.doc_id, request.query)
    if not context_chunks:
        raise HTTPException(status_code=404, detail="Could not retrieve relevant context from your document to answer this question.")

    context = "\n\n".join(context_chunks)
    prompt = f"""Based ONLY on the following context, answer the user's question.
    Context:
    {context}
    ---
    Question: {request.query}
    """
    
    answer = llm_service.generate_chat_completion(prompt)
    return {"answer": answer}


@router.post("/mindmap")
async def generate_mindmap(request: ChatRequest, current_user: User = Depends(get_current_user)):
    verify_document_ownership(request.doc_id, str(current_user.id))
    
    try:
        context_chunks = vector_service.retrieve_relevant_chunks(request.doc_id, request.query, top_k=10)
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Could not find relevant context for the mind map topic.")
        
        context = "\n\n".join(context_chunks)
        prompt = f"""
        Analyze the following text and generate a JSON object for a mind map with "nodes" and "edges".
        - "nodes" must be an array of objects, each with "id", "data": {{"label": "Concept"}}, "position": {{"x":0, "y":0}}.
        - "edges" must be an array of objects, each with "id", "source", "target".
        IMPORTANT: Your entire response must be ONLY the JSON object.
        Context: --- {context} --- JSON Output:
        """
        llm_response_str = llm_service.generate_chat_completion(prompt)
        json_start_index = llm_response_str.find('{')
        json_end_index = llm_response_str.rfind('}')
        
        if json_start_index != -1 and json_end_index != -1:
            clean_json_str = llm_response_str[json_start_index : json_end_index + 1]
            mind_map_json = json.loads(clean_json_str)
        else:
            raise ValueError("No JSON object found in the LLM response.")
        
        if "nodes" not in mind_map_json or "edges" not in mind_map_json:
            raise ValueError("Missing 'nodes' or 'edges' key in JSON")
        
        return mind_map_json
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate a valid mind map: {e}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


@router.post("/summarize")
async def summarize_document(request: ChatRequest, current_user: User = Depends(get_current_user)):
    verify_document_ownership(request.doc_id, str(current_user.id))

    try:
        context_chunks = vector_service.retrieve_relevant_chunks(
            doc_id=request.doc_id, 
            query="Provide a comprehensive summary of this document.",
            top_k=20
        )
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Could not find content to summarize in the document.")

        context = "\n\n".join(context_chunks)
        prompt = f"""
        Based ONLY on the following text, provide a high-quality summary with a main paragraph and a "Key Points" list.
        Do not add any preamble like "Here is the summary".
        Text to Summarize: --- {context} --- Summary:
        """
        summary_text = llm_service.generate_chat_completion(prompt)
        return {"summary": summary_text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during summarization: {e}")


@router.post("/quiz")
async def generate_quiz(request: QuizRequest, current_user: User = Depends(get_current_user)):
    verify_document_ownership(request.doc_id, str(current_user.id))
    
    try:
        context_chunks = vector_service.retrieve_relevant_chunks(
            doc_id=request.doc_id, 
            query="Generate a quiz based on the key concepts in this document.",
            top_k=15
        )
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Could not find content to generate a quiz from.")

        context = "\n\n".join(context_chunks)
        prompt = f"""
        Based ONLY on the following text, create a multiple-choice quiz with {request.num_questions} questions.
        Generate a JSON array of objects. Each object must have "question", "options" (an array of 4 strings), and "correctAnswer".
        IMPORTANT: Your entire response MUST be ONLY the JSON array.
        Text to analyze: --- {context} --- JSON Array Output:
        """
        llm_response_str = llm_service.generate_chat_completion(prompt)
        json_start_index = llm_response_str.find('[')
        json_end_index = llm_response_str.rfind(']')
        
        if json_start_index != -1 and json_end_index != -1:
            clean_json_str = llm_response_str[json_start_index : json_end_index + 1]
            quiz_json = json.loads(clean_json_str)
        else:
            raise ValueError("No JSON array found in the LLM response.")
        
        if not isinstance(quiz_json, list) or not all("question" in q for q in quiz_json):
             raise ValueError("Generated JSON is not a valid list of questions.")
        
        return quiz_json
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate a valid quiz: {e}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during quiz generation: {e}")