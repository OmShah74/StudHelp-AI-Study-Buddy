# backend/app/services/vector_service.py (Complete, Updated File)
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import io
from supabase import create_client, Client

from app.core.config import EMBEDDING_MODEL, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Initialize clients
model = SentenceTransformer(EMBEDDING_MODEL)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
BUCKET_NAME = "files"

def create_and_store_embeddings(doc_id: str, chunks: list[str]):
    try:
        embeddings = model.encode(chunks, convert_to_tensor=False)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype('float32'))

        # Save FAISS index to an in-memory bytes buffer
        index_buffer = io.BytesIO()
        faiss.write_index(index, faiss.PyCallbackIOWriter(index_buffer.write))
        
        # Save chunks to an in-memory bytes buffer
        chunks_str = "\n---\n".join(chunks)
        chunks_buffer = io.BytesIO(chunks_str.encode("utf-8"))

        # Upload both files to Supabase Storage
        index_path = f"{doc_id}/doc.index"
        chunks_path = f"{doc_id}/chunks.txt"
        
        supabase.storage.from_(BUCKET_NAME).upload(file=index_buffer.getvalue(), path=index_path)
        supabase.storage.from_(BUCKET_NAME).upload(file=chunks_buffer.getvalue(), path=chunks_path)

    except Exception as e:
        print(f"Error during embedding creation or upload: {e}")
        raise e

def retrieve_relevant_chunks(doc_id: str, query: str, top_k: int = 5) -> list[str]:
    try:
        # Download files from Supabase Storage
        index_path = f"{doc_id}/doc.index"
        chunks_path = f"{doc_id}/chunks.txt"

        index_data = supabase.storage.from_(BUCKET_NAME).download(path=index_path)
        chunks_data = supabase.storage.from_(BUCKET_NAME).download(path=chunks_path)

        # Load FAISS index from downloaded bytes
        index_buffer = io.BytesIO(index_data)
        index = faiss.read_index(faiss.PyCallbackIOReader(index_buffer.read))
        
        # Load chunks from downloaded bytes
        chunks_str = chunks_data.decode("utf-8")
        chunks = chunks_str.strip().split("\n---\n")

    except Exception as e:
        print(f"Error downloading or processing files from storage: {e}")
        return []

    query_embedding = model.encode([query])
    _, I = index.search(np.array(query_embedding).astype('float32'), top_k)
    
    return [chunks[i] for i in I[0] if i < len(chunks)]