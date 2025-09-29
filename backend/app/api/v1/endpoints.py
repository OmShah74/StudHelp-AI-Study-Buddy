from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
import json
import traceback
from app.services import document_service, vector_service, llm_service
from app.schemas.models import ChatRequest, QuizRequest

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type == "application/pdf":
        text = document_service.extract_text_from_pdf(file.file)
    elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text = document_service.extract_text_from_docx(file.file)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    chunks = document_service.chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from the document.")

    doc_id = str(uuid.uuid4())
    vector_service.create_and_store_embeddings(doc_id, chunks)
    
    return {"document_id": doc_id, "filename": file.filename}

@router.post("/chat")
async def chat_with_document(request: ChatRequest):
    context_chunks = vector_service.retrieve_relevant_chunks(request.doc_id, request.query)
    if not context_chunks:
        raise HTTPException(status_code=404, detail="Document not found or no relevant context.")

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
async def generate_mindmap(request: ChatRequest):
    try:
        context_chunks = vector_service.retrieve_relevant_chunks(request.doc_id, request.query, top_k=10)
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Could not find relevant context for the mind map topic.")
        
        context = "\n\n".join(context_chunks)
        
        prompt = f"""
        Analyze the following text and identify the main concepts and their relationships.
        Your task is to generate a JSON object representing a mind map.
        The JSON object must have two keys: "nodes" and "edges".

        - "nodes" should be an array of objects, each with an "id" (string), "data": {{ "label": "Concept Name" }}, and a "position" object {{ "x": 0, "y": 0 }}.
        - "edges" should be an array of objects, each with an "id" (string, e.g., "e1-2"), a "source" (the id of the source node), and a "target" (the id of the target node).

        IMPORTANT: Your response MUST be ONLY the JSON object. Do not include any explanations, markdown formatting like ```json, or any other text outside of the JSON structure.

        Context to analyze:
        ---
        {context}
        ---
        JSON Output:
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

    except HTTPException as e:
        raise e
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse LLM response into JSON: {e}")
        print(f"LLM Response was: {llm_response_str}")
        raise HTTPException(status_code=500, detail="Failed to generate a valid mind map structure from the document.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")

@router.post("/summarize")
async def summarize_document(request: ChatRequest):
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
        Based ONLY on the following text from a document, provide a high-quality summary.
        Your summary should be structured as follows:
        1.  A concise main paragraph (3-5 sentences) that captures the core essence of the text.
        2.  A section titled "Key Points" with a list of the 3 to 5 most important bullet points or takeaways from the text.

        Do not add any preamble like "Here is the summary". Respond only with the summary content itself.

        Text to Summarize:
        ---
        {context}
        ---
        Summary:
        """

        summary_text = llm_service.generate_chat_completion(prompt)
        return {"summary": summary_text}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"An unexpected error occurred during summarization: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during summarization: {e}")

@router.post("/quiz")
async def generate_quiz(request: QuizRequest):
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
        Your task is to generate a JSON object that is an array of questions.
        Each object in the array must have the following three keys:
        1. "question": A string containing the question text.
        2. "options": An array of 4 strings, where each string is a possible answer.
        3. "correctAnswer": A string that exactly matches one of the strings in the "options" array.

        Here is an example structure for a single question object:
        {{
            "question": "What is the primary function of the mitochondria?",
            "options": ["Protein synthesis", "Energy production", "Waste removal", "Cell division"],
            "correctAnswer": "Energy production"
        }}

        IMPORTANT: Your entire response MUST be ONLY the JSON array. Do not include any explanations, markdown formatting like ```json, or any other text.

        Text to analyze:
        ---
        {context}
        ---
        JSON Array Output:
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
        print(f"Failed to parse LLM response into a valid quiz JSON: {e}")
        print(f"LLM Response was: {llm_response_str}")
        raise HTTPException(status_code=500, detail="Failed to generate a valid quiz from the document.")
    except Exception as e:
        print(f"An unexpected error occurred during quiz generation: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during quiz generation: {e}")