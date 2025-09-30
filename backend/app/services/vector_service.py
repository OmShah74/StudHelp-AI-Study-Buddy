# backend/app/services/vector_service.py (Complete, Final Corrected File)
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import io
from supabase import create_client, Client
from typing import List

from app.core.config import EMBEDDING_MODEL, SUPABASE_URL, SUPABASE_SERVICE_KEY

model = SentenceTransformer(EMBEDDING_MODEL)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
BUCKET_NAME = "files"

def create_and_store_embeddings(doc_id: str, chunks: list[str]):
    try:
        embeddings = model.encode(chunks, convert_to_tensor=False)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype('float32'))

        index_buffer = io.BytesIO()
        faiss.write_index(index, faiss.PyCallbackIOWriter(index_buffer.write))
        index_buffer.seek(0) 
        
        chunks_str = "\n---\n".join(chunks)
        chunks_buffer = io.BytesIO(chunks_str.encode("utf-8"))
        chunks_buffer.seek(0)

        index_path = f"{doc_id}/doc.index"
        chunks_path = f"{doc_id}/chunks.txt"
        
        supabase.storage.from_(BUCKET_NAME).upload(file=index_buffer.read(), path=index_path, file_options={"content-type": "application/octet-stream"})
        supabase.storage.from_(BUCKET_NAME).upload(file=chunks_buffer.read(), path=chunks_path, file_options={"content-type": "text/plain"})
    except Exception as e:
        print(f"Error during embedding creation or upload: {e}")
        raise e

def retrieve_relevant_chunks_from_multiple_docs(doc_ids: List[str], query: str, top_k: int = 10) -> List[dict]:
    query_embedding = model.encode([query])
    all_chunks_with_scores = []

    for doc_id in doc_ids:
        try:
            index_path = f"{doc_id}/doc.index"
            chunks_path = f"{doc_id}/chunks.txt"

            # The download() method returns the raw bytes of the file directly.
            index_data_bytes = supabase.storage.from_(BUCKET_NAME).download(path=index_path)
            chunks_data_bytes = supabase.storage.from_(BUCKET_NAME).download(path=chunks_path)

            # --- FIX #1: Pass the bytes object directly to BytesIO ---
            index_buffer = io.BytesIO(index_data_bytes)
            index = faiss.read_index(faiss.PyCallbackIOReader(index_buffer.read))
            
            # --- FIX #2: Decode the bytes object directly ---
            chunks_str = chunks_data_bytes.decode("utf-8")
            chunks = chunks_str.strip().split("\n---\n")

            distances, indices = index.search(np.array(query_embedding).astype('float32'), top_k * 2)

            for i in range(len(indices[0])):
                idx = indices[0][i]
                if idx < len(chunks):
                    all_chunks_with_scores.append({
                        "doc_id": doc_id,
                        "text": chunks[idx],
                        "score": distances[0][i]
                    })
        except Exception as e:
            print(f"Warning: Could not process document {doc_id}. Error: {e}")
            continue

    sorted_chunks = sorted(all_chunks_with_scores, key=lambda x: x['score'])
    return sorted_chunks[:top_k]

# This function must also be corrected as it's used by other features.
def retrieve_relevant_chunks(doc_id: str, query: str, top_k: int = 5) -> list[str]:
    try:
        index_path = f"{doc_id}/doc.index"
        chunks_path = f"{doc_id}/chunks.txt"

        index_data_bytes = supabase.storage.from_(BUCKET_NAME).download(path=index_path)
        chunks_data_bytes = supabase.storage.from_(BUCKET_NAME).download(path=chunks_path)

        # --- FIX #3: Apply the same fix here ---
        index_buffer = io.BytesIO(index_data_bytes)
        index = faiss.read_index(faiss.PyCallbackIOReader(index_buffer.read))
        
        chunks_str = chunks_data_bytes.decode("utf-8")
        chunks = chunks_str.strip().split("\n---\n")

    except Exception as e:
        print(f"Error downloading or processing files from storage: {e}")
        return []

    query_embedding = model.encode([query])
    _, I = index.search(np.array(query_embedding).astype('float32'), top_k)
    
    return [chunks[i] for i in I[0] if i < len(chunks)]