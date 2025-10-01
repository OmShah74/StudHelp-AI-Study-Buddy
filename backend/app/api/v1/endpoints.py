from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import uuid
import json
import traceback
from fastapi.responses import FileResponse, StreamingResponse
from supabase import create_client, Client
from gotrue.types import User
import tempfile
import os
from docx2pdf import convert
from app.services import recommendation_service
from app.schemas.models import ChatRequest, QuizRequest, RecommendationRequest, ChatSessionCreate, ChatSessionResponse, DocumentResponse
from docx import Document
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate
import io
from typing import List
from app.services import document_service, vector_service, llm_service
from app.schemas.models import ChatRequest, QuizRequest, RecommendationRequest, CommentRequest, CommentResponse
from app.core.auth import get_current_user
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

router = APIRouter()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
def get_document_details(doc_ids: list[str]) -> list[dict]:
    if not doc_ids:
        return []
    res = supabase.table("documents").select("file_name, storage_path").in_("storage_path", doc_ids).execute()
    return res.data

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
async def upload_document(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    has_pdf_viewable = False

    # Use a temporary directory for safe file handling
    with tempfile.TemporaryDirectory() as temp_dir:
        original_file_path = os.path.join(temp_dir, file.filename)
        
        # Save the uploaded file to a temporary location on disk
        with open(original_file_path, "wb") as f:
            content = await file.read() # Read the content once
            f.write(content)

        text = ""
        
        # --- PDF Handling ---
        if file.content_type == "application/pdf":
            # Re-open the saved file for reading text
            with open(original_file_path, "rb") as f:
                text = document_service.extract_text_from_pdf(f)
            
            # Upload the original PDF directly as 'viewable.pdf'
            supabase.storage.from_("files").upload(
                file=original_file_path, 
                path=f"{doc_id}/viewable.pdf",
                file_options={"content-type": "application/pdf"}
            )
            has_pdf_viewable = True

        # --- DOCX Handling ---
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # Re-open the saved file for reading text
            with open(original_file_path, "rb") as f:
                text = document_service.extract_text_from_docx(f)

            pdf_path = os.path.join(temp_dir, f"{doc_id}.pdf")
            try:
                # Convert the saved DOCX file to PDF
                convert(original_file_path, pdf_path)
                
                # Upload the NEWLY CREATED PDF as 'viewable.pdf'
                supabase.storage.from_("files").upload(
                    file=pdf_path, 
                    path=f"{doc_id}/viewable.pdf",
                    file_options={"content-type": "application/pdf"}
                )
                has_pdf_viewable = True
            except Exception as e:
                print(f"CRITICAL: Failed to convert DOCX to PDF for doc_id {doc_id}. Error: {e}")
                has_pdf_viewable = False # Gracefully fail; doc won't be viewable
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

    # --- Text processing and DB insert (same as before) ---
    chunks = document_service.chunk_text(text)
    if not chunks:
        # If text extraction failed, it's better to stop here
        raise HTTPException(status_code=400, detail="Could not extract any text from the document.")

    vector_service.create_and_store_embeddings(doc_id, chunks)
    
    try:
        supabase.table("documents").insert({
            "user_id": str(current_user.id),
            "file_name": file.filename,
            "storage_path": doc_id,
            "has_pdf_viewable": has_pdf_viewable
        }).execute()
    except Exception as e:
        # Cleanup logic...
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

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
        context_chunks = vector_service.retrieve_relevant_chunks(request.doc_id, request.query, top_k=15)
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Could not find relevant context for the mind map topic.")
        
        context = "\n\n".join(context_chunks)
        
        # This is a much more sophisticated prompt designed to extract a knowledge graph.
        prompt = f"""
        Analyze the following text based on the central topic: "{request.query}".
        Your task is to act as a knowledge graph expert and generate a JSON object representing a detailed mind map.

        The JSON object must have two keys: "nodes" and "edges".

        ### Instructions for "nodes":
        - Each node must be an object with "id" (string), "position" ({{ "x": 0, "y": 0 }}), and a "data" object.
        - The "data" object for each node MUST contain the following three keys:
          1. "label": A string for the main concept/entity name.
          2. "description": A concise, one-sentence explanation of the concept based on the text.
          3. "category": A single-word category for the concept. Choose from: ["Core Concept", "Process", "Example", "Property", "Person", "Location"]. This will be used for coloring.

        ### Instructions for "edges":
        - Each edge must be an object with "id", "source" (source node id), "target" (target node id), and "label" (a string describing the relationship, e.g., "is a type of", "leads to", "defined by").

        ### Example Structure:
        {{
          "nodes": [
            {{ "id": "1", "position": {{"x":0, "y":0}}, "data": {{ "label": "Photosynthesis", "description": "The process used by plants to convert light energy into chemical energy.", "category": "Process" }} }},
            {{ "id": "2", "position": {{"x":0, "y":0}}, "data": {{ "label": "Chlorophyll", "description": "The green pigment responsible for absorbing light.", "category": "Property" }} }}
          ],
          "edges": [
            {{ "id": "e1-2", "source": "1", "target": "2", "label": "requires" }}
          ]
        }}

        IMPORTANT: Your response MUST be ONLY the valid JSON object. Do not include any explanations, markdown formatting, or any text outside the JSON structure.

        Context to analyze:
        ---
        {context}
        ---
        JSON Output:
        """
        
        llm_response_str = llm_service.generate_chat_completion(prompt)

        # The robust JSON extraction and validation logic remains the same.
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
        print(f"Failed to parse LLM response into JSON: {e}")
        print(f"LLM Response was: {llm_response_str}")
        raise HTTPException(status_code=500, detail="Failed to generate a valid mind map structure.")
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

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    # 1. First, verify the user owns this document before proceeding.
    # This is the most critical security step.
    verify_document_ownership(doc_id, str(current_user.id))

    try:
        # 2. Delete the associated files from Supabase Storage.
        # It's better to delete from storage first. If this fails, we haven't lost the database record.
        storage_path = f"{doc_id}/" # The folder path in the bucket
        # Supabase storage doesn't have a simple "delete folder" command,
        # so we list files in the "folder" and delete them.
        files_to_delete_response = supabase.storage.from_("files").list(path=storage_path)
        if files_to_delete_response:
            files_to_delete = [f['name'] for f in files_to_delete_response]
            # Prepend the folder path to each file name for deletion
            full_file_paths = [f"{storage_path}{name}" for name in files_to_delete]
            if full_file_paths:
                supabase.storage.from_("files").remove(full_file_paths)

        # 3. Delete the document's metadata record from the Supabase database.
        # This uses the `storage_path` column which is our `doc_id`.
        supabase.table("documents").delete().eq("storage_path", doc_id).eq("user_id", str(current_user.id)).execute()

        return {"message": "Document and associated files deleted successfully."}
        
    except Exception as e:
        print(f"An error occurred during document deletion: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred while trying to delete the document: {e}"
        )
        
@router.post("/recommendations")
async def get_recommendations(request: RecommendationRequest, current_user: User = Depends(get_current_user)):
    verify_document_ownership(request.doc_id, str(current_user.id))
    
    try:
        search_query = f"{request.topic} tutorial explanation"
        
        youtube_results = recommendation_service.search_youtube(search_query)
        article_results = recommendation_service.search_web_articles(search_query)

        return {
            "youtube": youtube_results,
            "articles": article_results
        }

    except Exception as e:
        print(f"An error occurred during recommendation fetching: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred while fetching recommendations: {e}"
        )
        
@router.post("/upload")
async def upload_document(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    has_pdf_viewable = False

    # We use a temporary directory to safely handle file operations
    with tempfile.TemporaryDirectory() as temp_dir:
        original_file_path = os.path.join(temp_dir, file.filename)
        with open(original_file_path, "wb") as f:
            f.write(file.file.read())
            file.file.seek(0) # Reset file pointer

        text = ""
        # Handle PDF upload
        if file.content_type == "application/pdf":
            text = document_service.extract_text_from_pdf(file.file)
            # Upload the original PDF to storage for viewing
            with open(original_file_path, "rb") as f_read:
                supabase.storage.from_("files").upload(file=f_read.read(), path=f"{doc_id}/viewable.pdf", file_options={"content-type": "application/pdf"})
            has_pdf_viewable = True

        # Handle DOCX upload and conversion
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            text = document_service.extract_text_from_docx(file.file)
            pdf_path = os.path.join(temp_dir, "converted.pdf")
            try:
                convert(original_file_path, pdf_path)
                # Upload the converted PDF to storage for viewing
                with open(pdf_path, "rb") as f_read:
                    supabase.storage.from_("files").upload(file=f_read.read(), path=f"{doc_id}/viewable.pdf", file_options={"content-type": "application/pdf"})
                has_pdf_viewable = True
            except Exception as e:
                print(f"Failed to convert DOCX to PDF: {e}")
                # If conversion fails, we still proceed, but the doc won't be viewable
                has_pdf_viewable = False

        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

    # Process text and store embeddings (same as before)
    chunks = document_service.chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from the document.")
    vector_service.create_and_store_embeddings(doc_id, chunks)
    
    # Insert metadata into the database, including the new flag
    try:
        supabase.table("documents").insert({
            "user_id": str(current_user.id),
            "file_name": file.filename,
            "storage_path": doc_id,
            "has_pdf_viewable": has_pdf_viewable
        }).execute()
    except Exception as e:
        # Cleanup logic...
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {"document_id": doc_id, "filename": file.filename}


# --- NEW ENDPOINTS FOR COMMENTS ---

@router.get("/documents/{doc_id}/comments", response_model=list[CommentResponse])
async def get_comments(doc_id: str, current_user: User = Depends(get_current_user)):
    doc_meta = supabase.table("documents").select("id").eq("storage_path", doc_id).eq("user_id", str(current_user.id)).single().execute()
    if not doc_meta.data:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this document.")
    
    document_internal_id = doc_meta.data['id']
    
    comments = supabase.table("comments").select("*").eq("document_id", document_internal_id).order("created_at", desc=True).execute()
    return comments.data


@router.post("/documents/{doc_id}/comments", response_model=CommentResponse)
async def add_comment(doc_id: str, comment: CommentRequest, current_user: User = Depends(get_current_user)):
    doc_meta = supabase.table("documents").select("id").eq("storage_path", doc_id).eq("user_id", str(current_user.id)).single().execute()
    if not doc_meta.data:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this document.")

    document_internal_id = doc_meta.data['id']

    new_comment = supabase.table("comments").insert({
        "document_id": document_internal_id,
        "user_id": str(current_user.id),
        "page_number": comment.page_number,
        "comment_text": comment.comment_text
    }).execute()

    return new_comment.data[0]

@router.post("/convert-to-pdf")
async def convert_to_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if file.content_type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .docx file.")

    try:
        # 1. Read the uploaded DOCX file into memory
        content = await file.read()
        docx_buffer = io.BytesIO(content)
        document = Document(docx_buffer)

        # 2. Prepare to build the PDF in memory
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        
        # 3. Define styles and build the story (the content) for the PDF
        styles = getSampleStyleSheet()
        story = []
        for para in document.paragraphs:
            if para.text.strip(): # Add non-empty paragraphs
                p = Paragraph(para.text, styles['Normal'])
                story.append(p)
        
        # 4. Generate the PDF
        doc.build(story)
        pdf_buffer.seek(0)

        # 5. Create a streaming response to send the file
        # This is more memory-efficient than returning FileResponse from a temp file
        return StreamingResponse(
            content=pdf_buffer,
            media_type='application/pdf',
            headers={
                "Content-Disposition": f"attachment; filename=\"{os.path.splitext(file.filename)[0]}.pdf\""
            }
        )

    except Exception as e:
        print(f"Error during pure Python DOCX to PDF conversion: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to convert the document to PDF.")

@router.post("/chat-sessions", response_model=ChatSessionResponse)
async def create_chat_session(session_data: ChatSessionCreate, current_user: User = Depends(get_current_user)):
    # 1. Create the new chat session record
    new_session = supabase.table("chat_sessions").insert({
        "user_id": str(current_user.id),
        "session_name": session_data.session_name
    }).execute().data[0]
    
    # 2. Link the selected documents to this new session
    documents_to_link = []
    # First, get the internal UUIDs of the documents from their storage_paths
    doc_metas = supabase.table("documents").select("id, storage_path").in_("storage_path", session_data.document_ids).execute().data
    
    for doc_meta in doc_metas:
        documents_to_link.append({
            "session_id": new_session['id'],
            "document_id": doc_meta['id']
        })
        
    if documents_to_link:
        supabase.table("session_documents").insert(documents_to_link).execute()

    return new_session

@router.get("/chat-sessions", response_model=list[ChatSessionResponse])
async def get_chat_sessions(current_user: User = Depends(get_current_user)):
    sessions = supabase.table("chat_sessions").select("*").eq("user_id", str(current_user.id)).order("created_at", desc=True).execute()
    return sessions.data

@router.get("/chat-sessions/{session_id}")
async def get_chat_session_details(session_id: str, current_user: User = Depends(get_current_user)):
    # Verify user owns the session
    session = supabase.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", str(current_user.id)).single().execute().data
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found or you do not have permission to access it.")

    # Get the linked documents
    linked_docs_res = supabase.table("session_documents").select("document_id").eq("session_id", session_id).execute().data
    doc_internal_ids = [doc['document_id'] for doc in linked_docs_res]
    
    # Get the full details of the linked documents
    doc_details = []
    if doc_internal_ids:
        doc_details = supabase.table("documents").select("file_name, storage_path").in_("id", doc_internal_ids).execute().data

    return {"session": session, "documents": doc_details}

@router.post("/chat/{session_id}")
async def chat_with_session(session_id: str, request: dict, current_user: User = Depends(get_current_user)):
    query = request.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is missing.")

    # 1. Verify user owns the session
    session = supabase.table("chat_sessions").select("id").eq("id", session_id).eq("user_id", str(current_user.id)).single().execute().data
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    # 2. Get all document IDs linked to this session
    linked_docs_res = supabase.table("session_documents").select(
        "documents(storage_path)" # Use a join to get the storage_path directly
    ).eq("session_id", session_id).execute().data
    
    doc_ids = [doc['documents']['storage_path'] for doc in linked_docs_res if doc.get('documents')]
    if not doc_ids:
        return {"answer": "This chat session has no documents associated with it. Please add documents to the session to start chatting."}

    # 3. Use the new multi-document retrieval service
    context_chunks_with_meta = vector_service.retrieve_relevant_chunks_from_multiple_docs(doc_ids, query)
    
    if not context_chunks_with_meta:
        return {"answer": "I could not find any relevant information across your selected documents to answer this question."}

    # 4. Format the context with citations
    context = ""
    citations = {}
    for chunk in context_chunks_with_meta:
        doc_details = get_document_details([chunk['doc_id']])[0]
        file_name = doc_details['file_name']
        context += f"Source: {file_name}\nContent: {chunk['text']}\n\n"
        citations[file_name] = chunk['doc_id']

    prompt = f"""You are a research assistant. Based ONLY on the following context from multiple documents, answer the user's question. 
    Cite the source file name for each piece of information you use.

    Context:
    ---
    {context}
    ---
    Question: {query}
    """
    
    answer = llm_service.generate_chat_completion(prompt)
    return {"answer": answer, "citations": list(citations.keys())}

@router.get("/documents", response_model=List[DocumentResponse])
async def get_all_documents(current_user: User = Depends(get_current_user)):
    """
    Fetches all document metadata for the currently authenticated user.
    """
    try:
        documents = supabase.table("documents").select(
            "file_name, storage_path"
        ).eq("user_id", str(current_user.id)).order("created_at", desc=True).execute()
        
        return documents.data
    except Exception as e:
        print(f"Error fetching documents for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents.")
    
@router.delete("/chat-sessions/{session_id}")
async def delete_chat_session(session_id: str, current_user: User = Depends(get_current_user)):
    """
    Deletes a specific chat session and its associated document links for the current user.
    """
    try:
        # 1. Verify Ownership: First, ensure the session belongs to the user making the request.
        # We perform a select before the delete to make sure we don't try to delete something that isn't ours.
        session_to_delete = supabase.table("chat_sessions").select("id").eq("id", session_id).eq("user_id", str(current_user.id)).single().execute()

        if not session_to_delete.data:
            raise HTTPException(status_code=404, detail="Chat session not found or you do not have permission to delete it.")

        # 2. Perform the Deletion.
        # Because we set up `ON DELETE CASCADE` in our SQL schema, when we delete this
        # `chat_sessions` record, the database will automatically delete all corresponding
        # rows in the `session_documents` table.
        supabase.table("chat_sessions").delete().eq("id", session_id).eq("user_id", str(current_user.id)).execute()

        return {"message": "Chat session deleted successfully."}

    except Exception as e:
        print(f"An error occurred during chat session deletion: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred while trying to delete the chat session: {e}"
        )